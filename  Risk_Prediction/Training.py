import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import IsolationForest

from xgboost import XGBClassifier

import shap

# -----------------------------
# LOAD DATA
# -----------------------------

df = pd.read_csv("/content/Historical Data.csv")

# -----------------------------
# TARGET VARIABLE
# -----------------------------

df["risk"] = df["Clearance_Status"].map({
    "Clear": 0,
    "Low Risk": 0,
    "Critical": 1
})

# -----------------------------
# FEATURE ENGINEERING
# -----------------------------

# Weight features
df["weight_diff"] = df["Measured_Weight"] - df["Declared_Weight"]
df["abs_weight_diff"] = abs(df["Measured_Weight"] - df["Declared_Weight"])
df["weight_ratio"] = df["Measured_Weight"] / (df["Declared_Weight"] + 1)

# Value features
df["value_per_kg"] = df["Declared_Value"] / (df["Declared_Weight"] + 1)
df["log_declared_value"] = np.log1p(df["Declared_Value"])

# HS code value comparison
df["hs_avg_value"] = df.groupby("HS_Code")["Declared_Value"].transform("mean")
df["value_vs_hs_avg"] = df["Declared_Value"] - df["hs_avg_value"]

# Importer behaviour
df["importer_freq"] = df.groupby("Importer_ID")["Container_ID"].transform("count")
df["importer_avg_value"] = df.groupby("Importer_ID")["Declared_Value"].transform("mean")
df["importer_value_dev"] = df["Declared_Value"] - df["importer_avg_value"]

# Exporter behaviour
df["exporter_freq"] = df.groupby("Exporter_ID")["Container_ID"].transform("count")
df["exporter_avg_value"] = df.groupby("Exporter_ID")["Declared_Value"].transform("mean")
df["exporter_value_dev"] = df["Declared_Value"] - df["exporter_avg_value"]

# Route features
df["route"] = df["Origin_Country"] + "_" + df["Destination_Country"]
df["route_freq"] = df.groupby("route")["Container_ID"].transform("count")

# Port frequency
df["port_freq"] = df.groupby("Destination_Port")["Container_ID"].transform("count")

# HS frequency
df["hs_freq"] = df.groupby("HS_Code")["Container_ID"].transform("count")

# Shipping line frequency
df["shipping_line_freq"] = df.groupby("Shipping_Line")["Container_ID"].transform("count")

# Time features
df["Declaration_Time"] = pd.to_datetime(df["Declaration_Time"])
df["hour"] = df["Declaration_Time"].dt.hour

df["Declaration_Date (YYYY-MM-DD)"] = pd.to_datetime(df["Declaration_Date (YYYY-MM-DD)"])
df["is_weekend"] = (df["Declaration_Date (YYYY-MM-DD)"].dt.weekday >= 5).astype(int)

# Dwell features
df["high_dwell"] = (df["Dwell_Time_Hours"] > df["Dwell_Time_Hours"].quantile(0.9)).astype(int)

df["hs_avg_dwell"] = df.groupby("HS_Code")["Dwell_Time_Hours"].transform("mean")
df["dwell_dev"] = df["Dwell_Time_Hours"] - df["hs_avg_dwell"]

# Rare trader features
df["new_importer"] = (df["importer_freq"] == 1).astype(int)
df["new_exporter"] = (df["exporter_freq"] == 1).astype(int)

# -----------------------------
# ENCODING CATEGORICAL FEATURES
# -----------------------------

cat_cols = [
    "Origin_Country",
    "Destination_Country",
    "Destination_Port",
    "HS_Code",
    "Shipping_Line",
    "Trade_Regime (Import / Export / Transit)" # Add this to be encoded
]

for col in cat_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])

# -----------------------------
# FEATURE SELECTION
# -----------------------------

drop_cols = [
    "Container_ID",
    "Importer_ID",
    "Exporter_ID",
    "Clearance_Status",
    "route",
    "Declaration_Date (YYYY-MM-DD)", # Drop original datetime column
    "Declaration_Time" # Drop original datetime column
]

X = df.drop(columns=drop_cols + ["risk"])
y = df["risk"]

# -----------------------------
# TRAIN TEST SPLIT
# -----------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    stratify=y,
    random_state=42
)

# -----------------------------
# SUPERVISED MODEL (XGBoost)
# -----------------------------

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    scale_pos_weight=(len(y_train)-sum(y_train))/sum(y_train),
    eval_metric="logloss"
)

model.fit(X_train, y_train)

# -----------------------------
# PREDICTIONS
# -----------------------------

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:,1]

print("\nClassification Report\n")
print(classification_report(y_test, y_pred))

print("ROC AUC:", roc_auc_score(y_test, y_prob))

# -----------------------------
# ANOMALY DETECTION
# -----------------------------

iso = IsolationForest(
    contamination=0.01,
    random_state=42
)

iso.fit(X_train)

anomaly_scores = iso.decision_function(X_test)

# -----------------------------
# SHAP EXPLAINABILITY
# -----------------------------

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

print("\nGenerating SHAP summary plot...")

shap.summary_plot(shap_values, X_test)