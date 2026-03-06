"""user/models.py – Custom User model (extends AbstractUser)"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model.  Extend fields here as needed.
    Currently re-uses Django's built-in username/password/email fields.
    """
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
