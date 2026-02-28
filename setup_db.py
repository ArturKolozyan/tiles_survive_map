#!/usr/bin/env python
"""Setup database and run migrations"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import execute_from_command_line

print("Creating migrations...")
execute_from_command_line(['manage.py', 'makemigrations'])

print("\nApplying migrations...")
execute_from_command_line(['manage.py', 'migrate'])

print("\nDatabase setup complete!")
print("\nYou can now run the server with: python manage.py runserver")
