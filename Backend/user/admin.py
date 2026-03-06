"""user/admin.py – Admin panel for User"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

# User is already registered by Django — unregister and re-register
# to add custom columns if desired, or leave as default
# admin.site.unregister(User)
# admin.site.register(User, UserAdmin)
