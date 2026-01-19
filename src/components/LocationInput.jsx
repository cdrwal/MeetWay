import React, { useState, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const LocationInput = ({ onSelect }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);
                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`
                    );
                    const data = await response.json();
                    setSuggestions(data.features || []);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (feature) => {
        onSelect({
            id: feature.id,
            name: feature.text, // or feature.place_name for full
            place_name: feature.place_name,
            longitude: feature.center[0],
            latitude: feature.center[1]
        });
        setQuery('');
        setSuggestions([]);
    };

    return (
        <div className="location-input-container" style={{ position: 'relative', marginBottom: '1rem' }}>
            <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <Search size={18} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Add a person's location..."
                    style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontFamily: 'var(--font-main)' }}
                />
                {query && (
                    <X
                        size={16}
                        color="var(--text-muted)"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setQuery('')}
                    />
                )}
            </div>

            {suggestions.length > 0 && (
                <ul className="suggestions-list glass-panel" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    listStyle: 'none',
                    padding: '0',
                    margin: '4px 0',
                    borderRadius: '8px',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-light)'
                }}>
                    {suggestions.map((feature) => (
                        <li
                            key={feature.id}
                            onClick={() => handleSelect(feature)}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <MapPin size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ display: 'block', fontSize: '14px' }}>{feature.text}</span>
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{feature.place_name}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationInput;
