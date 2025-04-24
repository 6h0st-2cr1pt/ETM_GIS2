import pandas as pd
import json
import csv
import io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO

from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.core.serializers import serialize
from django.db.models import Count, Sum

from .models import EndemicTree, MapLayer, UserSetting
from .forms import EndemicTreeForm, CSVUploadForm, ThemeSettingsForm

def splash_screen(request):
    """
    Initial splash screen that redirects to dashboard
    """
    return render(request, 'app/splash.html')

def dashboard(request):
    """
    Main dashboard view
    """
    # Get basic stats for dashboard
    total_trees = EndemicTree.objects.count()
    unique_species = EndemicTree.objects.values('species').distinct().count()
    tree_population = EndemicTree.objects.aggregate(Sum('population'))['population__sum'] or 0
    
    # Get most recent data
    recent_trees = EndemicTree.objects.all().order_by('-created_at')[:5]
    
    context = {
        'active_page': 'dashboard',
        'total_trees': total_trees,
        'unique_species': unique_species,
        'tree_population': tree_population,
        'recent_trees': recent_trees,
    }
    return render(request, 'app/dashboard.html', context)

def gis(request):
    """
    GIS Map view
    """
    # Get all available map layers
    layers = MapLayer.objects.filter(is_active=True)
    
    # Get all unique tree common names for filter
    tree_names = EndemicTree.objects.values_list('common_name', flat=True).distinct()
    
    context = {
        'active_page': 'gis',
        'layers': layers,
        'tree_names': tree_names,
    }
    return render(request, 'app/gis.html', context)

def analytics(request):
    """
    Analytics and visualization view
    """
    # Get data for analytics
    species_count = EndemicTree.objects.values('species').annotate(count=Count('id')).order_by('-count')[:10]
    population_by_year = EndemicTree.objects.values('year').annotate(total=Sum('population')).order_by('year')
    
    # Convert to JSON for JavaScript charts
    species_data = json.dumps(list(species_count))
    population_data = json.dumps(list(population_by_year))
    
    # Create matplotlib/seaborn charts
    # Population distribution
    plt.figure(figsize=(10, 6))
    plt.style.use('dark_background')
    
    # Sample data - in a real app, you'd use actual data from the database
    df = pd.DataFrame(list(EndemicTree.objects.values('family', 'population')))
    if not df.empty:
        sns.barplot(x='family', y='population', data=df)
        plt.title('Population by Family', color='white')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save plot to a temporary buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png', transparent=True)
        buffer.seek(0)
        plot_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        plt.close()
    else:
        plot_data = None
    
    context = {
        'active_page': 'analytics',
        'species_data': species_data,
        'population_data': population_data,
        'plot_data': plot_data,
    }
    return render(request, 'app/analytics.html', context)

def layers(request):
    """
    Layer control view
    """
    layers = MapLayer.objects.all()
    
    context = {
        'active_page': 'layers',
        'layers': layers,
    }
    return render(request, 'app/layers.html', context)

def datasets(request):
    """
    Display and manage datasets
    """
    trees = EndemicTree.objects.all()
    
    context = {
        'active_page': 'datasets',
        'trees': trees,
    }
    return render(request, 'app/datasets.html', context)

def upload_data(request):
    """
    Handle file uploads and manual data entry
    """
    tree_form = EndemicTreeForm()
    csv_form = CSVUploadForm()
    
    if request.method == 'POST':
        if 'submit_csv' in request.POST:
            csv_form = CSVUploadForm(request.POST, request.FILES)
            if csv_form.is_valid():
                csv_file = request.FILES['csv_file']
                
                # Check if file is CSV
                if not csv_file.name.endswith('.csv'):
                    messages.error(request, 'File must be a CSV file')
                    return redirect('app:upload')
                
                # Process CSV file
                try:
                    df = pd.read_csv(csv_file)
                    required_columns = ['common_name', 'scientific_name', 'species', 
                                      'family', 'genus', 'population', 'latitude', 
                                      'longitude']
                    
                    # Check if all required columns exist
                    missing_columns = [col for col in required_columns if col not in df.columns]
                    if missing_columns:
                        messages.error(request, f'Missing required columns: {", ".join(missing_columns)}')
                        return redirect('app:upload')
                    
                    # Process each row and save to database
                    success_count = 0
                    error_count = 0
                    
                    for _, row in df.iterrows():
                        try:
                            # Get the current year if not provided
                            year = row.get('year', 2023)  # Default to current year
                            
                            tree = EndemicTree(
                                common_name=row['common_name'],
                                scientific_name=row['scientific_name'],
                                species=row['species'],
                                family=row['family'],
                                genus=row['genus'],
                                population=row['population'],
                                latitude=row['latitude'],
                                longitude=row['longitude'],
                                year=year
                            )
                            tree.save()
                            success_count += 1
                        except Exception as e:
                            error_count += 1
                    
                    messages.success(request, f'Successfully imported {success_count} trees. {error_count} errors.')
                except Exception as e:
                    messages.error(request, f'Error processing CSV file: {str(e)}')
                
                return redirect('app:upload')
                
        elif 'submit_manual' in request.POST:
            tree_form = EndemicTreeForm(request.POST)
            if tree_form.is_valid():
                tree_form.save()
                messages.success(request, 'Tree data added successfully!')
                return redirect('app:upload')
    
    context = {
        'active_page': 'upload',
        'tree_form': tree_form,
        'csv_form': csv_form,
    }
    return render(request, 'app/upload.html', context)

def settings(request):
    """
    Application settings
    """
    # Initialize form with current settings
    try:
        current_theme = UserSetting.objects.get(key='theme').value
    except UserSetting.DoesNotExist:
        current_theme = 'dark'  # Default
    
    form = ThemeSettingsForm(initial={'theme': current_theme})
    
    if request.method == 'POST':
        form = ThemeSettingsForm(request.POST)
        if form.is_valid():
            theme = form.cleaned_data['theme']
            
            # Save to database
            UserSetting.objects.update_or_create(
                key='theme',
                defaults={'value': theme}
            )
            
            messages.success(request, 'Settings updated successfully!')
            return redirect('app:settings')
    
    context = {
        'active_page': 'settings',
        'form': form,
    }
    return render(request, 'app/settings.html', context)

def about(request):
    """
    About page
    """
    context = {
        'active_page': 'about',
    }
    return render(request, 'app/about.html', context)

# API Views
def tree_data(request):
    """
    API endpoint for tree data in GeoJSON format
    """
    trees = EndemicTree.objects.all()
    
    # Convert to GeoJSON format
    features = []
    for tree in trees:
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [tree.longitude, tree.latitude]
            },
            'properties': {
                'id': str(tree.id),
                'common_name': tree.common_name,
                'scientific_name': tree.scientific_name,
                'species': tree.species,
                'family': tree.family,
                'genus': tree.genus,
                'population': tree.population,
                'year': tree.year
            }
        }
        features.append(feature)
    
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    return JsonResponse(geojson)

def filter_trees(request, name):
    """
    API endpoint for filtered tree data
    """
    trees = EndemicTree.objects.filter(common_name__iexact=name)
    
    # Convert to GeoJSON format (same as above)
    features = []
    for tree in trees:
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [tree.longitude, tree.latitude]
            },
            'properties': {
                'id': str(tree.id),
                'common_name': tree.common_name,
                'scientific_name': tree.scientific_name,
                'species': tree.species,
                'family': tree.family,
                'genus': tree.genus,
                'population': tree.population,
                'year': tree.year
            }
        }
        features.append(feature)
    
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    return JsonResponse(geojson)

def analytics_data(request):
    """
    API endpoint for analytics data
    """
    # Species count
    species_count = list(EndemicTree.objects.values('species').annotate(count=Count('id')).order_by('-count')[:10])
    
    # Population by year
    population_by_year = list(EndemicTree.objects.values('year').annotate(total=Sum('population')).order_by('year'))
    
    # Population by family
    population_by_family = list(EndemicTree.objects.values('family').annotate(total=Sum('population')).order_by('-total')[:10])
    
    data = {
        'species_count': species_count,
        'population_by_year': population_by_year,
        'population_by_family': population_by_family
    }
    
    return JsonResponse(data)

@require_POST
def set_theme(request):
    """
    API endpoint to set theme
    """
    theme = request.POST.get('theme')
    if theme in ['dark', 'light']:
        UserSetting.objects.update_or_create(
            key='theme',
            defaults={'value': theme}
        )
        return JsonResponse({'status': 'success', 'theme': theme})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid theme'}, status=400)
