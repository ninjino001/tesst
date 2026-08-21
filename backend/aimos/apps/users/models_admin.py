from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class SystemAdmin(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(blank=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    password = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)
        self.save()

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.username


class UserPlainPassword(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='plain_password')
    password = models.CharField(max_length=128, blank=True)

    class Meta:
        db_table = 'user_plain_password'
