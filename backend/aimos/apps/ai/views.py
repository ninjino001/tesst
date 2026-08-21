from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .prediction_engine import predict_all, predict_for_sensor
from aimos.apps.sensors.models import Sensor


@api_view(['GET'])
@permission_classes([AllowAny])
def predictions_list(request):
    """
    Get AI predictions for all active sensors.
    Returns predictions sorted by risk score (highest first).
    
    Query params:
      - min_risk: minimum risk score to include (default: 0)
      - equipment: filter by equipment reference
      - limit: max results (default: 20)
    """
    predictions = predict_all()

    # Filters
    min_risk = int(request.query_params.get('min_risk', 0))
    equipment_ref = request.query_params.get('equipment')
    limit = int(request.query_params.get('limit', 20))

    if min_risk > 0:
        predictions = [p for p in predictions if p['risk_score'] >= min_risk]

    if equipment_ref:
        predictions = [p for p in predictions if p['equipment_reference'] == equipment_ref]

    # Summary stats
    total = len(predictions)
    critical_count = len([p for p in predictions if p['risk_level'] == 'critical'])
    high_count = len([p for p in predictions if p['risk_level'] == 'high'])
    warning_count = len([p for p in predictions if p['risk_level'] == 'warning'])
    normal_count = len([p for p in predictions if p['risk_level'] == 'normal'])

    # Apply limit
    predictions = predictions[:limit]

    return Response({
        'summary': {
            'total_analyzed': total,
            'critical': critical_count,
            'high': high_count,
            'warning': warning_count,
            'normal': normal_count,
        },
        'predictions': predictions,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def prediction_detail(request, sensor_id):
    """
    Get detailed AI prediction for a specific sensor.
    """
    try:
        sensor = Sensor.objects.select_related('equipment').get(pk=sensor_id)
    except Sensor.DoesNotExist:
        return Response({'error': 'Sensor not found'}, status=404)

    result = predict_for_sensor(sensor)
    if result is None:
        return Response({
            'error': 'Insufficient data',
            'message': f'Need at least 30 readings in the last 48h. Sensor has fewer data points.',
            'sensor_name': sensor.name,
            'equipment_name': sensor.equipment.name,
        }, status=200)

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def predictions_dashboard(request):
    """
    Lightweight predictions for the dashboard (top 4 highest risk).
    Returns simplified data for the dashboard widget.
    """
    predictions = predict_all()

    # Only include sensors with risk > 30
    at_risk = [p for p in predictions if p['risk_score'] > 30][:4]

    dashboard_data = []
    for pred in at_risk:
        dashboard_data.append({
            'equipment': pred['equipment_name'],
            'sensor': pred['sensor_name'],
            'risk': pred['risk_score'],
            'deadline': pred['rul_display'],
            'risk_level': pred['risk_level'],
            'recommendation': pred['recommendation'],
        })

    return Response(dashboard_data)
