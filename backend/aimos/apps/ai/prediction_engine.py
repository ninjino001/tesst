"""
AIMOS AI Prediction Engine
===========================
Predictive maintenance module using:
- Linear Regression (48h window) for trend extrapolation and RUL estimation
- Z-Score (6h window) for anomaly detection
- Composite Risk Score combining proximity, degradation rate, and recent anomalies

No external ML dependencies required — uses pure Python + basic statistics.
"""
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, StdDev

from aimos.apps.sensors.models import Sensor, SensorReading
from aimos.apps.alerts.models import Alert


# ============================================================
# CONFIGURATION
# ============================================================
LONG_WINDOW_HOURS = 48       # Window for linear regression (trend)
SHORT_WINDOW_HOURS = 6       # Window for z-score (anomaly detection)
MIN_READINGS_LONG = 30       # Minimum data points for reliable regression
MIN_READINGS_SHORT = 6       # Minimum data points for z-score
Z_SCORE_THRESHOLD = 2.0      # Z-score above which a value is anomalous
ALERT_LOOKBACK_DAYS = 7      # Days to look back for alert frequency

# Score weights (must sum to 1.0)
WEIGHT_PROXIMITY = 0.40      # How close current value is to critical threshold
WEIGHT_DEGRADATION = 0.35    # How fast the value is approaching the threshold
WEIGHT_ANOMALY = 0.25        # Recent anomalies and alert frequency


# ============================================================
# LINEAR REGRESSION (pure Python — no numpy needed)
# ============================================================
def linear_regression(x_values, y_values):
    """
    Simple linear regression: y = slope * x + intercept
    Returns (slope, intercept, r_squared)
    
    x_values: list of floats (e.g., hours since start)
    y_values: list of floats (e.g., sensor values)
    """
    n = len(x_values)
    if n < 2:
        return 0.0, 0.0, 0.0

    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x2 = sum(x * x for x in x_values)

    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        return 0.0, sum_y / n, 0.0

    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n

    # R-squared (coefficient of determination)
    mean_y = sum_y / n
    ss_tot = sum((y - mean_y) ** 2 for y in y_values)
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(x_values, y_values))
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    return slope, intercept, r_squared


# ============================================================
# Z-SCORE CALCULATION
# ============================================================
def calculate_z_score(values, current_value):
    """
    Calculate the z-score of the current value relative to the distribution.
    z = (value - mean) / std_dev
    """
    if len(values) < 3:
        return 0.0

    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std_dev = variance ** 0.5

    if std_dev == 0:
        return 0.0

    return (current_value - mean) / std_dev


# ============================================================
# RUL (Remaining Useful Life) ESTIMATION
# ============================================================
def estimate_rul(current_value, slope, threshold):
    """
    Estimate hours until the value reaches the threshold.
    Returns None if trend is not moving toward threshold.
    """
    if slope == 0:
        return None  # No trend

    # For increasing values (temperature, vibration)
    if slope > 0 and current_value < threshold:
        hours_remaining = (threshold - current_value) / slope
        return max(0, hours_remaining)

    # For decreasing values (pressure dropping below minimum)
    if slope < 0 and current_value > threshold:
        hours_remaining = (current_value - threshold) / abs(slope)
        return max(0, hours_remaining)

    # Already past threshold
    if (slope > 0 and current_value >= threshold) or (slope < 0 and current_value <= threshold):
        return 0

    return None


# ============================================================
# COMPOSITE RISK SCORE
# ============================================================
def compute_risk_score(proximity_score, degradation_score, anomaly_score):
    """
    Compute weighted composite risk score (0-100).
    Each input should be normalized to 0-100.
    """
    score = (
        WEIGHT_PROXIMITY * proximity_score +
        WEIGHT_DEGRADATION * degradation_score +
        WEIGHT_ANOMALY * anomaly_score
    )
    return min(100, max(0, round(score)))


# ============================================================
# MAIN PREDICTION FUNCTION
# ============================================================
def predict_for_sensor(sensor):
    """
    Generate a prediction for a single sensor.
    Returns a dict with risk assessment or None if insufficient data.
    """
    now = timezone.now()

    # --- 1. Get readings for both windows ---
    long_window_start = now - timedelta(hours=LONG_WINDOW_HOURS)
    short_window_start = now - timedelta(hours=SHORT_WINDOW_HOURS)

    long_readings = list(
        SensorReading.objects.filter(
            sensor=sensor,
            timestamp__gte=long_window_start
        ).order_by('timestamp').values_list('timestamp', 'value')
    )

    if len(long_readings) < MIN_READINGS_LONG:
        return None  # Not enough data

    short_readings = [
        (ts, val) for ts, val in long_readings
        if ts >= short_window_start
    ]

    # --- 2. Linear Regression (48h window) ---
    # Convert timestamps to hours since start
    start_time = long_readings[0][0]
    x_values = [(ts - start_time).total_seconds() / 3600.0 for ts, val in long_readings]
    y_values = [val for ts, val in long_readings]

    slope, intercept, r_squared = linear_regression(x_values, y_values)

    current_value = y_values[-1]  # Most recent value

    # --- 3. RUL Estimation ---
    # Determine the relevant threshold (critical)
    threshold = sensor.critical_threshold
    rul_hours = estimate_rul(current_value, slope, threshold)

    # --- 4. Z-Score (6h window) ---
    short_values = [val for ts, val in short_readings]
    all_values = y_values  # Use full 48h for the distribution baseline

    z_score = calculate_z_score(all_values, current_value)
    is_anomaly = abs(z_score) >= Z_SCORE_THRESHOLD

    # --- 5. Alert Frequency (last 7 days) ---
    alert_lookback = now - timedelta(days=ALERT_LOOKBACK_DAYS)
    recent_alerts_count = Alert.objects.filter(
        sensor=sensor,
        created_at__gte=alert_lookback
    ).count()

    # --- 6. Compute Component Scores (each 0-100) ---

    # Proximity score: how close is current value to critical threshold
    if sensor.critical_threshold and sensor.min_normal:
        range_total = sensor.critical_threshold - sensor.min_normal
        if range_total > 0:
            proximity_score = min(100, max(0,
                ((current_value - sensor.min_normal) / range_total) * 100
            ))
        else:
            proximity_score = 50
    else:
        proximity_score = 50

    # Degradation score: based on slope direction and magnitude
    if slope > 0 and sensor.critical_threshold > sensor.min_normal:
        # Positive slope toward critical threshold
        max_slope = (sensor.critical_threshold - sensor.min_normal) / 24  # Worst case: full range in 24h
        degradation_score = min(100, max(0, (slope / max_slope) * 100)) if max_slope > 0 else 0
    elif slope < 0 and sensor.min_normal > 0:
        # Negative slope (e.g., pressure dropping)
        max_slope = sensor.min_normal / 24
        degradation_score = min(100, max(0, (abs(slope) / max_slope) * 100)) if max_slope > 0 else 0
    else:
        degradation_score = 0

    # Anomaly score: z-score contribution + alert frequency
    z_contribution = min(100, max(0, (abs(z_score) / 3.0) * 60))  # z=3 → 60 points
    alert_contribution = min(40, recent_alerts_count * 10)  # Each alert = 10 points, max 40
    anomaly_score = min(100, z_contribution + alert_contribution)

    # --- 7. Final Composite Score ---
    risk_score = compute_risk_score(proximity_score, degradation_score, anomaly_score)

    # --- 8. Determine risk level and recommendation ---
    if risk_score >= 80:
        risk_level = 'critical'
        recommendation = "Maintenance urgente recommandée — risque de panne imminent"
    elif risk_score >= 60:
        risk_level = 'high'
        recommendation = "Planifier une intervention sous 24-48h"
    elif risk_score >= 40:
        risk_level = 'warning'
        recommendation = "Surveillance renforcée — tendance à surveiller"
    else:
        risk_level = 'normal'
        recommendation = "Fonctionnement normal — aucune action requise"

    # Format RUL
    if rul_hours is not None:
        if rul_hours < 1:
            rul_display = "< 1h"
        elif rul_hours < 24:
            rul_display = f"{int(rul_hours)}h"
        else:
            rul_display = f"{int(rul_hours / 24)}j"
    else:
        rul_display = "—"

    return {
        'sensor_id': sensor.id,
        'sensor_name': sensor.name,
        'sensor_type': sensor.sensor_type,
        'equipment_id': sensor.equipment_id,
        'equipment_name': sensor.equipment.name,
        'equipment_reference': sensor.equipment.reference,
        'current_value': round(current_value, 1),
        'unit': sensor.unit,
        'threshold': sensor.critical_threshold,
        'alert_threshold': sensor.alert_threshold,
        # Regression results
        'slope': round(slope, 4),
        'slope_per_hour': round(slope, 4),
        'r_squared': round(r_squared, 3),
        'trend_direction': 'increasing' if slope > 0 else ('decreasing' if slope < 0 else 'stable'),
        # RUL
        'rul_hours': round(rul_hours, 1) if rul_hours is not None else None,
        'rul_display': rul_display,
        # Z-Score
        'z_score': round(z_score, 2),
        'is_anomaly': is_anomaly,
        # Alert history
        'recent_alerts': recent_alerts_count,
        # Component scores
        'proximity_score': round(proximity_score, 1),
        'degradation_score': round(degradation_score, 1),
        'anomaly_score': round(anomaly_score, 1),
        # Final result
        'risk_score': risk_score,
        'risk_level': risk_level,
        'recommendation': recommendation,
        # Meta
        'data_points': len(long_readings),
        'window_hours': LONG_WINDOW_HOURS,
        'calculated_at': now.isoformat(),
    }


# ============================================================
# BATCH PREDICTION (all sensors)
# ============================================================
def predict_all():
    """
    Run predictions for all active sensors.
    Returns list of predictions sorted by risk_score (highest first).
    """
    sensors = Sensor.objects.filter(status='active').select_related('equipment')
    predictions = []

    for sensor in sensors:
        try:
            result = predict_for_sensor(sensor)
            if result:
                predictions.append(result)
        except Exception as e:
            # Skip sensors with errors
            continue

    # Sort by risk score descending
    predictions.sort(key=lambda x: x['risk_score'], reverse=True)
    return predictions
