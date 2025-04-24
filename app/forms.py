from django import forms
from .models import EndemicTree, UserSetting

class EndemicTreeForm(forms.ModelForm):
    class Meta:
        model = EndemicTree
        fields = ['common_name', 'scientific_name', 'species', 'family', 
                  'genus', 'population', 'latitude', 'longitude', 'year']
        
    def clean(self):
        cleaned_data = super().clean()
        latitude = cleaned_data.get('latitude')
        longitude = cleaned_data.get('longitude')
        
        # Basic validation for coordinates (can be expanded)
        if latitude and (latitude < -90 or latitude > 90):
            self.add_error('latitude', 'Latitude must be between -90 and 90')
        
        if longitude and (longitude < -180 or longitude > 180):
            self.add_error('longitude', 'Longitude must be between -180 and 180')
        
        return cleaned_data

class CSVUploadForm(forms.Form):
    csv_file = forms.FileField(
        label='Select a CSV file',
        help_text='File must be in CSV format with headers: common_name, scientific_name, species, family, genus, population, latitude, longitude, year'
    )

class ThemeSettingsForm(forms.Form):
    THEME_CHOICES = [
        ('dark', 'Dark Theme'),
        ('light', 'Light Theme'),
    ]
    
    theme = forms.ChoiceField(choices=THEME_CHOICES, widget=forms.RadioSelect, initial='dark')
