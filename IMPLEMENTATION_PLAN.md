# MeetWay Implementation Plan

## Overview
MeetWay is a Single Page Application (SPA) designed to find the optimal midway meeting point for multiple people. It visualizes locations on a map, calculates a geographic center (with options for time-based logic in the future), and identifies meeting venues like cafes and restaurants within a 2km radius.

## Tech Stack
- **Framework**: React + Vite (Fast, simple, reliable).
- **Language**: JavaScript (Simple, flexible).
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid) with a focus on Glassmorphism and modern aesthetics.
- **Map Integration**: Mapbox GL JS.
- **Geodata Logic**: Turf.js (Midpoint calculation, buffering).
- **Icons**: Lucide React.

## User Requirements Checklist
1. [ ] Map background (Full screen).
2. [ ] Sidebar Toolbar (Left).
3. [ ] Add Locations (Autocomplete via Mapbox Geocoding).
4. [ ] Calculate Midpoint (Distance-based default).
5. [ ] 2km Radius visualization.
6. [ ] Toggle: Distance vs Time (Traffic) based center.
7. [ ] Venue Search (Food/Drink provided by Mapbox/foursquare within radius).
8. [ ] Filters (Rating, Alcohol, Timings, Categories).
9. [ ] Drag Center Manually.

## Architecture

### Components
- **App.jsx**: Main State holder (Locations, Center, Filters). Orchestrates data flow between Sidebar and Map.
- **Sidebar.jsx**: Inputs for user locations, Filter controls, Results list.
- **MapComponent.jsx**: Renders Mapbox map, Markers, Layers (Circle), and handles map events (drag).

### Data Flow
1. User enters location -> Mapbox Geocode API -> Lat/Lng added to state.
2. State update -> Recalculate Midpoint (Turf.js centroid).
3. Midpoint update -> Update Map Center -> Fetch Venues (Mapbox Search/Tilequery).
4. Venues update -> Display pins on map and list in sidebar.

### Visual Design (Premium & Glassmorphism)
- **Palette**: Dark Mode default. Deep grays/blues (`#0f172a`), Vibrant accents (`#3b82f6` blue, `#10b981` emerald).
- **Glassmorphism**: Sidebar `background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border-right: 1px solid rgba(255, 255, 255, 0.1);`.
- **Typography**: 'Outfit' or 'Inter' from Google Fonts.

## Development Steps
1. **Setup**: Install dependencies (`mapbox-gl`, `turf`, `lucide-react`). Configure CSS variables.
2. **Base UI**: Create the layout with Map background and Overlay Sidebar.
3. **Map Logic**: Initialize Mapbox map. Handle resizing.
4. **Input Logic**: Build location input with simple autocomplete.
5. **Core Features**:
   - Implement midpoint calculation (centroid).
   - Draw 2km radius circle (Turf buffer -> GeoJSON Source).
   - Implement "Drag Center" logic.
6. **Venue Search**: Connect to Mapbox Search API to populate the list.
7. **Refinement**: Add filters, polish UI (animations, hover effects).
