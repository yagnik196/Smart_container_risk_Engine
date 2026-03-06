# ======================================
# SMARTCONTAINER RISK ENGINE TEST PIPELINE (FULL FIXED VERSION)
# ======================================

import pandas as pd
import numpy as np
import joblib
import shap

from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, roc_auc_score

# -----------------------------
# LOAD TRAINED MODELS
# -----------------------------

model = joblib.load("/content/risk_model_lgbm.pkl")
iso = joblib.load("/content/anomaly_model.pkl")

# -----------------------------
# LOAD REAL DATA
# -----------------------------

df = pd.read_csv("/content/Real-Time Data.csv")
df.columns = df.columns.str.strip()

# -----------------------------
# TARGET
# -----------------------------

df["risk"] = df["Clearance_Status"].map({
    "Clear":0,
    "Low Risk":0,
    "Critical":1
})

# -----------------------------
# TIME FEATURES
# -----------------------------

df["Declaration_Time"] = pd.to_datetime(df["Declaration_Time"])
df["hour"] = df["Declaration_Time"].dt.hour

df["Declaration_Date (YYYY-MM-DD)"] = pd.to_datetime(df["Declaration_Date (YYYY-MM-DD)"])
df["is_weekend"] = (df["Declaration_Date (YYYY-MM-DD)"].dt.weekday >= 5).astype(int)

# -----------------------------
# FEATURE ENGINEERING
# -----------------------------

df["weight_diff"] = df["Measured_Weight"] - df["Declared_Weight"]
df["abs_weight_diff"] = abs(df["Measured_Weight"] - df["Declared_Weight"])
df["weight_ratio"] = df["Measured_Weight"] / (df["Declared_Weight"] + 1)

df["value_per_kg"] = df["Declared_Value"] / (df["Declared_Weight"] + 1)
df["log_declared_value"] = np.log1p(df["Declared_Value"])

df["hs_avg_value"] = df.groupby("HS_Code")["Declared_Value"].transform("mean")
df["value_vs_hs_avg"] = df["Declared_Value"] - df["hs_avg_value"]

df["importer_freq"] = df.groupby("Importer_ID")["Container_ID"].transform("count")
df["importer_avg_value"] = df.groupby("Importer_ID")["Declared_Value"].transform("mean")
df["importer_value_dev"] = df["Declared_Value"] - df["importer_avg_value"]

df["exporter_freq"] = df.groupby("Exporter_ID")["Container_ID"].transform("count")
df["exporter_avg_value"] = df.groupby("Exporter_ID")["Declared_Value"].transform("mean")
df["exporter_value_dev"] = df["Declared_Value"] - df["exporter_avg_value"]

df["route"] = df["Origin_Country"] + "_" + df["Destination_Country"]
df["route_freq"] = df.groupby("route")["Container_ID"].transform("count")

df["port_freq"] = df.groupby("Destination_Port")["Container_ID"].transform("count")
df["hs_freq"] = df.groupby("HS_Code")["Container_ID"].transform("count")

df["shipping_line_freq"] = df.groupby("Shipping_Line")["Container_ID"].transform("count")

df["high_dwell"] = (df["Dwell_Time_Hours"] > df["Dwell_Time_Hours"].quantile(0.9)).astype(int)

df["hs_avg_dwell"] = df.groupby("HS_Code")["Dwell_Time_Hours"].transform("mean")
df["dwell_dev"] = df["Dwell_Time_Hours"] - df["hs_avg_dwell"]

df["new_importer"] = (df["importer_freq"] == 1).astype(int)
df["new_exporter"] = (df["exporter_freq"] == 1).astype(int)

# -----------------------------
# ENCODE CATEGORICAL VARIABLES
# -----------------------------

cat_cols = [
    "Origin_Country",
    "Destination_Country",
    "Destination_Port",
    "HS_Code",
    "Shipping_Line",
    "Trade_Regime (Import / Export / Transit)"
]

for col in cat_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])

# -----------------------------
# PREPARE FEATURES
# -----------------------------

drop_cols = [
    "Container_ID",
    "Importer_ID",
    "Exporter_ID",
    "Clearance_Status",
    "route",
    "Declaration_Time",
    "Declaration_Date (YYYY-MM-DD)"
]

X = df.drop(columns=drop_cols + ["risk"])
y_true = df["risk"]

# ensure numeric
X = X.apply(pd.to_numeric)

# -----------------------------
# IMPORTANT: MATCH TRAINING FEATURE ORDER
# -----------------------------

X = X[model.get_booster().feature_names]

# -----------------------------
# MODEL PREDICTIONS
# -----------------------------

risk_prob = model.predict_proba(X)[:,1]
y_pred = model.predict(X)

# -----------------------------
# ANOMALY DETECTION
# -----------------------------

anomaly_score = -iso.decision_function(X)

# -----------------------------
# FINAL RISK SCORE
# -----------------------------

final_score = (0.7 * risk_prob) + (0.3 * anomaly_score)

final_score = (final_score - final_score.min()) / (final_score.max() - final_score.min())
final_score = final_score * 100

# -----------------------------
# RISK CLASSIFICATION
# -----------------------------

risk_level = ["Critical" if s > 70 else "Low Risk" for s in final_score]

# -----------------------------
# MODEL EVALUATION
# -----------------------------

print("\nMODEL PERFORMANCE\n")
print(classification_report(y_true, y_pred))
print("ROC AUC:", roc_auc_score(y_true, risk_prob))

# -----------------------------
# SHAP EXPLANATIONS
# -----------------------------

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X)

top_features = np.abs(shap_values).argsort(axis=1)[:,-3:]
feature_names = X.columns

explanations = []

for i in range(len(top_features)):
    reasons = [feature_names[idx] for idx in top_features[i]]
    explanations.append(", ".join(reasons))

# -----------------------------
# OUTPUT RESULTS
# -----------------------------

results = pd.DataFrame({
    "Container_ID": df["Container_ID"],
    "Risk_Score": final_score,
    "Predicted_Risk_Level": risk_level,
    "Actual_Status": df["Clearance_Status"],
    "Explanation": explanations
})

results = results.sort_values("Risk_Score", ascending=False)

results.to_csv("real_data_risk_predictions.csv", index=False)

print("\nSaved predictions to real_data_risk_predictions.csv")
print("\nTop 10 Highest Risk Containers:\n")
print(results.head(10))