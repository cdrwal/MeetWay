import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapComponent = ({ locations, midpoint, venues, setMidpoint }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [lng, setLng] = useState(73.87); // Default (Pune) or 0
    const [lat, setLat] = useState(18.52);
    const [zoom, setZoom] = useState(11.5);
    const markersRef = useRef({}); // Store markers by ID
    const venueMarkersRef = useRef([]);

    // Initialize Map
    useEffect(() => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11', // Premium Dark Style
            center: [lng, lat],
            zoom: zoom,
            attributionControl: false // Minimalist
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        map.current.on('load', () => {
            // Add source/layer for the radius circle
            map.current.addSource('midpoint-radius', {
                type: 'geojson',
                data: turf.featureCollection([])
            });

            map.current.addLayer({
                id: 'radius-fill',
                type: 'fill',
                source: 'midpoint-radius',
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.15
                }
            });

            map.current.addLayer({
                id: 'radius-line',
                type: 'line',
                source: 'midpoint-radius',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 2,
                    'line-dasharray': [2, 1]
                }
            });
        });
    }, []);

    // Update User Markers
    useEffect(() => {
        if (!map.current) return;

        // Remove old markers that aren't in the new list (or simpler: clear all and redraw - easier for MVP)
        // Optimization: Diffing is better. 
        // locations: [{id, longitude, latitude}]

        const currentIds = locations.map(l => l.id);

        // Remove deleted
        Object.keys(markersRef.current).forEach(id => {
            if (!currentIds.includes(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Add new or update
        locations.forEach(loc => {
            if (markersRef.current[loc.id]) {
                markersRef.current[loc.id].setLngLat([loc.longitude, loc.latitude]);
            } else {
                // Create generic marker
                const el = document.createElement('div');
                el.className = 'marker-user';
                el.style.backgroundColor = '#10b981';
                el.style.width = '16px';
                el.style.height = '16px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([loc.longitude, loc.latitude])
                    .addTo(map.current);

                markersRef.current[loc.id] = marker;
            }
        });

        // Fit bounds if we have locations
        if (locations.length > 0 && !midpoint) {
            const bounds = new mapboxgl.LngLatBounds();
            locations.forEach(loc => bounds.extend([loc.longitude, loc.latitude]));
            map.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }

    }, [locations]);

    // Update Midpoint & Radius
    const midpointMarkerRef = useRef(null);

    useEffect(() => {
        if (!map.current) return;

        if (midpoint) {
            // Draw Marker
            if (!midpointMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'marker-midpoint';
                el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 0 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
                el.style.color = '#ef4444'; // Red
                el.style.width = '32px';
                el.style.height = '32px';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.background = '#ef4444';
                el.style.borderRadius = '50%';
                el.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';

                midpointMarkerRef.current = new mapboxgl.Marker({
                    element: el,
                    draggable: true // Requirement #7
                })
                    .setLngLat([midpoint.longitude, midpoint.latitude])
                    .addTo(map.current);

                midpointMarkerRef.current.on('dragend', () => {
                    const newPos = midpointMarkerRef.current.getLngLat();
                    setMidpoint({ longitude: newPos.lng, latitude: newPos.lat });
                });

            } else {
                midpointMarkerRef.current.setLngLat([midpoint.longitude, midpoint.latitude]);
            }

            // Draw Radius (2km)
            // Turf circle
            const center = [midpoint.longitude, midpoint.latitude];
            const radius = 2; // km
            const options = { steps: 64, units: 'kilometers' };
            const circleGeo = turf.circle(center, radius, options);

            if (map.current.getSource('midpoint-radius')) {
                map.current.getSource('midpoint-radius').setData(circleGeo);
            }

            // Fly to midpoint
            map.current.flyTo({
                center: [midpoint.longitude, midpoint.latitude],
                zoom: 13, // Good zoom for 2km radius
                essential: true
            });

        } else {
            // Remove if null (reset)
            if (midpointMarkerRef.current) {
                midpointMarkerRef.current.remove();
                midpointMarkerRef.current = null;
            }
            if (map.current && map.current.getSource('midpoint-radius')) {
                map.current.getSource('midpoint-radius').setData(turf.featureCollection([]));
            }
        }
    }, [midpoint]); // Dependency on midpoint

    // Update Venues
    useEffect(() => {
        if (!map.current) return;

        // Clear old venues
        venueMarkersRef.current.forEach(m => m.remove());
        venueMarkersRef.current = [];

        venues.forEach(venue => {
            // Create Venue Marker (Small generic dots or icons)
            const el = document.createElement('div');
            el.className = 'marker-venue';
            el.style.backgroundColor = 'white';
            el.style.width = '10px';
            el.style.height = '10px';
            el.style.borderRadius = '50%';
            el.style.opacity = '0.7';
            el.title = venue.place_name;

            // Popup
            const popup = new mapboxgl.Popup({ offset: 25, className: 'venue-popup' })
                .setHTML(`
          <div style="color:black; padding:5px;">
            <strong style="font-size:14px; color:#FFF">${venue.text}</strong><br/>
            <span style="font-size:12px; color:#555;">${venue.properties.category || 'Place'}</span>
          </div>
        `);

            const marker = new mapboxgl.Marker(el)
                .setLngLat(venue.center)
                .setPopup(popup)
                .addTo(map.current);

            venueMarkersRef.current.push(marker);
        });

    }, [venues]);

    return (
        <div className="map-wrapper" style={{ width: '100%', height: '100%' }}>
            <div
                ref={mapContainer}
                className="map-container"
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default MapComponent;
