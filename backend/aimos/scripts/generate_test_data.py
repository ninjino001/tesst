"""
Generate test data for interventions and alerts.
Run inside Django: python manage.py shell < aimos/scripts/generate_test_data.py
Or: docker exec aimos_backend python -c "exec(open('/app/aimos/scripts/generate_test_data.py').read())"
"""
import os
import sys
import django
import random
from datetime import timedelta, date

# Setup Django if not already configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aimos.settings')
if not django.conf.settings.configured:
    django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from aimos.apps.equipment.models import Equipment, EquipmentCategory
from aimos.apps.sensors.models import Sensor
from aimos.apps.interventions.models import Intervention
from aimos.apps.alerts.models import Alert

User = get_user_model()

print("=" * 60)
print("AIMOS — Generating test data (interventions + alerts)")
print("=" * 60)

# ============================================================
# 1. Ensure we have equipment and categories
# ============================================================
CATEGORIES_DATA = [
    ('HVAC', 'Heating, Ventilation & Air Conditioning', 'thermometer'),
    ('Power', 'Electrical Power Systems', 'zap'),
    ('Baggage Handling', 'Baggage Transport Systems', 'package'),
    ('Vertical Transport', 'Elevators & Escalators', 'arrow-up'),
    ('Lighting', 'Airfield & Terminal Lighting', 'sun'),
    ('Fire Safety', 'Fire Detection & Suppression', 'shield'),
    ('Plumbing', 'Water & Fluid Systems', 'droplet'),
    ('ATC', 'Air Traffic Control Systems', 'radio'),
]

categories = {}
for name, desc, icon in CATEGORIES_DATA:
    cat, _ = EquipmentCategory.objects.get_or_create(
        name=name, defaults={'description': desc, 'icon': icon}
    )
    categories[name] = cat

print(f"✓ {len(categories)} equipment categories ready")

EQUIPMENT_DATA = [
    ('EQP-0001', 'HVAC Unit – Terminal 1', 'TRANE RTAC 240', 'HVAC', 'Terminal 1 – Roof', 'operational', 'high', 'TRANE', 'TR-RTAC240-22-00145'),
    ('EQP-0002', 'Generator Set #2', 'CAT C175-16', 'Power', 'Local technique principal', 'under_maintenance', 'high', 'Caterpillar', 'CAT-C175-21-00089'),
    ('EQP-0003', 'Baggage Conveyor Belt #3', 'VANDERLANDE CB 5000', 'Baggage Handling', 'Hall bagages – Zone A', 'operational', 'medium', 'Vanderlande', 'VDL-CB5K-20-00234'),
    ('EQP-0004', 'Passenger Elevator #4', 'KONE MonoSpace', 'Vertical Transport', 'Terminal 2 – Hall départs', 'operational', 'medium', 'KONE', 'KONE-MS-22-00567'),
    ('EQP-0005', 'Lighting System – Apron', 'PHILIPS OptiVision LED', 'Lighting', 'Aire de stationnement', 'out_of_service', 'high', 'Philips', 'PH-OV-19-01234'),
    ('EQP-0006', 'Fire Alarm Panel #1', 'SIEMENS Cerberus', 'Fire Safety', 'Terminal 1 – Local sécurité', 'operational', 'high', 'Siemens', 'SIE-CRB-21-00078'),
    ('EQP-0007', 'Water Pump #2', 'GRUNDFOS CR 10-6', 'Plumbing', 'Sous-sol – Local technique', 'under_maintenance', 'medium', 'Grundfos', 'GF-CR10-20-00445'),
    ('EQP-0008', 'A/C Tower – Unit #1', 'THALES TopSky ATC', 'ATC', 'Tour de contrôle', 'operational', 'critical', 'Thales', 'TH-TSK-18-00012'),
    ('EQP-0009', 'Runway Lighting RWY-09L', 'ADB SAFEGATE', 'Lighting', 'Piste 09L', 'operational', 'critical', 'ADB Safegate', 'ADB-SG-17-00089'),
    ('EQP-0010', 'Escalator #2 – Terminal 1', 'SCHINDLER 9300', 'Vertical Transport', 'Terminal 1 – Départs', 'operational', 'low', 'Schindler', 'SCH-9300-20-00156'),
]

equipment_list = []
for ref, name, model, cat_name, location, status, criticality, manufacturer, serial in EQUIPMENT_DATA:
    eq, created = Equipment.objects.get_or_create(
        reference=ref,
        defaults={
            'name': name,
            'model': model,
            'category': categories[cat_name],
            'location': location,
            'status': status,
            'criticality': criticality,
            'manufacturer': manufacturer,
            'serial_number': serial,
            'installation_date': date(2022, random.randint(1, 12), random.randint(1, 28)),
            'warranty_expiry': date(2026, random.randint(1, 12), random.randint(1, 28)),
            'last_maintenance': date(2026, 7, random.randint(1, 28)),
            'next_maintenance': date(2026, 8, random.randint(15, 30)),
            'maintenance_frequency_days': random.choice([30, 60, 90, 180]),
        }
    )
    equipment_list.append(eq)

print(f"✓ {len(equipment_list)} equipment items ready")

# ============================================================
# 2. Ensure we have technicians (users)
# ============================================================
TECHNICIANS_DATA = [
    ('youssef.idrissi', 'Youssef', 'Idrissi'),
    ('ahmed.bennani', 'Ahmed', 'Bennani'),
    ('karim.fassi', 'Karim', 'Fassi'),
    ('sara.alami', 'Sara', 'Alami'),
]

technicians = []
for username, first, last in TECHNICIANS_DATA:
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'first_name': first,
            'last_name': last,
            'email': f'{username}@aimos.ma',
            'is_active': True,
        }
    )
    if created:
        user.set_password('Tech@2026')
        user.save()
    technicians.append(user)

print(f"✓ {len(technicians)} technicians ready")

# ============================================================
# 3. Generate Interventions
# ============================================================
print("\nGenerating interventions...")
Intervention.objects.all().delete()  # Clean slate

now = timezone.now()
intervention_descriptions = {
    'preventive': [
        'Maintenance trimestrielle — inspection complète',
        'Graissage et vérification des composants',
        'Test mensuel des systèmes de sécurité',
        'Calibration et ajustement des capteurs',
        'Remplacement préventif des filtres',
        'Inspection semestrielle — lubrification et contrôle',
        'Nettoyage complet et vérification d\'étanchéité',
        'Contrôle des connexions électriques',
    ],
    'corrective': [
        'Surchauffe détectée — remplacement joint thermique',
        'Vibrations anormales — diagnostic et réparation',
        'Fuite détectée sur joint principal',
        'Remplacement composant défectueux',
        'Panne électrique — diagnostic circuit',
        'Bruit anormal — remplacement roulement',
        'Chute de performance — nettoyage échangeur',
        'Alarme capteur — recalibration nécessaire',
    ],
}

interventions_created = 0
for i in range(1, 26):
    eq = random.choice(equipment_list)
    int_type = random.choice(['preventive', 'corrective'])
    priority = random.choice(['critical', 'high', 'medium', 'low'])
    desc = random.choice(intervention_descriptions[int_type])

    # Determine status and dates
    days_ago = random.randint(0, 60)
    created_at = now - timedelta(days=days_ago)

    status_weights = ['planned'] * 2 + ['assigned'] * 3 + ['in_progress'] * 3 + ['closed'] * 5
    status = random.choice(status_weights)

    tech = None
    started_at = None
    closed_at = None
    planned_date = (created_at + timedelta(days=random.randint(1, 14))).date()

    if status in ('assigned', 'in_progress', 'closed'):
        tech = random.choice(technicians)
    if status in ('in_progress', 'closed'):
        started_at = created_at + timedelta(days=random.randint(1, 5))
    if status == 'closed':
        closed_at = started_at + timedelta(days=random.randint(1, 3)) if started_at else None

    intervention = Intervention(
        equipment=eq,
        technician=tech,
        intervention_type=int_type,
        priority=priority,
        status=status,
        description=desc,
        planned_date=planned_date,
        started_at=started_at,
        closed_at=closed_at,
        report='Intervention terminée avec succès.' if status == 'closed' else '',
    )
    intervention.save()  # auto-generates reference
    # Override created_at (auto_now_add)
    Intervention.objects.filter(pk=intervention.pk).update(created_at=created_at)
    interventions_created += 1

print(f"✓ {interventions_created} interventions created")

# ============================================================
# 4. Generate Sensors if not existing
# ============================================================
SENSOR_CONFIG = {
    'EQP-0001': [
        ('temperature', 'Température compresseur', '°C', 18, 35, 40, 50),
        ('humidity', 'Humidité sortie', '%', 30, 55, 60, 75),
        ('airflow', 'Débit air', 'm³/h', 800, 1500, 1600, 1800),
        ('power', 'Consommation', 'kW', 5, 15, 18, 22),
    ],
    'EQP-0002': [
        ('vibration', 'Vibration moteur', 'mm/s', 0.5, 3.0, 4.0, 6.0),
        ('temperature', 'Température huile', '°C', 40, 80, 90, 110),
        ('power', 'Puissance sortie', 'kW', 100, 400, 450, 500),
    ],
    'EQP-0003': [
        ('temperature', 'Température moteur', '°C', 30, 60, 65, 80),
        ('vibration', 'Vibration courroie', 'mm/s', 0.2, 2.0, 3.0, 4.5),
        ('current', 'Courant moteur', 'A', 5, 20, 25, 30),
    ],
    'EQP-0005': [
        ('power', 'Consommation éclairage', 'kW', 1.0, 5.0, 2.0, 0.5),
        ('voltage', 'Tension alimentation', 'V', 210, 240, 200, 190),
    ],
    'EQP-0007': [
        ('pressure', 'Pression sortie', 'bar', 2.5, 5.0, 2.0, 1.5),
        ('temperature', 'Température fluide', '°C', 10, 30, 35, 45),
    ],
    'EQP-0008': [
        ('temperature', 'Température salle', '°C', 18, 24, 26, 30),
        ('humidity', 'Humidité salle', '%', 35, 55, 60, 70),
        ('power', 'Consommation rack', 'kW', 2, 8, 10, 12),
    ],
    'EQP-0009': [
        ('voltage', 'Tension balisage', 'V', 200, 240, 195, 185),
        ('current', 'Courant balisage', 'A', 10, 30, 35, 40),
    ],
}

sensors_created = 0
sensor_counter = Sensor.objects.count()

for eq_ref, sensor_configs in SENSOR_CONFIG.items():
    eq = Equipment.objects.get(reference=eq_ref)
    for sensor_type, name, unit, min_n, max_n, alert_t, crit_t in sensor_configs:
        sensor_counter += 1
        ref = f"SENS-{sensor_type[0].upper()}-{sensor_counter:03d}"

        # Generate a current value (sometimes in alert range)
        if random.random() < 0.2:  # 20% chance of abnormal value
            current_value = round(alert_t + random.uniform(0, crit_t - alert_t) * 0.5, 1)
        else:
            current_value = round(random.uniform(min_n, max_n), 1)

        sensor, created = Sensor.objects.get_or_create(
            equipment=eq,
            sensor_type=sensor_type,
            name=name,
            defaults={
                'reference': ref,
                'unit': unit,
                'min_normal': min_n,
                'max_normal': max_n,
                'alert_threshold': alert_t,
                'critical_threshold': crit_t,
                'status': 'active',
                'last_value': current_value,
                'last_reading_at': now - timedelta(minutes=random.randint(1, 30)),
            }
        )
        if created:
            sensors_created += 1

print(f"✓ {sensors_created} sensors created (total: {Sensor.objects.count()})")

# ============================================================
# 5. Generate Alerts
# ============================================================
print("\nGenerating alerts...")
Alert.objects.all().delete()  # Clean slate

ALERT_MESSAGES = {
    'critical': [
        'Surchauffe critique détectée — arrêt imminent possible',
        'Vibrations anormales — risque de panne imminente',
        'Chute de tension critique — risque d\'extinction',
        'Consommation quasi nulle — équipement probablement hors service',
        'Pression critique — risque de rupture',
    ],
    'warning': [
        'Température en hausse progressive — surveillance recommandée',
        'Vibration en hausse — maintenance à planifier',
        'Pression en dessous du seuil normal — fuite possible',
        'Humidité élevée — vérification climatisation recommandée',
        'Performance dégradée — inspection nécessaire',
    ],
    'info': [
        'Capteur recalibré automatiquement',
        'Valeur marginale détectée — pas d\'action requise',
        'Cycle de fonctionnement atteint — maintenance préventive recommandée',
        'Variation saisonnière normale détectée',
    ],
}

alerts_created = 0
for i in range(1, 16):
    level = random.choice(['critical'] * 3 + ['warning'] * 4 + ['info'] * 2)
    msg = random.choice(ALERT_MESSAGES[level])

    # Pick a sensor that exists
    sensor = random.choice(list(Sensor.objects.all()))
    eq = sensor.equipment

    # Determine measured vs threshold
    if level == 'critical':
        measured = round(sensor.critical_threshold * random.uniform(1.0, 1.3), 1)
    elif level == 'warning':
        measured = round(sensor.alert_threshold * random.uniform(0.95, 1.1), 1)
    else:
        measured = round(sensor.max_normal * random.uniform(0.9, 1.0), 1)

    threshold = sensor.alert_threshold if level in ('warning', 'info') else sensor.critical_threshold

    # Status
    days_ago = random.randint(0, 30)
    created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))

    status_weights = ['active'] * 4 + ['acknowledged'] * 3 + ['resolved'] * 3
    status = random.choice(status_weights)

    acknowledged_at = None
    resolved_at = None
    acknowledged_by = None
    resolved_by = None

    if status in ('acknowledged', 'resolved'):
        acknowledged_at = created_at + timedelta(hours=random.randint(1, 48))
        acknowledged_by = random.choice(technicians)
    if status == 'resolved':
        resolved_at = acknowledged_at + timedelta(hours=random.randint(2, 72))
        resolved_by = random.choice(technicians)

    alert = Alert(
        equipment=eq,
        sensor=sensor,
        level=level,
        status=status,
        message=msg,
        measured_value=measured,
        threshold_value=threshold,
        unit=sensor.unit,
        acknowledged_at=acknowledged_at,
        acknowledged_by=acknowledged_by,
        resolved_at=resolved_at,
        resolved_by=resolved_by,
    )
    alert.save()  # auto-generates reference
    # Override created_at
    Alert.objects.filter(pk=alert.pk).update(created_at=created_at)
    alerts_created += 1

print(f"✓ {alerts_created} alerts created")

# ============================================================
# Summary
# ============================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"  Categories:     {EquipmentCategory.objects.count()}")
print(f"  Equipment:      {Equipment.objects.count()}")
print(f"  Sensors:        {Sensor.objects.count()}")
print(f"  Interventions:  {Intervention.objects.count()}")
print(f"  Alerts:         {Alert.objects.count()}")
print(f"  Technicians:    {len(technicians)}")
print("=" * 60)
print("✓ Test data generation complete!")
