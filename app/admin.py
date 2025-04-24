from django.contrib import admin
from .models import EndemicTree, MapLayer, UserSetting

@admin.register(EndemicTree)
class EndemicTreeAdmin(admin.ModelAdmin):
    list_display = ('common_name', 'scientific_name', 'species', 'population', 'year')
    list_filter = ('common_name', 'family', 'genus', 'year')
    search_fields = ('common_name', 'scientific_name', 'species')

@admin.register(MapLayer)
class MapLayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'layer_type', 'is_active')
    list_filter = ('layer_type', 'is_active')
    search_fields = ('name', 'description')

@admin.register(UserSetting)
class UserSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value')
    search_fields = ('key',)
