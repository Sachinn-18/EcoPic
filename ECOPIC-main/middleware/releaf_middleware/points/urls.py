from django.urls import path
from .views import reward

urlpatterns = [
    path("reward/", reward, name="reward"),
]
