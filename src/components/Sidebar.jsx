import React from 'react';
import { Trash2, Clock, Map as MapIcon, Star, BottleWine, Clock3, Coffee } from 'lucide-react';
import * as turf from '@turf/turf';
import LocationInput from './LocationInput';

const Sidebar = ({
    locations,
    addLocation,
    removeLocation,
    venues,
    filters,
    setFilters,
    isTrafficBased,
    setIsTrafficBased
}) => {

    const toggleFilter = (key) => {
        // Handling boolean toggles only for alcohol/openNow for simplicity
        if (typeof filters[key] === 'boolean') {
            setFilters({ ...filters, [key]: !filters[key] });
        }
    };

    return (
        <div className="sidebar glass-panel" style={{
            width: 'var(--sidebar-width)',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            overflow: 'hidden' // Inner scroll
        }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                    MeetWay
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                    Find the perfect spot to meet halfway.
                </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Section 1: Locations */}
                <div>
                    <h2 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '12px', fontWeight: '600' }}>
                        Locations
                    </h2>

                    <LocationInput onSelect={addLocation} />

                    <div className="location-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {locations.map(loc => (
                            <div key={loc.id} className="glass-panel" style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>User {locations.indexOf(loc) + 1}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.place_name}</div>
                                </div>
                                <button
                                    onClick={() => removeLocation(loc.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {locations.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                                No locations added yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Controls */}
                <div>
                    <h2 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '12px', fontWeight: '600' }}>
                        Preferences
                    </h2>

                    {/* Mode Toggle */}
                    <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '4px', marginBottom: '16px' }}>
                        <button
                            onClick={() => setIsTrafficBased(false)}
                            style={{
                                flex: 1,
                                background: !isTrafficBased ? 'var(--primary)' : 'transparent',
                                color: !isTrafficBased ? 'white' : 'var(--text-muted)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <MapIcon size={14} /> Distance
                        </button>
                        <button
                            onClick={() => setIsTrafficBased(true)}
                            style={{
                                flex: 1,
                                background: isTrafficBased ? 'var(--primary)' : 'transparent',
                                color: isTrafficBased ? 'white' : 'var(--text-muted)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Clock size={14} /> Time (Traffic)
                        </button>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            className={`btn-filter ${filters.alcohol ? 'active' : ''}`}
                            onClick={() => toggleFilter('alcohol')}
                            style={{
                                background: filters.alcohol ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: filters.alcohol ? '1px solid var(--accent)' : '1px solid transparent',
                                color: filters.alcohol ? 'var(--accent)' : 'var(--text-muted)',
                                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <BottleWine size={12} /> Alcohol
                        </button>
                        <button
                            className={`btn-filter ${filters.openNow ? 'active' : ''}`}
                            onClick={() => toggleFilter('openNow')}
                            style={{
                                background: filters.openNow ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: filters.openNow ? '1px solid var(--primary)' : '1px solid transparent',
                                color: filters.openNow ? 'var(--primary)' : 'var(--text-muted)',
                                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <Clock3 size={12} /> Open Now
                        </button>
                        <button
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid transparent',
                                color: 'var(--text-muted)',
                                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', display: 'none', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <Star size={12} /> Rated 4+
                        </button>
                    </div>
                </div>

                {/* Section 3: Midpoint Results */}
                {venues.length > 0 && (
                    <div>
                        <h2 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '12px', fontWeight: '600' }}>
                            Venue Suggestions
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {venues.map((venue, idx) => (
                                <div key={idx} className="glass-panel" style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{venue.text}</h3>
                                        <span style={{ fontSize: '11px', background: '#3b82f6', padding: '2px 6px', borderRadius: '4px', color: 'white' }}>
                                            {(turf.distance(
                                                turf.point([locations[0]?.longitude || 0, locations[0]?.latitude || 0]), // Approx from first user just for visual relative
                                                turf.point(venue.center),
                                                { units: 'kilometers' }
                                            )).toFixed(1)} km
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        {venue.properties.address || venue.place_name}
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'gray' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Coffee size={10} /> {venue.properties.category || 'Venue'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
};

export default Sidebar;
