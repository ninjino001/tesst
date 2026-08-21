from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    airport = models.CharField(max_length=128, blank=True)
    role_title = models.CharField(max_length=128, blank=True)

    def __str__(self):
        return f'{self.user.username} profile'


# Import auxiliary admin models so Django detects them for migrations
from . import models_admin  # noqa: F401
