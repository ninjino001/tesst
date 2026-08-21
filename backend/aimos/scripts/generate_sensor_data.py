"""
generate_sensor_data.py — AIMOS Sensor Data Simulation Script

Generates realistic sensor data for a single airport's equipment including:
- Normal behavior patterns (day/night cycles, seasonal variations)
- Degradation scenarios leading to failures
- Random anomalies

Usage (inside Docker):
    docker exec -it aimos_backend python -c "exec(open('/app/aimos/scripts/generate_sensor_data.py').read())"
"""

import os
import sys
import random
import math
from datetime import datetime, timedelta, date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aimos.settings')
import django
django.setup()

from django.utils import timezone
from aimos.apps.equipment.models import EquipmentCategory, Equipment
from aimos.apps.sensors.models import Sensor, SensorReading

print("=" * 60)
print("AIMOS — Sensor Data Simulation Generator")
print("=" * 60)


# ============================================================
# STEP 1: Create Equipment Categories
# ============================================================
print("\n[1/4] Creating equipment categories...")

CATEGORIES_DATA = [
    ('HVAC', 'Heating, Ventilation & Air Conditioning'),
    ('Power', 'Electrical power generation and distribution'),
    ('Lighting', 'Runway, taxiway and terminal lighting'),
    ('Fire Safety', 'Fire detection and suppression systems'),
    ('Baggage Handling', 'Baggage conveyor and sorting systems'),
    ('Vertical Transport', 'Elevators, escalators and moving walkways'),
    ('ATC', 'Air Traffic Control systems'),
    ('Plumbing', 'Water supply and drainage systems'),
]

categories = {}
for name, desc in CATEGORIES_DATA:
    obj, created = EquipmentCategory.objects.get_or_create(name=name, defaults={'description': desc})
    categories[name] = obj
    print(f"  {'Created' if created else 'Exists'}: {obj}")


# ============================================================
# STEP 2: Create Equipment
# ============================================================
print("\n[2/4] Creating equipment...")

EQUIPMENT_DATA = [
    ('HVAC Unit – Terminal 1', 'TRANE RTAC 240', 'HVAC', 'Terminal 1 – Roof', 'high', 'TR-RTAC240-22-00145', 'TRANE'),
    ('Generator Set #2', 'CAT C175-16', 'Power', 'Local technique principal', 'high', 'CAT-C175-21-00087', 'Caterpillar'),
    ('Baggage Conveyor Belt #3', 'VANDERLANDE CB 5000', 'Baggage Handling', 'Hall bagages – Zone A', 'medium', 'VDL-CB5K-20-00332', 'Vanderlande'),
    ('Passenger Elevator #4', 'KONE MonoSpace', 'Vertical Transport', 'Terminal 2 – Hall départs', 'medium', 'KONE-MS-19-00456', 'KONE'),
    ('Lighting System – Apron', 'PHILIPS OptiVision LED', 'Lighting', 'Aire de stationnement', 'high', 'PHL-OV-22-00089', 'Philips'),
    ('Fire Alarm Panel #1', 'SIEMENS Cerberus', 'Fire Safety', 'Terminal 1 – Local sécurité', 'high', 'SIE-CRB-21-00201', 'Siemens'),
    ('Water Pump #2', 'GRUNDFOS CR 10-6', 'Plumbing', 'Sous-sol – Local technique', 'medium', 'GRF-CR10-20-00178', 'Grundfos'),
    ('A/C Tower – Unit #1', 'THALES TopSky ATC', 'ATC', 'Tour de contrôle', 'critical', 'THL-TS-18-00012', 'Thales'),
    ('Runway Lighting RWY-09L', 'ADB SAFEGATE', 'Lighting', 'Piste 09L', 'critical', 'ADB-SG-20-00067', 'ADB Safegate'),
    ('Escalator #2 – Terminal 1', 'SCHINDLER 9300', 'Vertical Transport', 'Terminal 1 – Départs', 'low', 'SCH-9300-21-00134', 'Schindler'),
]

equipment_list = []
for i, (name, model, cat, location, crit, serial, manufacturer) in enumerate(EQUIPMENT_DATA, 1):
    ref = f"EQP-{i:04d}"
    install_date = date(2020 + random.randint(0, 3), random.randint(1, 12), random.randint(1, 28))
    last_maint = date(2024, random.randint(3, 5), random.randint(1, 28))
    next_maint = last_maint + timedelta(days=random.randint(30, 90))

    obj, created = Equipment.objects.get_or_create(
        reference=ref,
        defaults={
            'name': name,
            'model': model,
            'category': categories[cat],
            'location': location,
            'criticality': crit,
            'serial_number': serial,
            'manufacturer': manufacturer,
            'status': 'operational',
            'installation_date': install_date,
            'last_maintenance': last_maint,
            'next_maintenance': next_maint,
            'maintenance_frequency_days': 90,
        }
    )
    equipment_list.append(obj)
    print(f"  {'Created' if created else 'Exists'}: {obj}")


# ============================================================
# STEP 3: Create Sensors for each Equipment
# ============================================================
print("\n[3/4] Creating sensors...")

SENSOR_PROFILES = {
    'HVAC': [
        ('temperature', '°C', 18, 30, 40, 50),
        ('humidity', '%', 30, 60, 75, 90),
        ('airflow', 'm³/h', 800, 1500, 1800, 2200),
        ('power', 'kW', 8, 15, 20, 25),
        ('vibration', 'mm/s', 0.2, 2.0, 4.0, 7.0),
    ],
    'Power': [
        ('temperature', '°C', 30, 70, 85, 100),
        ('vibration', 'mm/s', 0.5, 3.0, 5.0, 8.0),
        ('power', 'kW', 100, 500, 600, 750),
        ('voltage', 'V', 380, 420, 440, 460),
        ('current', 'A', 50, 200, 250, 300),
    ],
    'Lighting': [
        ('power', 'kW', 2, 8, 10, 12),
        ('voltage', 'V', 220, 240, 260, 280),
        ('temperature', '°C', 20, 45, 60, 80),
    ],
    'Fire Safety': [
        ('temperature', '°C', 15, 25, 35, 45),
        ('humidity', '%', 30, 55, 70, 85),
        ('voltage', 'V', 22, 26, 28, 30),
    ],
    'Baggage Handling': [
        ('vibration', 'mm/s', 0.3, 2.5, 4.5, 7.0),
        ('power', 'kW', 5, 20, 25, 30),
        ('temperature', '°C', 25, 50, 65, 80),
    ],
    'Vertical Transport': [
        ('vibration', 'mm/s', 0.1, 1.5, 3.0, 5.0),
        ('power', 'kW', 10, 30, 40, 50),
        ('current', 'A', 20, 80, 100, 120),
    ],
    'ATC': [
        ('temperature', '°C', 18, 24, 28, 32),
        ('humidity', '%', 35, 50, 60, 70),
        ('power', 'kW', 15, 40, 50, 60),
        ('voltage', 'V', 220, 230, 240, 250),
    ],
    'Plumbing': [
        ('pressure', 'bar', 3, 6, 8, 10),
        ('vibration', 'mm/s', 0.2, 1.5, 3.0, 5.0),
        ('power', 'kW', 2, 7, 9, 12),
    ],
}

sensor_count = 0
sensors_map = {}

for eq in equipment_list:
    cat_name = eq.category.name
    profiles = SENSOR_PROFILES.get(cat_name, [])
    eq_sensors = []

    for j, (stype, unit, min_n, max_n, alert_t, crit_t) in enumerate(profiles, 1):
        sensor_count += 1
        ref = f"SENS-{stype[0].upper()}-{sensor_count:03d}"
        display_name = f"{eq.name} – {dict(Sensor.SENSOR_TYPES).get(stype, stype)}"

        obj, created = Sensor.objects.get_or_create(
            reference=ref,
            defaults={
                'name': display_name,
                'sensor_type': stype,
                'equipment': eq,
                'unit': unit,
                'min_normal': min_n,
                'max_normal': max_n,
                'alert_threshold': alert_t,
                'critical_threshold': crit_t,
                'status': 'active',
            }
        )
        eq_sensors.append(obj)
        if created:
            print(f"  Created: {ref} ({stype}) -> {eq.reference}")

    sensors_map[eq.reference] = eq_sensors

print(f"  Total sensors: {Sensor.objects.count()}")


# ============================================================
# STEP 4: Generate Sensor Readings (6 months of data)
# ============================================================
print("\n[4/4] Generating sensor readings (6 months, every 30 min)...")
print("  This may take 1-2 minutes...")

SensorReading.objects.all().delete()

NOW = timezone.now()
START_DATE = NOW - timedelta(days=180)
INTERVAL_MINUTES = 30

# Degradation: EQP-0001 (HVAC) degrades for last 15 days
DEGRADATION_START = NOW - timedelta(days=15)
DEGRADING_EQUIPMENT = 'EQP-0001'

total_readings = 0
batch_size = 5000
readings_batch = []


def generate_value(sensor, timestamp, equipment_ref):
    """Generate a realistic sensor value with patterns."""
    base_min = sensor.min_normal
    base_max = sensor.max_normal
    mid = (base_min + base_max) / 2
    amplitude = (base_max - base_min) / 2

    hour = timestamp.hour
    day_of_year = timestamp.timetuple().tm_yday

    # Day/night cycle
    day_factor = math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else -0.3
    if sensor.sensor_type in ('temperature', 'power', 'airflow'):
        value = mid + amplitude * 0.4 * day_factor
    else:
        value = mid + amplitude * 0.1 * day_factor

    # Seasonal variation
    if sensor.sensor_type == 'temperature':
        seasonal = math.sin(2 * math.pi * (day_of_year - 80) / 365) * 3
        value += seasonal

    # Noise
    noise = random.gauss(0, amplitude * 0.08)
    value += noise

    # Degradation scenario
    if equipment_ref == DEGRADING_EQUIPMENT and timestamp >= DEGRADATION_START:
        days_deg = (timestamp - DEGRADATION_START).total_seconds() / 86400
        if sensor.sensor_type == 'temperature':
            value += days_deg * 1.5
        elif sensor.sensor_type == 'vibration':
            value += days_deg * 0.3
        elif sensor.sensor_type == 'power':
            value += days_deg * 0.5

    # Random anomaly (0.5%)
    is_anomaly = False
    if random.random() < 0.005:
        spike = random.choice([1.3, 1.5, 1.8]) * amplitude
        value += spike
        is_anomaly = True

    value = max(0, value)
    return round(value, 2), is_anomaly


def flush_batch():
    global readings_batch, total_readings
    if readings_batch:
        SensorReading.objects.bulk_create(readings_batch, ignore_conflicts=True)
        total_readings += len(readings_batch)
        readings_batch = []


all_sensors = Sensor.objects.select_related('equipment').all()

for sensor in all_sensors:
    eq_ref = sensor.equipment.reference
    current = START_DATE

    while current <= NOW:
        value, is_anomaly = generate_value(sensor, current, eq_ref)

        readings_batch.append(SensorReading(
            sensor=sensor,
            value=value,
            timestamp=current,
            is_anomaly=is_anomaly,
            anomaly_score=random.uniform(0.6, 0.95) if is_anomaly else None,
        ))

        if len(readings_batch) >= batch_size:
            flush_batch()
            sys.stdout.write(f"\r  Generated {total_readings:,} readings...")
            sys.stdout.flush()

        current += timedelta(minutes=INTERVAL_MINUTES)

    # Update sensor last_value
    sensor.last_value = value
    sensor.last_reading_at = NOW
    sensor.save(update_fields=['last_value', 'last_reading_at'])

flush_batch()
print(f"\r  Generated {total_readings:,} readings total.              ")

# Mark EQP-0001 as under maintenance
eq1 = Equipment.objects.get(reference=DEGRADING_EQUIPMENT)
eq1.status = 'under_maintenance'
eq1.save(update_fields=['status'])

print("\n" + "=" * 60)
print("SIMULATION COMPLETE!")
print("=" * 60)
print(f"""
Summary:
  - Categories: {EquipmentCategory.objects.count()}
  - Equipment: {Equipment.objects.count()}
  - Sensors: {Sensor.objects.count()}
  - Readings: {SensorReading.objects.count():,}
  - Time range: {START_DATE.strftime('%Y-%m-%d')} to {NOW.strftime('%Y-%m-%d')}
  - Degradation scenario: {DEGRADING_EQUIPMENT} (HVAC Terminal 1)
    -> Temperature rising +1.5 deg/day for last 15 days
    -> Status set to 'under_maintenance'

API Endpoints:
  GET /api/equipment/              -> List all equipment
  GET /api/equipment/stats/        -> Dashboard stats
  GET /api/equipment/EQP-0001/     -> Equipment detail
  GET /api/sensors/?equipment_ref=EQP-0001  -> Sensors for equipment
  GET /api/sensors/1/readings/?days=30      -> Last 30 days of readings
  GET /api/sensors/equipment/EQP-0001/latest/ -> Latest values
""")
