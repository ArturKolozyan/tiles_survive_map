from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .storage import MapStorage
from .game_logic import GameLogic


def index(request):
    """Main page with map editor"""
    return render(request, 'index.html')


@csrf_exempt
@require_http_methods(["GET"])
def get_maps(request):
    """Get list of all maps"""
    maps = MapStorage.get_all_maps()
    return JsonResponse(maps, safe=False)


@csrf_exempt
@require_http_methods(["GET"])
def get_map(request, map_id):
    """Get specific map"""
    map_data = MapStorage.get_map(map_id)
    if not map_data:
        return JsonResponse({'error': 'Map not found'}, status=404)
    return JsonResponse(map_data)


@csrf_exempt
@require_http_methods(["POST"])
def create_map(request):
    """Create new map"""
    try:
        data = json.loads(request.body)
        name = data.get('name')
        map_data = data.get('data', {'points': [], 'connections': []})
        
        if not name:
            return JsonResponse({'error': 'Name is required'}, status=400)
        
        map_id = MapStorage.create_map(name, map_data)
        return JsonResponse({'id': map_id, 'name': name})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT"])
def update_map(request, map_id):
    """Update map"""
    try:
        data = json.loads(request.body)
        
        update_fields = {}
        allowed_fields = [
            'name', 'data', 'duration_days', 'start_time', 'is_running',
            'my_alliance_start_id', 'total_oil', 'last_oil_update'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        success = MapStorage.update_map(map_id, **update_fields)
        
        if not success:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_map(request, map_id):
    """Delete map"""
    try:
        success = MapStorage.delete_map(map_id)
        
        if not success:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



@csrf_exempt
@require_http_methods(["POST"])
def expand_territories(request, map_id):
    """Expand territories based on game logic"""
    try:
        map_data = MapStorage.get_map(map_id)
        if not map_data:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        if not map_data.get('is_running'):
            return JsonResponse({'error': 'Map is not running'}, status=400)
        
        current_day = GameLogic.get_current_day(map_data.get('start_time'))
        
        points = map_data['data'].get('points', [])
        connections = map_data['data'].get('connections', [])
        my_alliance_start_id = map_data.get('my_alliance_start_id')
        
        print(f"\n=== EXPAND ENDPOINT CALLED ===")
        print(f"Map ID: {map_id}")
        print(f"Current day: {current_day}")
        
        # Check if there are existing blue points that need resolution
        existing_battles = []
        for i, point in enumerate(points):
            if point.get('color') == 'blue':
                existing_battles.append({
                    'index': i,
                    'name': point.get('name'),
                    'oil': point.get('oil', 0)
                })
        
        if existing_battles:
            print(f"Found {len(existing_battles)} existing blue points - need resolution first")
            return JsonResponse({
                'success': True,
                'current_day': current_day,
                'points': points,
                'battle_points': existing_battles,
                'message': 'resolve_required'
            })
        
        # No battles - expand territories
        updated_points = GameLogic.expand_territories(
            points, connections, my_alliance_start_id, current_day
        )
        
        # Count new blue points
        new_battles = []
        for i, point in enumerate(updated_points):
            if point.get('color') == 'blue':
                new_battles.append({
                    'index': i,
                    'name': point.get('name'),
                    'oil': point.get('oil', 0)
                })
        
        map_data['data']['points'] = updated_points
        MapStorage.update_map(map_id, data=map_data['data'])
        
        return JsonResponse({
            'success': True,
            'current_day': current_day,
            'points': updated_points,
            'battle_points': new_battles,
            'message': 'expanded'
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def resolve_battles(request, map_id):
    """Resolve battle results"""
    try:
        data = json.loads(request.body)
        battle_results = data.get('battle_results', {})
        
        print(f"\n=== RESOLVE BATTLES ENDPOINT CALLED ===")
        print(f"Map ID: {map_id}")
        print(f"Battle results: {battle_results}")
        
        map_data = MapStorage.get_map(map_id)
        if not map_data:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        points = map_data['data'].get('points', [])
        connections = map_data['data'].get('connections', [])
        
        updated_points = GameLogic.resolve_battles(
            points, connections, battle_results
        )
        
        map_data['data']['points'] = updated_points
        MapStorage.update_map(map_id, data=map_data['data'])
        
        return JsonResponse({
            'success': True,
            'points': updated_points
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)
