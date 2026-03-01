from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .storage import MapStorage
from .game_logic import GameLogic
from .auth_storage import AuthStorage


def get_user_from_request(request):
    """Get user from Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        return AuthStorage.get_user_by_token(token)
    return None


def require_auth(view_func):
    """Decorator to require authentication"""
    def wrapper(request, *args, **kwargs):
        user = get_user_from_request(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        request.user_data = user
        return view_func(request, *args, **kwargs)
    return wrapper


def index(request):
    """Main page with map editor"""
    return render(request, 'index.html')


def login_page(request):
    """Login page"""
    return render(request, 'login.html')


def register_page(request):
    """Register page"""
    return render(request, 'register.html')


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """Register new user"""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return JsonResponse({'error': 'Имя пользователя и пароль обязательны'}, status=400)
        
        if len(username) < 3:
            return JsonResponse({'error': 'Имя пользователя должно быть минимум 3 символа'}, status=400)
        
        if len(password) < 4:
            return JsonResponse({'error': 'Пароль должен быть минимум 4 символа'}, status=400)
        
        user, error = AuthStorage.register(username, password)
        
        if error:
            return JsonResponse({'error': error}, status=400)
        
        return JsonResponse({
            'user_id': user['id'],
            'username': user['username'],
            'token': user['token']
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    """Login user"""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return JsonResponse({'error': 'Имя пользователя и пароль обязательны'}, status=400)
        
        user, error = AuthStorage.login(username, password)
        
        if error:
            return JsonResponse({'error': error}, status=401)
        
        return JsonResponse({
            'user_id': user['id'],
            'username': user['username'],
            'token': user['token'],
            'active_map_id': user.get('active_map_id')
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_active_map(request):
    """Get user's active map ID"""
    user = request.user_data
    active_map_id = AuthStorage.get_active_map(user['id'])
    return JsonResponse({'active_map_id': active_map_id})


@csrf_exempt
@require_http_methods(["POST"])
@require_auth
def set_active_map(request):
    """Set user's active map ID"""
    try:
        user = request.user_data
        data = json.loads(request.body)
        map_id = data.get('map_id')
        
        success = AuthStorage.set_active_map(user['id'], map_id)
        
        if not success:
            return JsonResponse({'error': 'Failed to set active map'}, status=500)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_maps(request):
    """Get list of all maps for current user"""
    user = request.user_data
    maps = MapStorage.get_all_maps(user_id=user['id'])
    return JsonResponse(maps, safe=False)


@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_map(request, map_id):
    """Get specific map"""
    user = request.user_data
    map_data = MapStorage.get_map(map_id)
    if not map_data:
        return JsonResponse({'error': 'Map not found'}, status=404)
    
    # Check if map belongs to user
    if map_data.get('user_id') != user['id']:
        return JsonResponse({'error': 'Access denied'}, status=403)
    
    return JsonResponse(map_data)


@csrf_exempt
@require_http_methods(["POST"])
@require_auth
def create_map(request):
    """Create new map"""
    try:
        user = request.user_data
        data = json.loads(request.body)
        name = data.get('name')
        map_data = data.get('data', {'points': [], 'connections': []})
        
        if not name:
            return JsonResponse({'error': 'Name is required'}, status=400)
        
        map_id = MapStorage.create_map(name, map_data, user['id'])
        
        # Set as active map
        AuthStorage.set_active_map(user['id'], map_id)
        
        return JsonResponse({'id': map_id, 'name': name})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT"])
@require_auth
def update_map(request, map_id):
    """Update map"""
    try:
        user = request.user_data
        
        # Check if map belongs to user
        map_data = MapStorage.get_map(map_id)
        if not map_data:
            return JsonResponse({'error': 'Map not found'}, status=404)
        if map_data.get('user_id') != user['id']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
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
@require_auth
def delete_map(request, map_id):
    """Delete map"""
    try:
        user = request.user_data
        
        # Check if map belongs to user
        map_data = MapStorage.get_map(map_id)
        if not map_data:
            return JsonResponse({'error': 'Map not found'}, status=404)
        if map_data.get('user_id') != user['id']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
        success = MapStorage.delete_map(map_id)
        
        if not success:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        # Clear active map if it was deleted
        if AuthStorage.get_active_map(user['id']) == map_id:
            AuthStorage.set_active_map(user['id'], None)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



@csrf_exempt
@require_http_methods(["POST"])
@require_auth
def expand_territories(request, map_id):
    """Expand territories based on game logic"""
    try:
        user = request.user_data
        
        map_data = MapStorage.get_map(map_id)
        if not map_data:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        # Check if map belongs to user
        if map_data.get('user_id') != user['id']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
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
@require_auth
def resolve_battles(request, map_id):
    """Resolve battle results"""
    try:
        user = request.user_data
        data = json.loads(request.body)
        battle_results = data.get('battle_results', {})
        
        print(f"\n=== RESOLVE BATTLES ENDPOINT CALLED ===")
        print(f"Map ID: {map_id}")
        print(f"Battle results: {battle_results}")
        
        map_data = MapStorage.get_map(map_id)
        if not map_data:
            return JsonResponse({'error': 'Map not found'}, status=404)
        
        # Check if map belongs to user
        if map_data.get('user_id') != user['id']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
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
