document.addEventListener("DOMContentLoaded", () => {
  // Declare L at the beginning of the script to ensure it's defined
  const L = window.L

  // Location search functionality
  const searchInput = document.getElementById("locationSearch")
  const searchButton = document.getElementById("searchButton")

  if (searchInput && searchButton) {
    searchButton.addEventListener("click", () => {
      performSearch()
    })

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performSearch()
      }
    })

    function performSearch() {
      const searchTerm = searchInput.value.trim()
      if (!searchTerm) return

      // Use Nominatim for geocoding (OpenStreetMap's free geocoding service)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`)
        .then((response) => response.json())
        .then((data) => {
          if (data && data.length > 0) {
            const result = data[0]
            const lat = Number.parseFloat(result.lat)
            const lon = Number.parseFloat(result.lon)

            // Center map on search result
            map.setView([lat, lon], 12)

            // Add a marker for the search result
            const searchMarker = L.marker([lat, lon], {
              icon: L.divIcon({
                className: "search-result-marker",
                html: '<i class="fas fa-search-location"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
              }),
            }).addTo(map)

            // Add popup with info
            searchMarker.bindPopup(`<b>${result.display_name}</b>`).openPopup()

            // Remove marker after 5 seconds
            setTimeout(() => {
              map.removeLayer(searchMarker)
            }, 5000)
          } else {
            alert("Location not found. Please try a different search term.")
          }
        })
        .catch((error) => {
          console.error("Error searching for location:", error)
          alert("Error searching for location. Please try again.")
        })
    }
  }
  // Initialize the map centered on Negros Island, Philippines
  // Negros Island coordinates: approximately 10.0° N, 123.0° E
  const map = L.map("map", {
    center: [10.0, 123.0],
    zoom: 9,
    zoomControl: false, // We'll add custom controls
    attributionControl: false,
  })

  // Add attribution control to the bottom right
  L.control
    .attribution({
      position: "bottomright",
    })
    .addTo(map)

  // Add zoom control to the right
  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(map)

  // Map base layers - Using both OpenStreetMap and free Esri layers
  const baseLayers = {
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }),
    // Fix for dark-normal - using a different provider that doesn't require authentication
    "dark-normal": L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }),
    // OpenStreetMap topographic layer
    topographic: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      maxZoom: 17,
    }),
    // Light theme
    light: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }),
    // Free Esri satellite imagery
    satellite: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
      },
    ),
    // Standard OpenStreetMap
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }),
  }

  // Set initial base layer (dark by default)
  let currentBaseLayer = "dark"
  baseLayers[currentBaseLayer].addTo(map)

  // Create a layer group for tree markers
  const treeLayer = L.layerGroup().addTo(map)

  // Create layer groups for additional layers - Fix for issue #12
  const additionalLayers = {
    heatmap: L.layerGroup(),
    protected: L.layerGroup(),
    landuse: L.layerGroup(),
    soil: L.layerGroup(),
  }

  // Add sample layers for demonstration
  // Heatmap layer (will be populated with actual data)
  const heatmapLayer = L.layerGroup()
  additionalLayers.heatmap = heatmapLayer

  // Protected areas layer (using a GeoJSON placeholder)
  const protectedAreasLayer = L.layerGroup()
  additionalLayers.protected = protectedAreasLayer

  // Land use layer
  const landUseLayer = L.layerGroup()
  additionalLayers.landuse = landUseLayer

  // Soil type layer
  const soilTypeLayer = L.layerGroup()
  additionalLayers.soil = soilTypeLayer

  // Populate layer controls
  const layerControlsList = document.getElementById("layerControlsList")

  // Define available layers
  const availableLayers = [
    { id: "heatmap", name: "Heatmap", active: false },
    { id: "protected", name: "Protected Areas", active: false },
    { id: "landuse", name: "Land Use", active: false },
    { id: "soil", name: "Soil Type", active: false },
  ]

  // Add layer controls to the UI
  availableLayers.forEach((layer) => {
    const layerItem = document.createElement("div")
    layerItem.className = "control-option"
    layerItem.innerHTML = `
            <input type="checkbox" id="layer-${layer.id}" value="${layer.id}" ${layer.active ? "checked" : ""}>
            <label for="layer-${layer.id}">${layer.name}</label>
        `
    layerControlsList.appendChild(layerItem)

    // Add event listener
    const checkbox = layerItem.querySelector(`#layer-${layer.id}`)
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        additionalLayers[layer.id].addTo(map)
      } else {
        map.removeLayer(additionalLayers[layer.id])
      }
    })

    // Add active layers to map
    if (layer.active) {
      additionalLayers[layer.id].addTo(map)
    }
  })

  // Load all trees by default
  loadTrees()

  // Map type control change event
  document.querySelectorAll('input[name="mapType"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      // Remove current base layer
      map.removeLayer(baseLayers[currentBaseLayer])

      // Add new base layer
      currentBaseLayer = this.value
      baseLayers[currentBaseLayer].addTo(map)
    })
  })

  // Tree filter change event
  document.querySelectorAll('input[name="treeFilter"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      const filterValue = this.value
      treeLayer.clearLayers()

      if (filterValue === "all") {
        loadTrees()
      } else {
        loadFilteredTrees(filterValue)
      }
    })
  })

  // Toggle control dropdowns
  document.querySelectorAll(".control-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const dropdown = this.nextElementSibling

      // Close all other dropdowns
      document.querySelectorAll(".control-dropdown").forEach((d) => {
        if (d !== dropdown) {
          d.classList.remove("active")
        }
      })

      // Toggle this dropdown
      dropdown.classList.toggle("active")
    })
  })

  // Close dropdowns when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".control-group")) {
      document.querySelectorAll(".control-dropdown").forEach((dropdown) => {
        dropdown.classList.remove("active")
      })
    }
  })

  // Map tools functionality
  document.getElementById("centerMapBtn").addEventListener("click", () => {
    map.setView([10.0, 123.0], 9)
  })

  // Measure distance tool
  let measureControl = null
  document.getElementById("measureDistanceBtn").addEventListener("click", function () {
    if (measureControl) {
      // If measurement is active, remove it
      map.removeControl(measureControl)
      measureControl = null
      this.classList.remove("active")
    } else {
      // Activate measurement
      measureControl = L.control.measure({
        position: "topright",
        primaryLengthUnit: "kilometers",
        secondaryLengthUnit: "miles",
        primaryAreaUnit: "sqkilometers",
        secondaryAreaUnit: "acres",
      })
      measureControl.addTo(map)
      this.classList.add("active")
    }
  })

  // Draw polygon tool
  let drawControl = null
  document.getElementById("drawPolygonBtn").addEventListener("click", function () {
    if (drawControl) {
      // If drawing is active, remove it
      map.removeControl(drawControl)
      drawControl = null
      this.classList.remove("active")
    } else {
      // Activate drawing
      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)

      drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
        },
        draw: {
          polygon: true,
          polyline: true,
          rectangle: true,
          circle: true,
          marker: true,
        },
      })
      map.addControl(drawControl)
      this.classList.add("active")

      map.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer
        drawnItems.addLayer(layer)
      })
    }
  })

  // Export data tool
  document.getElementById("exportDataBtn").addEventListener("click", () => {
    // Get visible trees
    fetch("/api/trees/")
      .then((response) => response.json())
      .then((data) => {
        // Convert to CSV
        let csv = "data:text/csv;charset=utf-8,"
        csv += "Common Name,Scientific Name,Family,Genus,Population,Latitude,Longitude,Year,Notes\n"

        data.features.forEach((feature) => {
          const p = feature.properties
          const coords = feature.geometry.coordinates
          csv += `"${p.common_name}","${p.scientific_name}","${p.family}","${p.genus}",${p.population},${coords[1]},${coords[0]},${p.year},"${p.notes}"\n`
        })

        // Create download link
        const encodedUri = encodeURI(csv)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "endemic_trees_data.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
      .catch((error) => console.error("Error exporting data:", error))
  })

  // Function to load all trees
  function loadTrees() {
    fetch("/api/trees/")
      .then((response) => response.json())
      .then((data) => {
        addTreesToMap(data)

        // Also update heatmap if active
        if (map.hasLayer(additionalLayers.heatmap)) {
          updateHeatmap(data)
        }
      })
      .catch((error) => console.error("Error loading trees:", error))
  }

  // Function to load filtered trees
  function loadFilteredTrees(speciesId) {
    fetch(`/api/trees/filter/${speciesId}/`)
      .then((response) => response.json())
      .then((data) => {
        addTreesToMap(data)

        // Also update heatmap if active
        if (map.hasLayer(additionalLayers.heatmap)) {
          updateHeatmap(data)
        }
      })
      .catch((error) => console.error("Error loading filtered trees:", error))
  }

  // Function to add tree markers to the map
  function addTreesToMap(geojson) {
    // Default pin style if not provided in geojson
    let pinStyle = {
      icon_class: "fa-tree",
      color: "#4caf50",
      size: 24,
      border_color: "#ffffff",
      border_width: 2,
      background_color: "rgba(0, 0, 0, 0.6)",
    }

    // Use pin style from geojson if available
    if (geojson.pin_style) {
      pinStyle = geojson.pin_style
    }

    // Create custom icon
    const treeIcon = L.divIcon({
      className: "custom-tree-marker",
      html: `<i class="fas ${pinStyle.icon_class}" style="color: ${pinStyle.color}"></i>`,
      iconSize: [pinStyle.size, pinStyle.size],
      iconAnchor: [pinStyle.size / 2, pinStyle.size],
    })

    // Add GeoJSON to map
    L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => L.marker(latlng, { icon: treeIcon }),
      onEachFeature: (feature, layer) => {
        const properties = feature.properties

        // Create popup content
        const popupContent = `
                    <div class="tree-popup">
                        <h3>${properties.common_name}</h3>
                        <p><em>${properties.scientific_name}</em></p>
                        <table class="popup-table">
                            <tr><td>Family:</td><td>${properties.family}</td></tr>
                            <tr><td>Genus:</td><td>${properties.genus}</td></tr>
                            <tr><td>Population:</td><td>${properties.population}</td></tr>
                            <tr><td>Year:</td><td>${properties.year}</td></tr>
                            <tr><td>Location:</td><td>${properties.location}</td></tr>
                        </table>
                        ${properties.notes ? `<p class="popup-notes">${properties.notes}</p>` : ""}
                    </div>
                `

        // Bind popup to marker
        layer.bindPopup(popupContent)
      },
    }).addTo(treeLayer)
  }

  // Function to update heatmap
  function updateHeatmap(geojson) {
    // Clear existing heatmap
    additionalLayers.heatmap.clearLayers()

    // Extract points for heatmap
    const heatPoints = []
    geojson.features.forEach((feature) => {
      const coords = feature.geometry.coordinates
      const intensity = feature.properties.population
      heatPoints.push([coords[1], coords[0], intensity / 10]) // lat, lng, intensity
    })

    // Create heatmap layer
    if (heatPoints.length > 0) {
      const heat = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.4: "blue", 0.65: "lime", 1: "red" },
      })
      additionalLayers.heatmap.addLayer(heat)
    }
  }
})
