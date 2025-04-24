from django.db import models
from django.utils import timezone
import uuid

class EndemicTree(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    common_name = models.CharField(max_length=100)
    scientific_name = models.CharField(max_length=100)
    species = models.CharField(max_length=100)
    family = models.CharField(max_length=100)
    genus = models.CharField(max_length=100)
    population = models.IntegerField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    year = models.IntegerField(default=timezone.now().year)
    
    def __str__(self):
        return f"{self.common_name} ({self.scientific_name})"
    
    class Meta:
        ordering = ['common_name', '-year']
        indexes = [
            models.Index(fields=['common_name']),
            models.Index(fields=['scientific_name']),
            models.Index(fields=['year']),
        ]


class MapLayer(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    url = models.URLField()
    layer_type = models.CharField(max_length=50, choices=[
        ('topographic', 'Topographic'),
        ('heatmap', 'Heatmap'),
        ('protected', 'Protected Areas'),
        ('landuse', 'Land Use'),
        ('soil', 'Soil Type'),
        ('custom', 'Custom'),
    ])
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name


class UserSetting(models.Model):
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    
    def __str__(self):
        return self.key
