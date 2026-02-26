from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .json_storage import JSONStorage


def index(request):
    """Главная страница с редактором карт"""
    return render(request, 'index.html')


@csrf_exempt
@require_http_methods(["GET"])
def get_maps(request):
    """Получить список всех карт"""
    maps = JSONStorage.get_all_maps()
    return JsonResponse(maps, safe=False)


@csrf_exempt
@require_http_methods(["GET"])
def get_map(request, map_id):
    """Получить конкретную карту"""
    map_data = JSONStorage.get_map(map_id)
    if not map_data:
        return JsonResponse({'error': 'Map not found'}, status=404)
    return JsonResponse(map_data)


@csrf_exempt
@require_http_methods(["POST"])
def create_map(request):
    """Создать новую карту"""
    try:
        data = json.loads(request.body)
        name = data.get('name')
        map_data = data.get('data')
        duration_days = data.get('duration_days', 10)
        
        if not name or not map_data:
            return JsonResponse({'error': 'Name and data are required'}, status=400)
        
        map_id = JSONStorage.create_map(name, map_data, duration_days)
        return JsonResponse({'id': map_id, 'name': name})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT"])
def update_map(request, map_id):
    """Обновить карту"""
    try:
        data = json.loads(request.body)
        
        update_fields = {}
        if 'name' in data:
            update_fields['name'] = data['name']
        if 'data' in data:
            update_fields['data'] = data['data']
        if 'duration_days' in data:
            update_fields['duration_days'] = data['duration_days']
        if 'start_time' in data:
            update_fields['start_time'] = data['start_time']
        if 'is_running' in data:
            update_fields['is_running'] = data['is_running']
        
        success = JSONStorage.update_map(map_id, **update_fields)
        
        if not success:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_map(request, map_id):
    """Удалить карту"""
    try:
        success = JSONStorage.delete_map(map_id)
        
        if not success:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
