from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import Sensor, SensorReading
from .serializers import SensorSerializer, SensorReadingSerializer, SensorReadingCompactSerializer


class SensorListView(generics.ListCreateAPIView):
    """List all sensors or filter by equipment."""
    queryset = Sensor.objects.select_related('equipment').order_by('reference')
    serializer_class = SensorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        equipment = self.request.query_params.get('equipment')
        equipment_ref = self.request.query_params.get('equipment_ref')
        sensor_type = self.request.query_params.get('type')

        if equipment:
            qs = qs.filter(equipment_id=equipment)
        if equipment_ref:
            qs = qs.filter(equipment__reference=equipment_ref)
        if sensor_type:
            qs = qs.filter(sensor_type=sensor_type)
        return qs

    def perform_create(self, serializer):
        """When a sensor is manually created, generate 72h of simulated data."""
        sensor = serializer.save()

        # Log activity
        from aimos.apps.activity.utils import log_activity
        user = self.request.user if self.request.user.is_authenticated else None
        log_activity(user, 'sensor_created', f"A ajouté le capteur {sensor.name} sur {sensor.equipment.name}", 'sensor', sensor.reference)

        # Generate simulated data for this sensor (72h)
        try:
            from .data_generator import generate_readings_for_sensor
            generate_readings_for_sensor(sensor, hours=72)
        except Exception as e:
            pass  # Don't block sensor creation if data generation fails


class SensorDetailView(generics.RetrieveUpdateAPIView):
    queryset = Sensor.objects.select_related('equipment')
    serializer_class = SensorSerializer
    permission_classes = [permissions.AllowAny]


class SensorReadingsView(generics.ListCreateAPIView):
    """Get readings for a specific sensor, or POST new readings."""
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            from .serializers import SensorReadingSerializer
            return SensorReadingSerializer
        return SensorReadingCompactSerializer

    def get_queryset(self):
        sensor_id = self.kwargs['sensor_id']
        qs = SensorReading.objects.filter(sensor_id=sensor_id)

        # Time range filter
        hours = self.request.query_params.get('hours')
        days = self.request.query_params.get('days')
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')

        if hours:
            since = timezone.now() - timedelta(hours=int(hours))
            qs = qs.filter(timestamp__gte=since)
        elif days:
            since = timezone.now() - timedelta(days=int(days))
            qs = qs.filter(timestamp__gte=since)
        elif start:
            qs = qs.filter(timestamp__gte=start)
            if end:
                qs = qs.filter(timestamp__lte=end)
        else:
            # Default: last 24 hours
            since = timezone.now() - timedelta(hours=24)
            qs = qs.filter(timestamp__gte=since)

        return qs.order_by('timestamp')

    def perform_create(self, serializer):
        """Auto-set sensor from URL, update last_value, check thresholds, create alerts & notifications."""
        sensor_id = self.kwargs['sensor_id']
        sensor = Sensor.objects.select_related('equipment').get(pk=sensor_id)
        reading = serializer.save(sensor=sensor)

        # Update sensor last value
        sensor.last_value = reading.value
        sensor.last_reading_at = reading.timestamp
        sensor.save(update_fields=['last_value', 'last_reading_at'])

        # --- Threshold detection ---
        value = reading.value
        if value >= sensor.critical_threshold:
            self._create_alert_and_notify(sensor, value, 'critical')
        elif value >= sensor.alert_threshold:
            self._create_alert_and_notify(sensor, value, 'warning')

    def _create_alert_and_notify(self, sensor, value, level):
        """Create an alert and send notifications to maintenance managers."""
        from aimos.apps.alerts.models import Alert, Notification
        from aimos.apps.users.models import UserProfile
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Avoid duplicate alerts: don't create if there's already an active alert
        # for this sensor in the last hour
        recent_alert = Alert.objects.filter(
            sensor=sensor,
            level=level,
            status='active',
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).exists()

        if recent_alert:
            return  # Skip duplicate

        # Determine threshold and message
        threshold = sensor.critical_threshold if level == 'critical' else sensor.alert_threshold
        if level == 'critical':
            message = f"CRITIQUE : {sensor.name} ({sensor.equipment.name}) a atteint {value}{sensor.unit} — seuil critique {threshold}{sensor.unit} dépassé"
        else:
            message = f"ALERTE : {sensor.name} ({sensor.equipment.name}) a atteint {value}{sensor.unit} — seuil {threshold}{sensor.unit} dépassé"

        # Create alert
        alert = Alert(
            equipment=sensor.equipment,
            sensor=sensor,
            level=level,
            status='active',
            message=message,
            measured_value=value,
            threshold_value=threshold,
            unit=sensor.unit,
        )
        alert.save()

        # Log activity
        from aimos.apps.activity.utils import log_activity
        log_activity(None, 'alert_triggered', message, 'alert', alert.reference)

        # Send notifications to all "Responsable maintenance" users
        # Find users with role "Responsable maintenance"
        maintenance_managers = User.objects.filter(
            is_active=True,
            profile__role_title='Responsable maintenance',
        )

        # Fallback: if no profile filter works, notify all staff
        if not maintenance_managers.exists():
            maintenance_managers = User.objects.filter(is_active=True, is_staff=True)

        notification_type = 'alert_critical' if level == 'critical' else 'alert_warning'
        title = f"[{level.upper()}] {sensor.equipment.name} — {sensor.get_sensor_type_display()}"

        for user in maintenance_managers:
            Notification.objects.create(
                recipient=user,
                alert=alert,
                notification_type=notification_type,
                title=title,
                message=message,
            )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def sensor_latest_values(request, equipment_ref):
    """Get latest reading for all sensors of an equipment (for the detail page indicators)."""
    sensors = Sensor.objects.filter(
        equipment__reference=equipment_ref, status='active'
    ).order_by('sensor_type')

    result = []
    for sensor in sensors:
        result.append({
            'id': sensor.id,
            'reference': sensor.reference,
            'name': sensor.name,
            'type': sensor.sensor_type,
            'unit': sensor.unit,
            'value': sensor.last_value,
            'last_reading_at': sensor.last_reading_at,
            'min_normal': sensor.min_normal,
            'max_normal': sensor.max_normal,
            'is_alert': sensor.is_alert,
            'is_critical': sensor.is_critical,
            'status': 'Normal' if not sensor.is_alert else ('Critical' if sensor.is_critical else 'Warning'),
        })

    return Response(result)
