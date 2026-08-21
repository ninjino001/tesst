from django.urls import path
from . import views

urlpatterns = [
    path('predictions/', views.predictions_list, name='ai-predictions'),
    path('predictions/dashboard/', views.predictions_dashboard, name='ai-predictions-dashboard'),
    path('predictions/<int:sensor_id>/', views.prediction_detail, name='ai-prediction-detail'),
]
