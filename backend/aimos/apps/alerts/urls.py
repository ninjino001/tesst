from django.urls import path

from . import views

urlpatterns = [
    path('', views.AlertListCreateView.as_view(), name='alert-list-create'),
    path('stats/', views.alert_stats, name='alert-stats'),
    path('notifications/', views.notification_list, name='notification-list'),
    path('notifications/mark-read/', views.mark_notifications_read, name='notification-mark-read'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='notification-mark-all-read'),
    path('<str:reference>/', views.AlertDetailView.as_view(), name='alert-detail'),
    path('<str:reference>/acknowledge/', views.acknowledge_alert, name='alert-acknowledge'),
    path('<str:reference>/resolve/', views.resolve_alert, name='alert-resolve'),
]
