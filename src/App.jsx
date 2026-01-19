import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import * as turf from '@turf/turf';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import './App.css';

// Set Token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

function App() {
  const [locations, setLocations] = useState([]);
  const [midpoint, setMidpoint] = useState(null);
  const [venues, setVenues] = useState([]);
  const [isTrafficBased, setIsTrafficBased] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    alcohol: false,
    openNow: false, // Default to false
    category: 'food' // Default to broad 'food' category
  });

  // Debug monitoring
  useEffect(() => {
    console.log("Current Locations:", locations);
  }, [locations]);

  useEffect(() => {
    console.log("Current Midpoint:", midpoint);
  }, [midpoint]);

  // Calculate Midpoint when locations change
  useEffect(() => {
    if (locations.length < 2) {
      if (locations.length === 1) {
        // If only one location, just set midpoint to that single location (optional, or null)
        // setMidpoint(locations[0].coords);
      }
      return;
    }

    // 1. Create FeatureCollection from locations
    const points = turf.featureCollection(
      locations.map(loc => turf.point([loc.longitude, loc.latitude]))
    );

    // 2. Calculate Center (barycenter or centroid)
    const center = turf.center(points);
    const centerCoords = center.geometry.coordinates;

    setMidpoint({
      longitude: centerCoords[0],
      latitude: centerCoords[1]
    });

  }, [locations, isTrafficBased]);

  // Fetch Venues when midpoint changes
  useEffect(() => {
    if (!midpoint) return;

    const fetchVenues = async () => {
      console.log("Fetching venues for:", midpoint);
      try {
        // Migration to Mapbox Search Box API (v1)
        // Endpoint: https://api.mapbox.com/search/searchbox/v1/category/{category}

        let queryCategory = 'food_and_drink';
        if (filters.alcohol) queryCategory = 'bar';
        else if (filters.category === 'restaurant') queryCategory = 'restaurant';

        const url = `https://api.mapbox.com/search/searchbox/v1/category/${queryCategory}?proximity=${midpoint.longitude},${midpoint.latitude}&limit=25&access_token=${MAPBOX_TOKEN}`;

        console.log("Fetch URL:", url);

        const response = await fetch(url);
        if (!response.ok) {
          console.error("Venues fetch failed:", response.status, response.statusText);
          const errText = await response.text();
          console.error("Error details:", errText);
          return;
        }

        const data = await response.json();
        console.log("Venues API Response:", data);

        if (data.features) {
          // Filter by distance (strictly < 2km)
          const validVenues = data.features.filter(f => {
            const from = turf.point([midpoint.longitude, midpoint.latitude]);
            const to = turf.point(f.geometry.coordinates); // SearchBox API returns geometry
            const distance = turf.distance(from, to, { units: 'kilometers' });
            f.distance = distance; // Store for sorting/display
            return distance <= 2;
          });

          // Sort by distance
          validVenues.sort((a, b) => a.distance - b.distance);

          // Map SearchBox API response to our app's expected format
          const mappedVenues = validVenues.map(f => ({
            ...f,
            text: f.properties.name,
            place_name: f.properties.full_address || f.properties.address || f.properties.name,
            center: f.geometry.coordinates,
            properties: {
              ...f.properties,
              category: f.properties.maki || queryCategory
            }
          }));

          console.log(`Found ${data.features.length} features. Valid (<2km): ${mappedVenues.length}`);

          if (data.features.length > 0 && mappedVenues.length === 0) {
            console.warn("Venues found by API but filtered out by 2km distance rule.");
          }

          setVenues(mappedVenues);
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    };

    fetchVenues();
  }, [midpoint, filters]);

  const addLocation = (location) => {
    setLocations([...locations, location]);
  };

  const removeLocation = (id) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  return (
    <div className="app-container">
      <Sidebar
        locations={locations}
        addLocation={addLocation}
        removeLocation={removeLocation}
        venues={venues}
        filters={filters}
        setFilters={setFilters}
        isTrafficBased={isTrafficBased}
        setIsTrafficBased={setIsTrafficBased}
      />
      <MapComponent
        locations={locations}
        midpoint={midpoint}
        venues={venues}
        setMidpoint={setMidpoint}
      />
    </div>
  );
}

export default App;
