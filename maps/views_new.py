from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .models import Admin, Map


def auth_page(request):
    """Auth page"""
    return render(request, 'auth.html')


def index(request):
    """Main page"""
    return render(request, 'index.html')


@csrf_exempt
@require_http_methods(["POST"])
def admin_register(request):
    """Register new admin"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        
        if not username:
            return JsonResponse({'error': 'Username is required'}, status=400)
        
        if Admin.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        admin = Admin.objects.create(username=username)
        
        return JsonResponse({
            'success': True,
            'token': admin.token,
            'username': admin.username
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def admin_login(request):
    """Login admin by token"""
    try:
        data = json.loads(request.body)
        token = data.get('token')
        
        if not token:
            return JsonResponse({'error': 'Token is required'}, status=400)
        
        try:
            admin = Admin.objects.get(token=token)
            return JsonResponse({
                'success': True,
                'username': admin.username
            })
        except Admin.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_maps(request):
    """Get list of admin's maps"""
    token = request.headers.get('Authorization')
    
    if not token:
        return JsonResponse({'error': 'Authorization required'}, status=401)
    
    try:
        admin = Admin.objects.get(token=token)
        maps = admin.maps.all().order_by('-updated_at')
        
        return JsonResponse([{
            'id': m.id,
            'code': m.code,
            'name': m.name,
            'is_running': m.is_running,
            'created_at': m.created_at.isoformat(),
            'updated_at': m.updated_at.isoformat()
        } for m in maps], safe=False)
    except Admin.DoesNotExist:
        return JsonResponse({'error': 'Invalid token'}, status=401)


@csrf_exempt
@require_http_methods(["GET"])
def get_map(request, code):
    """Get map by code (for viewers)"""
    try:
        map_obj = Map.objects.get(code=code)
        
        return JsonResponse({
            'id': map_obj.id,
            'code': map_obj.code,
            'name': map_obj.name,
            'data': map_obj.data,
            'duration_days': map_obj.duration_days,
            'start_time': map_obj.start_time.isoformat() if map_obj.start_time else None,
            'is_running': map_obj.is_running,
            'my_alliance_start_id': map_obj.my_alliance_start_id,
            'total_oil': map_obj.total_oil,
            'last_oil_update': map_obj.last_oil_update.isoformat() if map_obj.last_oil_update else None,
            'created_at': map_obj.created_at.isoformat(),
            'updated_at': map_obj.updated_at.isoformat()
        })
    except Map.DoesNotExist:
        return JsonResponse({'error': 'Map not found'}, status=404)


@csrf_exempt
@require_http_methods(["GET"])
def get_map_by_id(request, map_id):
    """Get map by ID (for admin)"""
    token = request.headers.get('Authorization')
    
    if not token:
        return JsonResponse({'error': 'Authorization required'}, status=401)
    
    try:
        admin = Admin.objects.get(token=token)
        map_obj = Map.objects.get(id=map_id, admin=admin)
        
        return JsonResponse({
            'id': map_obj.id,
            'code': map_obj.code,
            'name': map_obj.name,
            'data': map_obj.data,
            'duration_days': map_obj.duration_days,
            'start_time': map_obj.start_time.isoformat() if map_obj.start_time else None,
            'is_running': map_obj.is_running,
            'my_alliance_start_id': map_obj.my_alliance_start_id,
            'total_oil': map_obj.total_oil,
            'last_oil_update': map_obj.last_oil_update.isoformat() if map_obj.last_oil_update else None,
            'created_at': map_obj.created_at.isoformat(),
            'updated_at': map_obj.updated_at.isoformat()
        })
    except Admin.DoesNotExist:
        return JsonResponse({'error': 'Invalid token'}, status=401)
    except Map.DoesNotExist:
        return JsonResponse({'error': 'Map not found'}, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def create_map(request):
    """Create new map"""
    token = request.headers.get('Authorization')
    
    if not token:
        return JsonResponse({'error': 'Authorization required'}, status=401)
    
    try:
        admin = Admin.objects.get(token=token)
        data = json.loads(request.body)
        name = data.get('name')
        map_data = data.get('data', {'points': [], 'connections': []})
        
        if not name:
            return JsonResponse({'error': 'Name is required'}, status=400)
        
        map_obj = Map.objects.create(
            admin=admin,
            name=name,
            data=map_data
        )
        
        return JsonResponse({
            'id': map_obj.id,
            'code': map_obj.code,
            'name': map_obj.name
        })
    except Admin.DoesNotExist:
        return JsonResponse({'error': 'Invalid token'}, status=401)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT"])
def update_map(request, map_id):
    """Update map"""
    token = request.headers.get('Authorization')
    
    if not token:
        return JsonResponse({'error': 'Authorization required'}, status=401)
    
    try:
        admin = Admin.objects.get(token=token)
        map_obj = Map.objects.get(id=map_id, admin=admin)
        data = json.loads(request.body)
        
        allowed_fields = [
            'name', 'data', 'duration_days', 'start_time', 'is_running',
            'my_alliance_start_id', 'total_oil', 'last_oil_update'
        ]
        
        for field in allowed_fields:
            if field in data:
                setattr(map_obj, field, data[field])
        
        map_obj.save()
        
        return JsonResponse({'success': True})
    except Admin.DoesNotExist:
        return JsonResponse({'error': 'Invalid token'}, status=401)
    except Map.DoesNotExist:
        return JsonResponse({'error': 'Map not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_map(request, map_id):
    """Delete map"""
    token = request.headers.get('Authorization')
    
    if not token:
        return JsonResponse({'error': 'Authorization required'}, status=401)
    
    try:
        admin = Admin.objects.get(token=token)
        map_obj = Map.objects.get(id=map_id, admin=admin)
        map_obj.delete()
        
        return JsonResponse({'success': True})
    except Admin.DoesNotExist:
        return JsonResponse({'error': 'Invalid token'}, status=401)
    except Map.DoesNotExist:
        return JsonResponse({'error': 'Map not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
