"""
Dashboard aggregate endpoint.
Returns all KPIs and chart data needed by the operational dashboard.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone
from datetime import timedelta

from aimos.apps.equipment.models import Equipment, EquipmentCategory
from aimos.apps.interventions.models import Intervention
from aimos.apps.alerts.models import Alert
from aimos.apps.sensors.models import Sensor


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """
    Aggregated stats for the operational dashboard.
    Returns: KPIs, monthly interventions, equipment by category,
    alerts trend (30 days), interventions by priority, equipment health.
    """
    now = timezone.now()

    # --- KPI Cards ---
    total_equipment = Equipment.objects.count()
    operational_equipment = Equipment.objects.filter(status='operational').count()
    active_interventions = Intervention.objects.filter(
        status__in=['assigned', 'in_progress']
    ).count()
    critical_alerts = Alert.objects.filter(level='critical', status='active').count()

    # Availability percentage
    availability = round((operational_equipment / total_equipment * 100), 1) if total_equipment > 0 else 0

    # --- Monthly Interventions (last 12 months) ---
    twelve_months_ago = now - timedelta(days=365)
    monthly_raw = (
        Intervention.objects.filter(created_at__gte=twelve_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month', 'intervention_type')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Organize by month
    monthly_data = {}
    for entry in monthly_raw:
        month_key = entry['month'].strftime('%b')
        if month_key not in monthly_data:
            monthly_data[month_key] = {'month': month_key, 'preventive': 0, 'corrective': 0, 'total': 0}
        monthly_data[month_key][entry['intervention_type']] = entry['count']
        monthly_data[month_key]['total'] += entry['count']

    monthly_interventions = list(monthly_data.values())

    # --- Equipment by Category ---
    equipment_by_category = list(
        EquipmentCategory.objects.annotate(value=Count('equipment'))
        .filter(value__gt=0)
        .values('name', 'value')
        .order_by('-value')
    )

    # Assign colors
    colors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#6366f1', '#14b8a6']
    for i, cat in enumerate(equipment_by_category):
        cat['color'] = colors[i % len(colors)]

    # --- Alerts Trend (last 30 days, grouped by ~5 day intervals) ---
    thirty_days_ago = now - timedelta(days=30)
    alerts_daily = (
        Alert.objects.filter(created_at__gte=thirty_days_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date', 'level')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    alerts_by_day = {}
    for entry in alerts_daily:
        day_key = entry['date'].strftime('%d')
        if day_key not in alerts_by_day:
            alerts_by_day[day_key] = {'day': day_key, 'critical': 0, 'warning': 0, 'info': 0}
        alerts_by_day[day_key][entry['level']] = entry['count']

    alerts_trend = list(alerts_by_day.values())

    # --- Interventions by Priority ---
    priority_colors = {
        'critical': '#dc2626',
        'high': '#ea580c',
        'medium': '#d97706',
        'low': '#16a34a',
    }
    priority_labels = {
        'critical': 'Critique',
        'high': 'Haute',
        'medium': 'Moyenne',
        'low': 'Basse',
    }
    interventions_by_priority = []
    for priority_key, label in priority_labels.items():
        count = Intervention.objects.filter(priority=priority_key).count()
        if count > 0:
            interventions_by_priority.append({
                'priority': label,
                'count': count,
                'color': priority_colors[priority_key],
            })

    # --- Equipment Health ---
    under_maintenance = Equipment.objects.filter(status='under_maintenance').count()
    out_of_service = Equipment.objects.filter(status='out_of_service').count()

    equipment_health = [
        {'name': 'Opérationnel', 'value': round(operational_equipment / total_equipment * 100) if total_equipment > 0 else 0, 'fill': '#16a34a'},
        {'name': 'Dégradé', 'value': round(under_maintenance / total_equipment * 100) if total_equipment > 0 else 0, 'fill': '#d97706'},
        {'name': 'En panne', 'value': round(out_of_service / total_equipment * 100) if total_equipment > 0 else 0, 'fill': '#dc2626'},
    ]

    # --- AI Predictions (real predictions from the AI engine) ---
    from aimos.apps.ai.prediction_engine import predict_all
    try:
        all_predictions = predict_all()
        ai_predictions = []
        for pred in all_predictions[:4]:
            if pred['risk_score'] > 30:
                ai_predictions.append({
                    'equipment': pred['equipment_name'],
                    'risk': pred['risk_score'],
                    'deadline': pred['rul_display'],
                })
    except Exception:
        ai_predictions = []

    return Response({
        # KPIs
        'total_equipment': total_equipment,
        'active_interventions': active_interventions,
        'critical_alerts': critical_alerts,
        'availability': availability,
        # Charts
        'monthly_interventions': monthly_interventions,
        'equipment_by_category': equipment_by_category,
        'alerts_trend': alerts_trend,
        'interventions_by_priority': interventions_by_priority,
        'equipment_health': equipment_health,
        'ai_predictions': ai_predictions,
    })
