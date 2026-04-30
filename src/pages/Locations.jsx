
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Map, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ screens }) {
  const map = useMap();

  useEffect(() => {
    if (screens.length > 0) {
      const bounds = L.latLngBounds(screens.map(s => [s.location.latitude, s.location.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
        map.setView([51.505, -0.09], 10); // Default to London
    }
  }, [screens, map]);

  return null;
}

export default function Locations() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    const loadScreens = async () => {
      try {
        const screensWithLocation = await base44.entities.Screen.filter({ 
            'location.latitude': { '$ne': null },
            'location.longitude': { '$ne': null }
        });
        setScreens(screensWithLocation);
      } catch (error) {
        console.error("Error loading screens:", error);
      } finally {
        setLoading(false);
      }
    };
    loadScreens();
  }, []);

  const regions = useMemo(() => ['all', ...new Set(screens.map(s => s.location?.region).filter(Boolean))], [screens]);
  
  const cities = useMemo(() => {
    let filtered = screens;
    if (selectedRegion !== 'all') {
      filtered = screens.filter(s => s.location?.region === selectedRegion);
    }
    return ['all', ...new Set(filtered.map(s => s.location?.city).filter(Boolean))];
  }, [screens, selectedRegion]);

  const filteredScreens = useMemo(() => {
    return screens.filter(s => {
      const regionMatch = selectedRegion === 'all' || s.location?.region === selectedRegion;
      const cityMatch = selectedCity === 'all' || s.location?.city === selectedCity;
      return regionMatch && cityMatch;
    });
  }, [screens, selectedRegion, selectedCity]);
  
  // Reset city filter when region changes
  useEffect(() => {
    setSelectedCity('all');
  }, [selectedRegion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Screen Locations
            </h1>
            <p className="text-slate-600">Geographic overview of your digital signage network</p>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Region / County</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region..." />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => <SelectItem key={r} value={r}>{r === 'all' ? 'All Regions' : r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">City / Town</label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={cities.length <= 1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city..." />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Cities' : c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20">
            <CardContent className="p-2 h-[600px]">
                {filteredScreens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Map className="w-12 h-12 mb-4" />
                        <p>No screens found matching the selected filters.</p>
                    </div>
                ) : (
                    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {filteredScreens.map(screen => (
                            <Marker
                                key={screen.id}
                                position={[screen.location.latitude, screen.location.longitude]}
                            >
                                <Popup>
                                    <div className="font-sans">
                                        <h3 className="font-bold text-base mb-1">{screen.name}</h3>
                                        <p className="text-sm">Status: 
                                            <span className={`font-semibold ml-1 ${screen.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>{screen.status}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">{screen.location.address}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                        <MapController screens={filteredScreens} />
                    </MapContainer>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
