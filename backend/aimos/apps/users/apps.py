from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'aimos.apps.users'
    verbose_name = 'AIMOS Users'

    def ready(self):
        import aimos.apps.users.signals  # noqa: F401
