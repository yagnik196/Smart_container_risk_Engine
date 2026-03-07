"""
analytics/ml_engine.py – Smart Container Risk Engine ML Inference Module

Loads XGBoost + IsolationForest models once at startup.
Applies the same feature engineering pipeline as Training.py.
Returns per-container predictions with SHAP explanations.
"""

import logging
import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import LabelEncoder
from django.conf import settings

logger = logging.getLogger('analytics')

# ---------------------------------------------------------------------------
# Required columns that must be present in uploaded CSV
# ---------------------------------------------------------------------------

REQUIRED_COLUMNS = [
    'Container_ID',
    'Importer_ID',
    'Exporter_ID',
    'Origin_Country',
    'Destination_Country',
    'Destination_Port',
    'HS_Code',
    'Shipping_Line',
    'Trade_Regime (Import / Export / Transit)',
    'Declared_Weight',
    'Measured_Weight',
    'Declared_Value',
    'Dwell_Time_Hours',
    'Declaration_Time',
    'Declaration_Date (YYYY-MM-DD)',
]

CAT_COLS = [
    'Origin_Country',
    'Destination_Country',
    'Destination_Port',
    'HS_Code',
    'Shipping_Line',
    'Trade_Regime (Import / Export / Transit)',
]

DROP_COLS = [
    'Container_ID',
    'Importer_ID',
    'Exporter_ID',
    'route',
    'Declaration_Time',
    'Declaration_Date (YYYY-MM-DD)',
]


class RiskEngine:
    """
    Singleton-style ML inference engine.
    Load once via AppConfig.ready(), then call predict(df).
    """

    _instance = None

    def __init__(self):
        logger.info('Loading ML models …')
        try:
            self.model = joblib.load(settings.RISK_MODEL_PATH)
            self.iso = joblib.load(settings.ANOMALY_MODEL_PATH)
            # Cache feature names from the trained booster
            self._feature_names = self.model.get_booster().feature_names
            logger.info(
                f'Models loaded. Features: {len(self._feature_names)}, '
                f'Model type: {type(self.model).__name__}'
            )
        except Exception as exc:
            logger.error(f'Failed to load ML models: {exc}')
            raise

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Run full inference pipeline on a raw container DataFrame.

        Returns:
            DataFrame with columns:
                Container_ID, Risk_Score (0-100), Risk_Level,
                Anomaly_Flag, Explanation
        """
        df = df.copy()
        df.columns = df.columns.str.strip()

        container_ids = df['Container_ID'].values

        # Capture raw columns BEFORE feature engineering (which may overwrite them)
        # Declaration date
        if 'Declaration_Date (YYYY-MM-DD)' in df.columns:
            raw_dates = pd.to_datetime(
                df['Declaration_Date (YYYY-MM-DD)'], errors='coerce'
            ).dt.date.values
        else:
            raw_dates = [None] * len(df)

        # Declared & measured weights for storage
        raw_declared_weight = (
            df['Declared_Weight'].values.copy() if 'Declared_Weight' in df.columns
            else [None] * len(df)
        )
        raw_measured_weight = (
            df['Measured_Weight'].values.copy() if 'Measured_Weight' in df.columns
            else [None] * len(df)
        )
        raw_declared_value = (
            df['Declared_Value'].values.copy() if 'Declared_Value' in df.columns
            else [None] * len(df)
        )

        # Feature engineering
        df = self._engineer_features(df)

        # Label-encode categoricals
        df = self._encode_categoricals(df)

        # Build feature matrix
        drop_existing = [c for c in DROP_COLS if c in df.columns]
        
        # Remove optional target columns if present
        optional_drops = ['risk', 'Clearance_Status']
        for col in optional_drops:
            if col in df.columns:
                drop_existing.append(col)

        X = df.drop(columns=drop_existing, errors='ignore')
        X = X.apply(pd.to_numeric, errors='coerce').fillna(0)

        # Align to training feature order
        X = X.reindex(columns=self._feature_names, fill_value=0)

        # ------------------------------------------------------------------
        # Predictions
        # ------------------------------------------------------------------
        risk_prob = self.model.predict_proba(X)[:, 1]
        # Combined score mapping directly to percentage
        final_score = np.clip(risk_prob * 100, 0, 100)

        risk_level = []
        for s in final_score:
            if s >= 80:
                risk_level.append('Critical')
            elif s >= 50:
                risk_level.append('Medium')
            else:
                risk_level.append('Low Risk')

        # Anomaly flag: IsolationForest predicts -1 for outliers
        anomaly_pred = self.iso.predict(X)
        anomaly_flag = (anomaly_pred == -1).tolist()

        # SHAP explanations (top-3 features)
        explanations = self._explain(X)

        return pd.DataFrame({
            'Container_ID': container_ids,
            'Risk_Score': final_score.round(2),
            'Risk_Level': risk_level,
            'Anomaly_Flag': anomaly_flag,
            'Explanation': explanations,
            'Declaration_Date': raw_dates,
            'Declared_Value': raw_declared_value,
            'Weight': raw_declared_weight,
            'Measured_Weight': raw_measured_weight,
        })

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Exact same feature engineering as Training.py."""

        # Time features
        df['Declaration_Time'] = pd.to_datetime(df['Declaration_Time'], errors='coerce')
        df['hour'] = df['Declaration_Time'].dt.hour.fillna(0).astype(int)

        df['Declaration_Date (YYYY-MM-DD)'] = pd.to_datetime(
            df['Declaration_Date (YYYY-MM-DD)'], errors='coerce'
        )
        df['is_weekend'] = (
            df['Declaration_Date (YYYY-MM-DD)'].dt.weekday >= 5
        ).astype(int)

        # Weight features
        df['weight_diff'] = df['Measured_Weight'] - df['Declared_Weight']
        df['abs_weight_diff'] = (df['Measured_Weight'] - df['Declared_Weight']).abs()
        df['weight_ratio'] = df['Measured_Weight'] / (df['Declared_Weight'] + 1)

        # Value features
        df['value_per_kg'] = df['Declared_Value'] / (df['Declared_Weight'] + 1)
        df['log_declared_value'] = np.log1p(df['Declared_Value'])

        # HS code behavioural features
        df['hs_avg_value'] = df.groupby('HS_Code')['Declared_Value'].transform('mean')
        df['value_vs_hs_avg'] = df['Declared_Value'] - df['hs_avg_value']

        # Importer behavioural features
        df['importer_freq'] = df.groupby('Importer_ID')['Container_ID'].transform('count')
        df['importer_avg_value'] = df.groupby('Importer_ID')['Declared_Value'].transform('mean')
        df['importer_value_dev'] = df['Declared_Value'] - df['importer_avg_value']

        # Exporter behavioural features
        df['exporter_freq'] = df.groupby('Exporter_ID')['Container_ID'].transform('count')
        df['exporter_avg_value'] = df.groupby('Exporter_ID')['Declared_Value'].transform('mean')
        df['exporter_value_dev'] = df['Declared_Value'] - df['exporter_avg_value']

        # Route features
        df['route'] = df['Origin_Country'] + '_' + df['Destination_Country']
        df['route_freq'] = df.groupby('route')['Container_ID'].transform('count')

        # Port / HS / ShippingLine frequency
        df['port_freq'] = df.groupby('Destination_Port')['Container_ID'].transform('count')
        df['hs_freq'] = df.groupby('HS_Code')['Container_ID'].transform('count')
        df['shipping_line_freq'] = df.groupby('Shipping_Line')['Container_ID'].transform('count')

        # Dwell features
        q90 = df['Dwell_Time_Hours'].quantile(0.9)
        df['high_dwell'] = (df['Dwell_Time_Hours'] > q90).astype(int)
        df['hs_avg_dwell'] = df.groupby('HS_Code')['Dwell_Time_Hours'].transform('mean')
        df['dwell_dev'] = df['Dwell_Time_Hours'] - df['hs_avg_dwell']

        # Rare trader flags
        df['new_importer'] = (df['importer_freq'] == 1).astype(int)
        df['new_exporter'] = (df['exporter_freq'] == 1).astype(int)

        return df

    def _encode_categoricals(self, df: pd.DataFrame) -> pd.DataFrame:
        """Label-encode categorical columns (same as training)."""
        for col in CAT_COLS:
            if col in df.columns:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
        return df

    def _explain(self, X: pd.DataFrame) -> list:
        """Return top-3 most influential features per row using SHAP."""
        FEATURE_EXPLANATIONS = {
            'weight_diff': 'Mismatch between declared and actual weight',
            'abs_weight_diff': 'Abnormal absolute weight difference detected',
            'weight_ratio': 'Suspicious weight ratio between measured and declared',
            'value_per_kg': 'Unusual declared value per kilogram',
            'log_declared_value': 'Abnormal declared value magnitude',
            'hs_avg_value': 'Declared value deviates from HS code historical average',
            'value_vs_hs_avg': 'Declared value significantly differs from HS code average',
            'importer_freq': 'Unusual importer transaction frequency',
            'importer_avg_value': 'Importer historical average value is anomalous',
            'importer_value_dev': "Value deviates from importer's historical average",
            'exporter_freq': 'Unusual exporter transaction frequency',
            'exporter_avg_value': 'Exporter historical average value is anomalous',
            'exporter_value_dev': "Value deviates from exporter's historical average",
            'route_freq': 'Rare or uncommon trade route detected',
            'port_freq': 'Unusual activity level at destination port',
            'hs_freq': 'Unusual frequency for this HS code',
            'shipping_line_freq': 'Shipping line has irregular activity pattern',
            'high_dwell': 'Abnormally high container dwell time',
            'hs_avg_dwell': 'Dwell time relative to HS code average is abnormal',
            'dwell_dev': 'Container dwell time deviates significantly from norm',
            'new_importer': 'First-time or unknown importer flagged',
            'new_exporter': 'First-time or unknown exporter flagged',
            'is_weekend': 'Declaration made on a weekend',
            'hour': 'Declaration made at an unusual hour',
            'Origin_Country': 'Origin country is a risk-associated region',
            'Destination_Country': 'Destination country is a risk-associated region',
            'Destination_Port': 'Destination port is linked to irregular activity',
            'HS_Code': 'HS Code is associated with high-risk shipments',
            'Shipping_Line': 'Shipping line has a history of risk patterns',
            'Trade_Regime (Import / Export / Transit)': 'Trade regime raises a compliance flag',
            'Declared_Weight': 'Declared weight is anomalous',
            'Measured_Weight': 'Measured weight is anomalous',
            'Declared_Value': 'Declared value is an outlier for this cargo type',
            'Dwell_Time_Hours': 'Container dwell time is significantly elevated',
        }

        def _top3_text(feat_names):
            parts = [FEATURE_EXPLANATIONS.get(f, f'Anomaly related to {f}') for f in feat_names]
            return '; '.join(parts)

        try:
            import shap
            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(X)

            # For binary XGBClassifier, shap >= 0.40 returns a 2-D ndarray.
            # Older shap may return [neg_class_array, pos_class_array].
            if isinstance(shap_values, list):
                sv = shap_values[1]   # positive (risk) class
            else:
                sv = shap_values      # (n_samples, n_features)

            feature_names = np.array(X.columns.tolist())
            explanations = []
            for row_sv in sv:
                top_idx = np.abs(row_sv).argsort()[-3:][::-1]   # descending abs-value
                explanations.append(_top3_text(feature_names[top_idx]))
            return explanations

        except Exception as exc:
            logger.warning(f'SHAP explanations failed, using pred_contribs fallback: {exc}')
            # Per-row fallback: XGBoost's built-in SHAP-like margin contributions.
            try:
                import xgboost as xgb
                dmat = xgb.DMatrix(X)
                # predict(pred_contribs=True) → (n_samples, n_features + 1), last col = bias
                contribs = self.model.get_booster().predict(dmat, pred_contribs=True)
                feature_names = np.array(X.columns.tolist())
                explanations = []
                for row_c in contribs[:, :-1]:   # drop bias column
                    top_idx = np.abs(row_c).argsort()[-3:][::-1]
                    explanations.append(_top3_text(feature_names[top_idx]))
                return explanations
            except Exception as exc2:
                logger.warning(f'pred_contribs fallback also failed: {exc2}')
                # Absolute last resort: global feature importances (same for all rows)
                importances = self.model.feature_importances_
                top_idx = importances.argsort()[-3:][::-1]
                top_names = np.array(X.columns)[top_idx]
                fallback = _top3_text(top_names)
                return [fallback] * len(X)


# Module-level singleton (populated by analytics.apps.AnalyticsConfig.ready)
risk_engine: 'RiskEngine | None' = None


def get_engine() -> RiskEngine:
    """Return the shared RiskEngine instance."""
    global risk_engine
    if risk_engine is None:
        risk_engine = RiskEngine()
    return risk_engine
