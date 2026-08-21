import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create the admin user from environment variables'

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get('ADMIN_USERNAME')
        email = os.environ.get('ADMIN_EMAIL', '')
        password = os.environ.get('ADMIN_PASSWORD')

        if not username or not password:
            self.stdout.write(self.style.WARNING(
                'ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables (.env)'
            ))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(f'Admin user "{username}" already exists')
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f'Created admin user: {username}'))
