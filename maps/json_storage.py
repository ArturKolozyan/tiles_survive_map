import json
import os
from datetime import datetime
from pathlib import Path

# Папка для хранения JSON файлов
STORAGE_DIR = Path('map_data')
STORAGE_DIR.mkdir(exist_ok=True)

class JSONStorage:
    """Простое хранилище карт в JSON файлах"""
    
    @staticmethod
    def get_all_maps():
        """Получить список всех карт"""
        maps = []
        for file in STORAGE_DIR.glob('*.json'):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    maps.append({
                        'id': data['id'],
                        'name': data['name'],
                        'created_at': data['created_at'],
                        'updated_at': data['updated_at']
                    })
            except Exception as e:
                print(f"Error reading {file}: {e}")
        
        # Сортируем по дате обновления
        maps.sort(key=lambda x: x['updated_at'], reverse=True)
        return maps
    
    @staticmethod
    def get_map(map_id):
        """Получить карту по ID"""
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        if not file_path.exists():
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def create_map(name, data, duration_days=10):
        """Создать новую карту"""
        # Генерируем ID на основе timestamp
        map_id = int(datetime.now().timestamp() * 1000)
        
        map_data = {
            'id': map_id,
            'name': name,
            'data': data,
            'duration_days': duration_days,
            'start_time': None,
            'is_running': False,
            'total_oil': 0,
            'last_oil_update': None,
            'my_alliance_start_id': None,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(map_data, f, ensure_ascii=False, indent=2)
        
        return map_id
    
    @staticmethod
    def update_map(map_id, **kwargs):
        """Обновить карту"""
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        if not file_path.exists():
            return False
        
        with open(file_path, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        
        # Обновляем поля
        for key, value in kwargs.items():
            if value is not None:
                map_data[key] = value
        
        map_data['updated_at'] = datetime.now().isoformat()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(map_data, f, ensure_ascii=False, indent=2)
        
        return True
    
    @staticmethod
    def delete_map(map_id):
        """Удалить карту"""
        file_path = STORAGE_DIR / f'map_{map_id}.json'
        if file_path.exists():
            file_path.unlink()
            return True
        return False
