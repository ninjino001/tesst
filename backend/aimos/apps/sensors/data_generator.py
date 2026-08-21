"""
AIMOS — Automatic Sensor Data Generator
=========================================
Generates realistic sensor data automatically when equipment is created.
Each equipment gets unique but realistic data based on its category.

Key principles:
- Each equipment has a unique "personality" (random seed based on equipment ID)
- Data follows realistic patterns: day/night cycles, seasonal variation, noise
- Two HVAC systems will have DIFFERENT values but SIMILAR patterns
- Generates 48h of data minimum (for AI predictions to work immediately)

Usage:
    from aimos.apps.sensors.data_generator import generate_data_for_equipment
    generate_data_for_equipment(equipment)  # Called automatically on creation
"""
import random
import math
from datetime import timedelta
from django.utils import timezone

from aimos.apps.sensors.models import Sensor, SensorReading


# ============================================================
# SENSOR PROFILES PER CATEGORY
# Each category defines which sensors an equipment should have
# Format: (sensor_type, unit, min_normal, max_normal, alert_threshold, critical_threshold)
# ============================================================
CATEGORY_PROFILES = {
    'HVAC': [
        ('temperature', '°C', 18, 30, 40, 50),
        ('humidity', '%', 30, 60, 75, 90),
        ('airflow', 'm³/h', 800, 1500, 1800, 2200),
        ('power', 'kW', 8, 15, 20, 25),
        ('vibration', 'mm/s', 0.2, 2.0, 4.0, 7.0),
    ],
    'Power': [
        ('voltage', 'V', 380, 420, 440, 460),
        ('current', 'A', 50, 200, 250, 300),
        ('temperature', '°C', 30, 70, 85, 100),
        ('power', 'kW', 100, 500, 600, 750),
    ],
    'Baggage Handling': [
        ('vibration', 'mm/s', 0.3, 2.5, 4.5, 7.0),
        ('power', 'kW', 5, 20, 25, 30),
        ('temperature', '°C', 25, 50, 65, 80),
        ('current', 'A', 10, 40, 50, 60),
    ],
    'Vertical Transport': [
        ('vibration', 'mm/s', 0.1, 1.5, 3.0, 5.0),
        ('power', 'kW', 10, 30, 40, 50),
        ('current', 'A', 20, 80, 100, 120),
    ],
    'Security': [
        ('power', 'kW', 2, 8, 10, 12),
        ('temperature', '°C', 20, 40, 50, 60),
        ('voltage', 'V', 220, 240, 260, 280),
    ],
    'Passenger Boarding': [
        ('pressure', 'bar', 100, 200, 250, 300),
        ('power', 'kW', 5, 15, 20, 25),
        ('vibration', 'mm/s', 0.2, 1.5, 3.0, 5.0),
    ],
    'Doors': [
        ('current', 'A', 1, 5, 7, 10),
        ('power', 'kW', 0.5, 2, 3, 4),
    ],
}

# Default profile for unknown categories
DEFAULT_PROFILE = [
    ('temperature', '°C', 15, 35, 45, 55),
    ('power', 'kW', 1, 10, 12, 15),
]

# Data generation config
GENERATION_HOURS = 72          # Generate 72h of history (enough for AI: needs 48h)
READING_INTERVAL_MINUTES = 30  # One reading every 30 minutes


# ============================================================
# EQUIPMENT "PERSONALITY" — makes each equipment unique
# ============================================================
def get_equipment_personality(equipment_id):
    """
    Generate a unique personality for an equipment.
    Same equipment ID always produces same personality (deterministic randomness).
    """
    rng = random.Random(equipment_id * 7919)  # Prime seed for uniqueness

    # ~40% of sensors will have a degradation scenario
    is_degrading = (equipment_id % 3 == 0) or (equipment_id % 5 == 1)

    return {
        'base_offset': rng.uniform(0.0, 0.25) if is_degrading else rng.uniform(-0.15, 0.1),
        'noise_level': rng.uniform(0.05, 0.15),
        'day_night_strength': rng.uniform(0.2, 0.5),
        'operating_point': rng.uniform(0.65, 0.85) if is_degrading else rng.uniform(0.3, 0.55),
        'drift_rate': rng.uniform(0.1, 0.2) if is_degrading else rng.uniform(-0.001, 0.003),
        'anomaly_probability': rng.uniform(0.03, 0.06) if is_degrading else rng.uniform(0.002, 0.008),
        'is_degrading': is_degrading,
    }


# ============================================================
# VALUE GENERATOR — creates a single realistic reading
# ============================================================
def generate_value(sensor, timestamp, personality, hours_since_start):
    """
    Generate a realistic sensor value based on:
    - Sensor type and thresholds
    - Time of day (day/night cycle)
    - Equipment personality (unique per equipment)
    - Slight aging drift
    - Random noise
    """
    min_n = sensor.min_normal
    max_n = sensor.max_normal
    range_size = max_n - min_n

    # Base operating point (unique per equipment)
    base = min_n + range_size * personality['operating_point']

    # Day/night cycle (temperature, power, airflow are higher during the day)
    hour = timestamp.hour
    if sensor.sensor_type in ('temperature', 'power', 'airflow', 'current'):
        day_factor = math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else -0.3
        base += range_size * personality['day_night_strength'] * day_factor * 0.3
    elif sensor.sensor_type == 'humidity':
        # Humidity is inverse of temperature
        day_factor = -math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else 0.2
        base += range_size * personality['day_night_strength'] * day_factor * 0.2

    # Equipment personality offset (makes each equipment unique)
    base += range_size * personality['base_offset']

    # Aging drift (progressive increase toward threshold for degrading equipment)
    drift = personality['drift_rate'] * hours_since_start
    base += drift

    # Degradation acceleration in the last 24h (makes predictions more visible)
    if personality.get('is_degrading') and hours_since_start > 48:
        # Accelerate in the last 24h
        extra_hours = hours_since_start - 48
        acceleration = extra_hours * personality['drift_rate'] * 2.5
        base += acceleration

    # Gaussian noise
    noise = random.gauss(0, range_size * personality['noise_level'])
    value = base + noise

    # Random anomaly (spike)
    is_anomaly = False
    if random.random() < personality['anomaly_probability']:
        spike = random.choice([1.2, 1.4, 1.6]) * range_size * 0.3
        if random.random() > 0.5:
            value += spike
        else:
            value -= spike * 0.5
        is_anomaly = True

    # Clamp to physically possible range (don't go below 0 for most sensors)
    if sensor.sensor_type in ('temperature',):
        value = max(-10, value)  # Temperature can be negative
    elif sensor.sensor_type in ('pressure', 'power', 'current', 'voltage', 'airflow', 'vibration'):
        value = max(0, value)
    elif sensor.sensor_type == 'humidity':
        value = max(0, min(100, value))

    return round(value, 2), is_anomaly


# ============================================================
# MAIN FUNCTION — Generate all data for an equipment
# ============================================================
def generate_data_for_equipment(equipment, hours=GENERATION_HOURS):
    """
    Generate sensors + readings for a single equipment.
    Called automatically when an equipment is created.
    
    Args:
        equipment: Equipment model instance
        hours: Number of hours of history to generate (default: 72h)
    
    Returns:
        dict with stats: {sensors_created, readings_created}
    """
    category_name = equipment.category.name if equipment.category else None
    profile = CATEGORY_PROFILES.get(category_name, DEFAULT_PROFILE)
    personality = get_equipment_personality(equipment.id)

    now = timezone.now()
    start_time = now - timedelta(hours=hours)

    sensors_created = 0
    readings_created = 0

    # Create sensors for this equipment (skip if already exist)
    existing_sensors = list(equipment.sensors.values_list('sensor_type', flat=True))

    for sensor_type, unit, min_n, max_n, alert_t, crit_t in profile:
        if sensor_type in existing_sensors:
            # Sensor already exists, just generate new readings if needed
            sensor = equipment.sensors.get(sensor_type=sensor_type)
        else:
            # Create the sensor
            sensor_count = Sensor.objects.count() + 1
            ref = f"SENS-{sensor_type[0].upper()}-{sensor_count:03d}"
            display_name = f"{sensor_type.replace('_', ' ').title()} – {equipment.name}"

            sensor = Sensor.objects.create(
                reference=ref,
                name=display_name,
                sensor_type=sensor_type,
                equipment=equipment,
                unit=unit,
                min_normal=min_n,
                max_normal=max_n,
                alert_threshold=alert_t,
                critical_threshold=crit_t,
                status='active',
            )
            sensors_created += 1

        # Check if sensor already has recent readings
        recent_count = SensorReading.objects.filter(
            sensor=sensor,
            timestamp__gte=start_time
        ).count()

        if recent_count >= (hours * 60 / READING_INTERVAL_MINUTES) * 0.8:
            continue  # Already has enough data, skip

        # Generate readings
        readings_batch = []
        current_time = start_time
        hours_elapsed = 0

        while current_time <= now:
            value, is_anomaly = generate_value(sensor, current_time, personality, hours_elapsed)

            readings_batch.append(SensorReading(
                sensor=sensor,
                value=value,
                timestamp=current_time,
                is_anomaly=is_anomaly,
                anomaly_score=0.8 if is_anomaly else None,
            ))

            current_time += timedelta(minutes=READING_INTERVAL_MINUTES)
            hours_elapsed += READING_INTERVAL_MINUTES / 60

            # Batch insert every 500 readings
            if len(readings_batch) >= 500:
                SensorReading.objects.bulk_create(readings_batch, ignore_conflicts=True)
                readings_created += len(readings_batch)
                readings_batch = []

        # Insert remaining
        if readings_batch:
            SensorReading.objects.bulk_create(readings_batch, ignore_conflicts=True)
            readings_created += len(readings_batch)

        # Update sensor's last value
        last_reading = SensorReading.objects.filter(sensor=sensor).order_by('-timestamp').first()
        if last_reading:
            sensor.last_value = last_reading.value
            sensor.last_reading_at = last_reading.timestamp
            sensor.save(update_fields=['last_value', 'last_reading_at'])

    return {
        'sensors_created': sensors_created,
        'readings_created': readings_created,
        'equipment': equipment.reference,
        'category': category_name,
    }


# ============================================================
# BULK GENERATION — Generate for all equipment
# ============================================================
def generate_data_for_all_equipment(hours=GENERATION_HOURS):
    """Generate data for all equipment that don't have enough readings."""
    from aimos.apps.equipment.models import Equipment

    results = []
    equipment_list = Equipment.objects.select_related('category').all()

    for eq in equipment_list:
        result = generate_data_for_equipment(eq, hours=hours)
        results.append(result)
        if result['sensors_created'] > 0 or result['readings_created'] > 0:
            print(f"  ✓ {eq.reference} ({result['category']}): "
                  f"{result['sensors_created']} sensors, {result['readings_created']} readings")

    return results



# ============================================================
# SINGLE SENSOR GENERATION — Called when a sensor is manually added
# ============================================================
def generate_readings_for_sensor(sensor, hours=GENERATION_HOURS):
    """
    Generate readings for a single sensor.
    Called when a sensor is manually added via the UI.
    Uses the sensor's own min_normal/max_normal as the data range.
    """
    personality = get_equipment_personality(sensor.id)
    now = timezone.now()
    start_time = now - timedelta(hours=hours)

    readings_batch = []
    current_time = start_time
    hours_elapsed = 0

    while current_time <= now:
        value, is_anomaly = generate_value(sensor, current_time, personality, hours_elapsed)

        readings_batch.append(SensorReading(
            sensor=sensor,
            value=value,
            timestamp=current_time,
            is_anomaly=is_anomaly,
            anomaly_score=0.8 if is_anomaly else None,
        ))

        current_time += timedelta(minutes=READING_INTERVAL_MINUTES)
        hours_elapsed += READING_INTERVAL_MINUTES / 60

        if len(readings_batch) >= 500:
            SensorReading.objects.bulk_create(readings_batch, ignore_conflicts=True)
            readings_batch = []

    if readings_batch:
        SensorReading.objects.bulk_create(readings_batch, ignore_conflicts=True)

    # Update sensor's last value
    last_reading = SensorReading.objects.filter(sensor=sensor).order_by('-timestamp').first()
    if last_reading:
        sensor.last_value = last_reading.value
        sensor.last_reading_at = last_reading.timestamp
        sensor.save(update_fields=['last_value', 'last_reading_at'])

    return len(readings_batch) + SensorReading.objects.filter(sensor=sensor).count()
