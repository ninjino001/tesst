from django.urls import path
from . import views

urlpatterns = [
    path('', views.SensorListView.as_view(), name='sensor-list'),
    path('<int:pk>/', views.SensorDetailView.as_view(), name='sensor-detail'),
    path('<int:sensor_id>/readings/', views.SensorReadingsView.as_view(), name='sensor-readings'),
    path('equipment/<str:equipment_ref>/latest/', views.sensor_latest_values, name='sensor-latest'),
]
