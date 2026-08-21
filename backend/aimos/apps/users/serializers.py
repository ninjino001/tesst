import uuid
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    airport = serializers.SerializerMethodField()
    role_title = serializers.SerializerMethodField()
    profile = serializers.DictField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_login = serializers.DateTimeField(read_only=True)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_active', 'airport', 'role_title', 'profile', 'password', 'last_login', 'date_joined']
        read_only_fields = ['date_joined', 'last_login']

    def to_representation(self, instance):
        try:
            return super().to_representation(instance)
        except Exception:
            return {
                'id': instance.id,
                'username': getattr(instance, 'username', ''),
                'first_name': getattr(instance, 'first_name', ''),
                'last_name': getattr(instance, 'last_name', ''),
                'email': getattr(instance, 'email', ''),
                'is_active': getattr(instance, 'is_active', False),
                'airport': getattr(getattr(instance, 'profile', None), 'airport', ''),
                'role_title': getattr(getattr(instance, 'profile', None), 'role_title', ''),
                'last_login': getattr(instance, 'last_login', None),
                'date_joined': getattr(instance, 'date_joined', None),
            }

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        username = validated_data.pop('username', None)

        if not username:
            username = f'tmpuser_{uuid.uuid4().hex[:8]}'
            auto_username = True
        else:
            auto_username = False
        validated_data['username'] = username

        if not password:
            # Temporary placeholder — will be replaced with actual ID after creation
            password = None

        user = User.objects.create(**validated_data)

        # Generate password based on user ID: EMP-001, EMP-013, etc.
        if not password:
            password = f"EMP-{str(user.id).zfill(3)}"

        user.set_password(password)
        user.save()

        if auto_username:
            user.username = f'EMP{user.id:04d}'
            user.save()

        UserProfile.objects.update_or_create(user=user, defaults={
            'airport': profile_data.get('airport', ''),
            'role_title': profile_data.get('role_title', ''),
        })

        try:
            from .models_admin import UserPlainPassword
            UserPlainPassword.objects.update_or_create(user=user, defaults={'password': password})
        except Exception:
            pass

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        if password:
            try:
                from .models_admin import UserPlainPassword
                UserPlainPassword.objects.update_or_create(user=instance, defaults={'password': password})
            except Exception:
                pass

        UserProfile.objects.update_or_create(user=instance, defaults={
            'airport': profile_data.get('airport', getattr(getattr(instance, 'profile', None), 'airport', '')),
            'role_title': profile_data.get('role_title', getattr(getattr(instance, 'profile', None), 'role_title', '')),
        })

        return instance
