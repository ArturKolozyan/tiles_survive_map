import json
import hashlib
import secrets
from pathlib import Path
from datetime import datetime

USERS_FILE = Path('map_data/users.json')
USERS_FILE.parent.mkdir(exist_ok=True)


class AuthStorage:
    """JSON storage for users"""
    
    @staticmethod
    def _load_users():
        """Load users from JSON file"""
        if not USERS_FILE.exists():
            return {}
        
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def _save_users(users):
        """Save users to JSON file"""
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    def _hash_password(password):
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def _generate_token():
        """Generate unique token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def register(username, password):
        """Register new user"""
        users = AuthStorage._load_users()
        
        # Check if user exists
        if username in users:
            return None, "Пользователь с таким именем уже существует"
        
        # Create user
        user_id = int(datetime.now().timestamp() * 1000)
        token = AuthStorage._generate_token()
        
        users[username] = {
            'id': user_id,
            'username': username,
            'password': AuthStorage._hash_password(password),
            'token': token,
            'active_map_id': None,
            'created_at': datetime.now().isoformat()
        }
        
        AuthStorage._save_users(users)
        
        return {
            'id': user_id,
            'username': username,
            'token': token,
            'active_map_id': None
        }, None
    
    @staticmethod
    def login(username, password):
        """Login user"""
        users = AuthStorage._load_users()
        
        # Check if user exists
        if username not in users:
            return None, "Неверное имя пользователя или пароль"
        
        user = users[username]
        
        # Check password
        if user['password'] != AuthStorage._hash_password(password):
            return None, "Неверное имя пользователя или пароль"
        
        return {
            'id': user['id'],
            'username': user['username'],
            'token': user['token'],
            'active_map_id': user.get('active_map_id')
        }, None
    
    @staticmethod
    def get_user_by_token(token):
        """Get user by token"""
        users = AuthStorage._load_users()
        
        for username, user in users.items():
            if user['token'] == token:
                return {
                    'id': user['id'],
                    'username': user['username'],
                    'token': user['token'],
                    'active_map_id': user.get('active_map_id')
                }
        
        return None
    
    @staticmethod
    def set_active_map(user_id, map_id):
        """Set active map for user"""
        users = AuthStorage._load_users()
        
        for username, user in users.items():
            if user['id'] == user_id:
                user['active_map_id'] = map_id
                AuthStorage._save_users(users)
                return True
        
        return False
    
    @staticmethod
    def get_active_map(user_id):
        """Get active map for user"""
        users = AuthStorage._load_users()
        
        for username, user in users.items():
            if user['id'] == user_id:
                return user.get('active_map_id')
        
        return None
