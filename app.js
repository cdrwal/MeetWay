/**
 * SpotFinder Application Logic (OpenSource Version)
 * 
 * Uses:
 * - Leaflet (Map Rendering)
 * - OpenStreetMap / Nominatim (Geocoding)
 * - Overpass API (Places Search)
 * - DistanceMatrix.ai (Optional Traffic)
 */

// --- State Management ---
const state = {
    apiKey: null, // DistanceMatrix.ai Key
    participants: [], // { id, name, location: {lat, lng}, address }
    map: null,
    layers: {
        participants: null,
        center: null,
        searchArea: null,
        results: null
    },
    center: null, // [lat, lng]
    radius: 2000, // meters
    searchType: 'food_drink', // Generic bucket
    optimizationMode: 'distance',
    preferences: [],

    // Temp input state for new participant
    newParticipant: {
        name: '',
        location: null,
        address: ''
    }
};

// --- DOM Elements ---
const dom = {
    apiModal: document.getElementById('api-modal'),
    apiKeyInput: document.getElementById('api-key-input'),
    btnStartApp: document.getElementById('btn-start-app'),
    stepEntry: document.getElementById('step-entry'),
    stepDiscovery: document.getElementById('step-discovery'),

    // Step 1
    newPName: document.getElementById('new-p-name'),
    newPLoc: document.getElementById('new-p-loc'),
    newPSuggestions: document.getElementById('new-p-suggestions'),
    btnAddP: document.getElementById('btn-add-p'),
    participantList: document.getElementById('participant-list'),
    pCount: document.getElementById('p-count'),
    btnCalculate: document.getElementById('btn-calculate'),

    // Step 2
    btnBack: document.getElementById('btn-back'),
    mapContainer: document.getElementById('details-map'),
    mapLoading: document.getElementById('map-loading'),
    optimizationToggle: document.getElementById('optimization-toggle'),
    radiusSlider: document.getElementById('radius-slider'),
    radiusValue: document.getElementById('radius-value'),
    prefFilter: document.getElementById('pref-filter'),
    resultsContainer: document.getElementById('results-container')
};

// --- Utilities ---

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Custom Emoji Icon
const createEmojiIcon = (emoji) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="font-size: 2rem; transform: translate(-50%, -50%); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${emoji}</div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
};

// --- Initialization ---

function init() {
    renderParticipantList();
    setupEventListeners();

    const storedKey = sessionStorage.getItem('spotfinder_dm_key');
    if (storedKey) state.apiKey = storedKey;
}

function setupEventListeners() {
    dom.btnStartApp.addEventListener('click', () => {
        const key = dom.apiKeyInput.value.trim();
        if (key) {
            state.apiKey = key;
            sessionStorage.setItem('spotfinder_dm_key', key);
        }
        dom.apiModal.classList.remove('active');
    });

    // Step 1: Add Participant Logic
    dom.newPName.addEventListener('input', (e) => {
        state.newParticipant.name = e.target.value;
        validateNewParticipant();
    });

    dom.newPLoc.addEventListener('input', debounce((e) => {
        const query = e.target.value;
        state.newParticipant.address = query; // Basic sync
        if (query.length < 3) {
            dom.newPSuggestions.style.display = 'none';
            return;
        }
        fetchNominatim(query);
    }, 600));

    dom.btnAddP.addEventListener('click', () => {
        if (state.newParticipant.location) {
            state.participants.push({
                id: Date.now(),
                name: state.newParticipant.name || 'Friend',
                location: state.newParticipant.location,
                address: state.newParticipant.address
            });
            // Reset Input
            state.newParticipant = { name: '', location: null, address: '' };
            dom.newPName.value = '';
            dom.newPLoc.value = '';
            dom.newPSuggestions.style.display = 'none';
            validateNewParticipant();
            renderParticipantList();
        }
    });

    dom.btnCalculate.addEventListener('click', handleCalculate);
    dom.btnBack.addEventListener('click', handleBack);

    // Filters & Sliders
    dom.radiusSlider.addEventListener('input', (e) => {
        const valKm = parseFloat(e.target.value);
        state.radius = valKm * 1000;
        dom.radiusValue.textContent = `${valKm} km`;
        updateCircleVisuals();
    });

    dom.radiusSlider.addEventListener('change', refreshSearch);

    dom.optimizationToggle.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            const val = e.target.dataset.value;
            if (val === 'time' && !state.apiKey) {
                alert("DistanceMatrix.ai Key is missing! Reload and enter key to use this feature.");
                return;
            }
            document.querySelectorAll('#optimization-toggle .chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            state.optimizationMode = val;
            refreshSearch();
        }
    });

    dom.prefFilter.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            const val = e.target.dataset.value;
            const wasActive = e.target.classList.contains('active');

            // Toggle
            if (!wasActive) {
                e.target.classList.add('active');
                state.preferences = [val];
            } else {
                e.target.classList.remove('active');
                state.preferences = [];
            }
            refreshSearch();
        }
    });
}

function validateNewParticipant() {
    // Enable Add button if we have a location
    if (state.newParticipant.location) {
        dom.btnAddP.disabled = false;
        dom.btnAddP.classList.remove('btn-secondary');
        dom.btnAddP.classList.add('btn-primary');
    } else {
        dom.btnAddP.disabled = true;
        dom.btnAddP.classList.add('btn-secondary');
        dom.btnAddP.classList.remove('btn-primary');
    }
}

// --- Step 1 Logic ---

async function fetchNominatim(query) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();

        dom.newPSuggestions.innerHTML = '';
        if (data.length === 0) return;

        data.forEach(place => {
            const div = document.createElement('div');
            div.style.padding = '0.5rem';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid var(--border-glass)';
            div.textContent = place.display_name;
            div.onmouseover = () => div.style.backgroundColor = 'rgba(255,255,255,0.1)';
            div.onmouseout = () => div.style.backgroundColor = 'transparent';

            div.onclick = () => {
                state.newParticipant.location = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
                state.newParticipant.address = place.display_name;
                dom.newPLoc.value = place.display_name;
                dom.newPSuggestions.style.display = 'none';
                validateNewParticipant();
            };
            dom.newPSuggestions.appendChild(div);
        });
        dom.newPSuggestions.style.display = 'block';
    } catch (e) {
        console.error("Geocoding failed", e);
    }
}

function renderParticipantList() {
    dom.pCount.textContent = state.participants.length;

    if (state.participants.length === 0) {
        dom.participantList.innerHTML = `
        <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-style: italic;">
            Add people above to get started!
        </div>`;
        dom.btnCalculate.disabled = true;
        return;
    }

    dom.btnCalculate.disabled = false;
    dom.participantList.innerHTML = '';

    state.participants.forEach((p, index) => {
        const row = document.createElement('div');
        row.className = 'participant-row';
        row.style.background = 'rgba(255,255,255,0.05)';
        row.style.borderRadius = '8px';
        row.style.marginBottom = '0.5rem';
        row.innerHTML = `
            <div style="font-size: 1.5rem;">😎</div>
            <div style="flex: 1;">
                <div style="font-weight: 600;">${p.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 200px;">${p.address}</div>
            </div>
            <button class="btn-icon" onclick="removeParticipant(${index})" title="Remove">❌</button>
        `;
        dom.participantList.appendChild(row);
    });
}

window.removeParticipant = function (index) {
    state.participants.splice(index, 1);
    renderParticipantList();
};

// --- Step 2: Map & Logic ---

async function handleCalculate() {
    if (state.participants.length < 1) return;

    dom.stepEntry.classList.add('step-hidden');
    dom.stepDiscovery.classList.remove('step-hidden');

    if (!state.map) initLeafletMap();

    setTimeout(() => {
        state.map.invalidateSize(); // Fix leafet rendering in hidden div
        recalculateCenter();
    }, 100);
}

function handleBack() {
    dom.stepDiscovery.classList.add('step-hidden');
    dom.stepEntry.classList.remove('step-hidden');
}

function initLeafletMap() {
    state.map = L.map('details-map').setView([0, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'OSM & Carto',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(state.map);

    // Init Layers
    state.layers.participants = L.layerGroup().addTo(state.map);
    state.layers.center = L.layerGroup().addTo(state.map);
    state.layers.searchArea = L.layerGroup().addTo(state.map);
    state.layers.results = L.layerGroup().addTo(state.map);
}

async function recalculateCenter() {
    dom.mapLoading.style.opacity = '1';

    state.layers.participants.clearLayers();

    let totalLat = 0, totalLng = 0;
    const latLngs = [];

    state.participants.forEach(p => {
        totalLat += p.location.lat;
        totalLng += p.location.lng;
        latLngs.push([p.location.lat, p.location.lng]);

        L.marker([p.location.lat, p.location.lng], {
            icon: createEmojiIcon('😎')
        }).bindPopup(p.name).addTo(state.layers.participants);
    });

    const centerLat = totalLat / state.participants.length;
    const centerLng = totalLng / state.participants.length;
    state.center = [centerLat, centerLng];

    // Draggable Center Marker
    state.layers.center.clearLayers();
    const centerMarker = L.marker(state.center, {
        draggable: true,
        icon: createEmojiIcon('🎯'),
        zIndexOffset: 1000
    }).addTo(state.layers.center);

    centerMarker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        state.center = [lat, lng];
        updateCircleVisuals();
        refreshSearch();
    });

    // Fit Bounds
    const bounds = L.latLngBounds(latLngs);
    bounds.extend(state.center);
    state.map.fitBounds(bounds, { padding: [50, 50] });

    updateCircleVisuals();
    await refreshSearch();
}

function updateCircleVisuals() {
    if (!state.map || !state.center) return;
    state.layers.searchArea.clearLayers();

    L.circle(state.center, {
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.15,
        radius: state.radius
    }).addTo(state.layers.searchArea);
}

// --- Overpass API & Discovery ---

async function refreshSearch() {
    if (!state.center) return;
    dom.mapLoading.style.opacity = '1';
    dom.resultsContainer.innerHTML = '';
    state.layers.results.clearLayers();

    const lat = state.center[0];
    const lng = state.center[1];

    // Broad Query: Places that serve food/drink
    // We include: restaurant, cafe, bar, pub, fast_food, food_court, bistro
    const amenityType = "'amenity'~'restaurant|cafe|bar|pub|fast_food|food_court|bistro|biergarten|nightclub'";

    // NWR Query
    const query = `
        [out:json][timeout:25];
        (
          nwr[${amenityType}](around:${state.radius},${lat},${lng});
        );
        out center;
    `;

    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        const data = await res.json();

        let places = data.elements.map(el => {
            const pLat = el.lat || (el.center && el.center.lat);
            const pLng = el.lon || (el.center && el.center.lon);
            const tags = el.tags || {};

            return {
                id: el.id,
                name: tags.name || 'Unnamed Spot',
                lat: pLat,
                lng: pLng,
                amenity: tags.amenity,
                tags: tags
            };
        }).filter(p => p.name !== 'Unnamed Spot' && p.lat && p.lng);

        // Filter Logic
        // If "Alcohol Served" is checked, we want to REMOVE pins that don't satisfy it.
        // Satisfied if: Amenity is bar/pub/nightclub/biergarten OR explicit drink:alcohol != no
        if (state.preferences.includes('alcohol')) {
            places = places.filter(p => {
                const type = p.amenity;
                const isExplicitAlcoholPlace = ['bar', 'pub', 'nightclub', 'biergarten', 'casino'].includes(type);
                // Some restaurants have alcohol, but it's hard to know for sure in OSM without tags.
                // But user instruction: "remove the pins without the alcohol".
                // We will trust the implicit type or explicit tag.
                // If it's a cafe/restaurant, generally we assume NO unless tagged yes? 
                // That might be too strict. 
                // Let's assume most restaurants serve alcohol, but Cafes/FastFood often don't.
                // Refinment: Keep if (Bar/Pub etc) OR (Restaurant AND NOT alcohol=no). Remove FastFood/Cafe unless alcohol=yes.

                if (isExplicitAlcoholPlace) return true;
                if (p.tags['drink:alcohol'] === 'yes' || p.tags['alcohol'] === 'yes') return true;

                // Allow Restaurants (assume usually have beer/wine), but block Fast Food / Cafe by default
                if (type === 'restaurant' || type === 'bistro' || type === 'food_court') {
                    // Check negative tag
                    if (p.tags['drink:alcohol'] === 'no' || p.tags['alcohol'] === 'no') return false;
                    return true;
                }

                return false; // Fast Food, Cafe (unless tagged yes above) are filtered out
            });
        }

        // Limit results
        places = places.slice(0, 50);

        // Traffic Optimization (if enabled)
        if (state.optimizationMode === 'time' && state.apiKey) {
            places = await optimizeByTime(places);
        }

        renderResults(places);

    } catch (e) {
        console.error("Overpass Error", e);
        dom.resultsContainer.innerHTML = '<div style="padding:1rem; color:red;">Failed to fetch places. Try again.</div>';
    }

    dom.mapLoading.style.opacity = '0';
}

// DistanceMatrix.ai Integration
async function optimizeByTime(places) {
    if (state.participants.length === 0) return places;

    const candidates = places.slice(0, 5); // Optimize top 5

    const origins = state.participants.map(p => `${p.location.lat},${p.location.lng}`).join('|');
    const destinations = candidates.map(p => `${p.lat},${p.lng}`).join('|');

    try {
        const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${state.apiKey}&departure_time=now`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'OK') throw new Error(data.status);

        candidates.forEach((place, cIndex) => {
            const times = [];
            let totalTime = 0;

            state.participants.forEach((_, pIndex) => {
                // Check row existence
                if (data.rows[pIndex] && data.rows[pIndex].elements[cIndex]) {
                    const element = data.rows[pIndex].elements[cIndex];
                    if (element.status === 'OK') {
                        const sec = (element.duration_in_traffic || element.duration).value;
                        times.push(sec);
                        totalTime += sec;
                    }
                }
            });

            if (times.length > 0) {
                const mean = totalTime / times.length;
                const variance = times.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / times.length;
                place.timeVariance = variance;
                place.avgTime = Math.round(mean / 60);
            } else {
                place.timeVariance = Infinity;
            }
        });

        return candidates.sort((a, b) => a.timeVariance - b.timeVariance);

    } catch (e) {
        console.error("Traffic Calc Failed", e);
        return places;
    }
}

function renderResults(places) {
    if (places.length === 0) {
        dom.resultsContainer.innerHTML = '<div style="padding:1rem;">No matching places found. Expand radius?</div>';
        return;
    }

    places.forEach(place => {
        // Map Marker - Unified Icon
        const marker = L.marker([place.lat, place.lng], {
            icon: createEmojiIcon('📍'),
            title: place.name
        }).addTo(state.layers.results);

        marker.bindPopup(`<b>${place.name}</b><br>${place.tags['addr:street'] || place.amenity}`);

        // Sidebar Item
        const div = document.createElement('div');
        div.className = 'result-card glass-card';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap: 0.5rem;">
                <div style="font-size: 1.5rem;">📍</div>
                <div>
                    <div style="font-weight: 600;">${place.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${place.tags['addr:street'] || place.amenity}
                        ${place.avgTime ? `• 🕒 ~${place.avgTime} min` : ''}
                    </div>
                </div>
            </div>
            <button class="btn-icon">➡️</button>
        `;
        div.onclick = () => {
            state.map.setView([place.lat, place.lng], 17);
            marker.openPopup();
        };
        dom.resultsContainer.appendChild(div);
    });
}

// Start
init();
