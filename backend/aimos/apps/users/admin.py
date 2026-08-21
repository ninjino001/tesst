from django.contrib import admin

from .models import UserProfile
from .models_admin import SystemAdmin, UserPlainPassword


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role_title', 'airport')
    search_fields = ('user__username', 'user__email', 'role_title', 'airport')


@admin.register(SystemAdmin)
class SystemAdminAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active')
    search_fields = ('username', 'email')


@admin.register(UserPlainPassword)
class UserPlainPasswordAdmin(admin.ModelAdmin):
    list_display = ('user', 'password')
    search_fields = ('user__username',)
