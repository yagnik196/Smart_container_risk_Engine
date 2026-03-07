"""analytics/column_mapper.py - Utility to normalize varying CSV column names"""

import pandas as pd

COLUMN_MAPPING = {
    'Container_ID': ['container_id', 'ContainerID', 'container', 'Container_ID'],
    'Importer_ID': ['importer_id', 'ImporterID', 'Importer_ID'],
    'Exporter_ID': ['exporter_id', 'ExporterID', 'Exporter_ID'],
    'Origin_Country': ['Origin_Country', 'origin_country', 'OriginCountry', 'origin', 'Origin'],
    'Destination_Country': ['Destination_Country', 'destination_country', 'DestinationCountry', 'destination', 'Destination'],
    'Destination_Port': ['Destination_Port', 'destination_port', 'DestinationPort', 'port'],
    'HS_Code': ['HS_Code', 'hs_code', 'HSCode'],
    'Shipping_Line': ['Shipping_Line', 'shipping_line', 'ShippingLine'],
    'Trade_Regime (Import / Export / Transit)': ['Trade_Regime (Import / Export / Transit)', 'Trade_Regime', 'trade_regime', 'TradeRegime'],
    'Declared_Weight': ['Declared_Weight', 'declared_weight', 'DeclaredWeight', 'weight', 'Weight', 'GrossWeight', 'weight_kg'],
    'Measured_Weight': ['Measured_Weight', 'measured_weight', 'MeasuredWeight'],
    'Declared_Value': ['Declared_Value', 'declared_value', 'DeclaredValue', 'value', 'Value'],
    'Dwell_Time_Hours': ['Dwell_Time_Hours', 'dwell_time_hours', 'DwellTimeHours', 'dwell_time', 'Dwell_Time'],
    'Declaration_Time': ['Declaration_Time', 'declaration_time', 'DeclarationTime'],
    'Declaration_Date (YYYY-MM-DD)': ['Declaration_Date (YYYY-MM-DD)', 'Declaration_Date', 'declaration_date', 'DeclarationDate', 'date', 'Date'],
}

def apply_column_mapping(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renames columns in the DataFrame based on the standardized COLUMN_MAPPING.
    """
    df_cols = df.columns.str.strip().tolist()
    rename_dict = {}

    for standard_col, variations in COLUMN_MAPPING.items():
        lower_variations = [v.lower() for v in variations]
        
        for col in df_cols:
            if col.lower() in lower_variations:
                rename_dict[col] = standard_col
                break
    
    return df.rename(columns=rename_dict)
