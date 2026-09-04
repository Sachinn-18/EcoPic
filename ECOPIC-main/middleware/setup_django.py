#!/usr/bin/env python3

import os
import subprocess
import sys

def run(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"Error running command: {cmd}")
        sys.exit(1)

def main():
    print("📦 Setting up Django middleware project...")

    # Step 1: Create Django project
    run("django-admin startproject releaf_middleware")

    # Step 2: Create 'points' app
    run("python releaf_middleware/manage.py startapp points")

    print("✅ Django middleware created successfully!")
    print()
    print("Next steps:")
    print("1. Move points_view.py → middleware/points/views.py")
    print("2. Move urls.py → middleware/points/urls.py")
    print("3. Add 'points' + DRF to INSTALLED_APPS")
    print("4. Add include('points.urls') in main urls.py")
    print("5. Run: python manage.py runserver 8000")

if __name__ == "__main__":
    main()
