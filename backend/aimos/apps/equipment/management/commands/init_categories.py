"""
Initialize default equipment categories.
Run automatically at startup or manually:
    docker exec aimos_backend python manage.py init_categories
"""
from django.core.management.base import BaseCommand
from aimos.apps.equipment.models import EquipmentCategory


DEFAULT_CATEGORIES = [
    ('HVAC', 'Centrales de Traitement d\'Air (CTA) et Pompes à Chaleur (PAC)'),
    ('Baggage Handling', 'Tapis de livraison bagages et systèmes de tri'),
    ('Vertical Transport', 'Ascenseurs, monte-charges et escaliers mécaniques'),
    ('Security', 'RX bagages, EDS, Body scan'),
    ('Passenger Boarding', 'Passerelles télescopiques'),
    ('Power', 'Convertisseurs 400 Hz et alimentation électrique'),
    ('Doors', 'Portes automatiques'),
]


class Command(BaseCommand):
    help = 'Initialize default equipment categories'

    def handle(self, *args, **options):
        created = 0
        for name, desc in DEFAULT_CATEGORIES:
            _, was_created = EquipmentCategory.objects.get_or_create(
                name=name, defaults={'description': desc}
            )
            if was_created:
                created += 1

        if created > 0:
            self.stdout.write(self.style.SUCCESS(f'Created {created} categories'))
        else:
            self.stdout.write('All categories already exist')
