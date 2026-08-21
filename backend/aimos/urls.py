from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('aimos.apps.users.urls')),
    path('api/equipment/', include('aimos.apps.equipment.urls')),
    path('api/sensors/', include('aimos.apps.sensors.urls')),
    path('api/interventions/', include('aimos.apps.interventions.urls')),
    path('api/alerts/', include('aimos.apps.alerts.urls')),
    path('api/activity/', include('aimos.apps.activity.urls')),
    path('api/ai/', include('aimos.apps.ai.urls')),
    path('api/dashboard/', include('aimos.apps.dashboard.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
