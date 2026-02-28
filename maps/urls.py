from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/maps/', views.get_maps, name='get_maps'),
    path('api/maps/create/', views.create_map, name='create_map'),
    path('api/maps/<int:map_id>/', views.get_map, name='get_map'),
    path('api/maps/<int:map_id>/update/', views.update_map, name='update_map'),
    path('api/maps/<int:map_id>/delete/', views.delete_map, name='delete_map'),
    path('api/maps/<int:map_id>/expand/', views.expand_territories, name='expand_territories'),
    path('api/maps/<int:map_id>/resolve/', views.resolve_battles, name='resolve_battles'),
]
