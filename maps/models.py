from django.db import models
import secrets
import string


def generate_map_code():
    """Generate unique 6-character code for map"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def generate_admin_token():
    """Generate unique admin token"""
    return secrets.token_urlsafe(32)


class Admin(models.Model):
    """Admin user who can create and manage maps"""
    username = models.CharField(max_length=100, unique=True)
    token = models.CharField(max_length=64, unique=True, default=generate_admin_token)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.username


class Map(models.Model):
    """Battle map"""
    admin = models.ForeignKey(Admin, on_delete=models.CASCADE, related_name='maps')
    code = models.CharField(max_length=6, unique=True, default=generate_map_code)
    name = models.CharField(max_length=200)
    data = models.JSONField(default=dict)
    duration_days = models.IntegerField(default=10)
    start_time = models.DateTimeField(null=True, blank=True)
    is_running = models.BooleanField(default=False)
    my_alliance_start_id = models.IntegerField(null=True, blank=True)
    total_oil = models.IntegerField(default=0)
    last_oil_update = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
