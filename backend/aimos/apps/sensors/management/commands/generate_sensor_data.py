"""
Management command to generate sensor data for all equipment.

Usage:
    python manage.py generate_sensor_data
    python manage.py generate_sensor_data --hours 168  # 7 days
    python manage.py generate_sensor_data --equipment EQP-0001  # Single equipment
"""
from django.core.management.base import BaseCommand
from aimos.apps.equipment.models import Equipment
from aimos.apps.sensors.data_generator import generate_data_for_equipment


class Command(BaseCommand):
    help = 'Generate realistic sensor data for equipment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=int, default=72,
            help='Number of hours of data to generate (default: 72)'
        )
        parser.add_argument(
            '--equipment', type=str, default=None,
            help='Generate data for a specific equipment reference (e.g., EQP-0001)'
        )

    def handle(self, *args, **options):
        hours = options['hours']
        eq_ref = options['equipment']

        self.stdout.write("=" * 60)
        self.stdout.write("AIMOS — Sensor Data Generator")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Hours: {hours}")

        if eq_ref:
            try:
                equipment = Equipment.objects.select_related('category').get(reference=eq_ref)
            except Equipment.DoesNotExist:
                self.stderr.write(f"Equipment {eq_ref} not found!")
                return

            self.stdout.write(f"  Equipment: {equipment.reference} – {equipment.name}")
            result = generate_data_for_equipment(equipment, hours=hours)
            self.stdout.write(
                f"  ✓ {result['sensors_created']} sensors, {result['readings_created']} readings"
            )
        else:
            equipment_list = Equipment.objects.select_related('category').all()
            self.stdout.write(f"  Equipment count: {equipment_list.count()}")
            self.stdout.write("")

            total_sensors = 0
            total_readings = 0

            for eq in equipment_list:
                result = generate_data_for_equipment(eq, hours=hours)
                total_sensors += result['sensors_created']
                total_readings += result['readings_created']
                if result['sensors_created'] > 0 or result['readings_created'] > 0:
                    self.stdout.write(
                        f"  ✓ {eq.reference} ({result['category']}): "
                        f"{result['sensors_created']} sensors, {result['readings_created']} readings"
                    )
                else:
                    self.stdout.write(f"  — {eq.reference}: already has data, skipped")

            self.stdout.write("")
            self.stdout.write("=" * 60)
            self.stdout.write(f"  Total sensors created: {total_sensors}")
            self.stdout.write(f"  Total readings created: {total_readings}")
            self.stdout.write("=" * 60)
            self.stdout.write(self.style.SUCCESS("Done!"))
