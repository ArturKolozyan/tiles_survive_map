import json
import os
from datetime import datetime
from pathlib import Path

STORAGE_DIR = Path('map_data')
STORAGE_DIR.mkdir(exist_ok=True)


class MapStorage:
    """JSON storage for battle maps"""
    
    @staticmethod
    def get_all_maps():
        """Get list of all maps"""
        maps = []
        for file in STORAGE_DIR.glob('map_*.json'):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    maps.append({
                        'id': data['id'],
                        'name': data['name'],
                        'is_running': data.get('is_running', False),
                        'created_at': data['created_at'],
                        'updated_at': data['updated_at']
                    })
            except Exception as e:
                print(f"Error reading {file}: {e}")
        
        maps.sort(key=lambda x: x['updated_at'], reverse=True)
        return maps
    
    @staticmethod
    def get_map(map_id):
        """Get map by ID"""
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        if not file_path.exists():
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def create_map(name, data):
        """Create new map"""
        map_id = int(datetime.now().timestamp() * 1000)
        
        map_data = {
            'id': map_id,
            'name': name,
            'data': data,
            'duration_days': 10,
            'start_time': None,
            'is_running': False,
            'my_alliance_start_id': None,
            'total_oil': 0,
            'last_oil_update': None,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(map_data, f, ensure_ascii=False, indent=2)
        
        return map_id
    
    @staticmethod
    def update_map(map_id, **kwargs):
        """Update map"""
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        if not file_path.exists():
            return False
        
        with open(file_path, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        
        for key, value in kwargs.items():
            if value is not None or key in ['start_time', 'my_alliance_start_id']:
                map_data[key] = value
        
        map_data['updated_at'] = datetime.now().isoformat()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(map_data, f, ensure_ascii=False, indent=2)
        
        return True
    
    @staticmethod
    def delete_map(map_id):
        """Delete map"""
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        if file_path.exists():
            file_path.unlink()
            return True
        return False
