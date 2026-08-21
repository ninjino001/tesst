from django.db import models


class Sensor(models.Model):
    """A sensor attached to an equipment. Measures one type of physical quantity."""

    SENSOR_TYPES = [
        ('temperature', 'Temperature (°C)'),
        ('humidity', 'Humidity (%)'),
        ('vibration', 'Vibration (mm/s)'),
        ('pressure', 'Pressure (bar)'),
        ('power', 'Power Consumption (kW)'),
        ('airflow', 'Air Flow (m³/h)'),
        ('voltage', 'Voltage (V)'),
        ('current', 'Current (A)'),
        ('runtime', 'Runtime (h)'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('faulty', 'Faulty'),
    ]

    # Identification
    reference = models.CharField(max_length=30, unique=True)  # SENS-T-001
    name = models.CharField(max_length=200)
    sensor_type = models.CharField(max_length=20, choices=SENSOR_TYPES)

    # Link to equipment
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.CASCADE, related_name='sensors'
    )

    # Connection configuration (how to reach the physical sensor)
    PROTOCOL_CHOICES = [
        ('modbus_tcp', 'Modbus TCP'),
        ('mqtt', 'MQTT'),
        ('opcua', 'OPC-UA'),
        ('http', 'HTTP API'),
    ]
    protocol = models.CharField(max_length=15, choices=PROTOCOL_CHOICES, default='modbus_tcp')
    host = models.CharField(max_length=100, blank=True, help_text='IP or hostname (e.g., 192.168.1.50)')
    port = models.PositiveIntegerField(null=True, blank=True, help_text='Port number (e.g., 502)')
    register = models.CharField(max_length=200, blank=True, help_text='Register address or MQTT topic (e.g., 40001 or hvac/temp)')

    # Configuration
    unit = models.CharField(max_length=20)  # °C, %, mm/s, bar, kW, etc.
    min_normal = models.FloatField(help_text='Minimum normal value')
    max_normal = models.FloatField(help_text='Maximum normal value')
    alert_threshold = models.FloatField(help_text='Value that triggers an alert')
    critical_threshold = models.FloatField(help_text='Value that triggers a critical alert')

    # Status
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    last_value = models.FloatField(null=True, blank=True)
    last_reading_at = models.DateTimeField(null=True, blank=True)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['equipment', 'sensor_type']

    def __str__(self):
        return f"{self.reference} – {self.name} ({self.get_sensor_type_display()})"

    @property
    def is_alert(self):
        """Check if last value exceeds alert threshold."""
        if self.last_value is None:
            return False
        return self.last_value >= self.alert_threshold

    @property
    def is_critical(self):
        """Check if last value exceeds critical threshold."""
        if self.last_value is None:
            return False
        return self.last_value >= self.critical_threshold


class SensorReading(models.Model):
    """A single timestamped measurement from a sensor."""

    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='readings')
    value = models.FloatField()
    timestamp = models.DateTimeField(db_index=True)

    # Optional: anomaly flag set by the IA module
    is_anomaly = models.BooleanField(default=False)
    anomaly_score = models.FloatField(null=True, blank=True)  # 0.0 to 1.0

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['sensor', '-timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.sensor.reference}: {self.value} {self.sensor.unit} @ {self.timestamp}"
