
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Monitor, MapPin, Settings, Navigation, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function ScreenEditForm({ screen, groups = [], onSave, onCancel }) {
  const [formData, setFormData] = useState(screen || {});
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this device.");
      return;
    }

    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            latitude,
            longitude
          }
        }));
        setGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Unable to retrieve location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Auto-detect GPS location when form opens (only if no location is set)
  useEffect(() => {
    const hasExistingLocation = screen?.location?.latitude && screen?.location?.longitude;
    if (!hasExistingLocation) {
      getCurrentLocation();
    }
  }, []); // Empty dependency array is now correct

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const handleMapClick = (latlng) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        latitude: latlng.lat,
        longitude: latlng.lng
      }
    }));
  };

  // Default center - use screen location or fallback to London
  const mapCenter = formData.location?.latitude && formData.location?.longitude 
    ? [formData.location.latitude, formData.location.longitude]
    : [51.505, -0.09];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-white shadow-2xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-500" />
                Edit Screen Details
                {gettingLocation && (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GPS Status Alert */}
              {gettingLocation && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Navigation className="h-4 w-4" />
                  <AlertDescription className="text-blue-800">
                    Getting your current location via GPS...
                  </AlertDescription>
                </Alert>
              )}

              {locationError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {locationError}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="ml-3"
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Screen Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Mall Entrance Display"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="screen_id">Screen ID</Label>
                    <Input
                      id="screen_id"
                      value={formData.screen_id}
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group_id">Group</Label>
                    <Select 
                      value={formData.group_id || ""} 
                      onValueChange={(value) => setFormData({...formData, group_id: value || null})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No Group</SelectItem>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} {group.location && `- ${group.location}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resolution">Resolution</Label>
                    <Select 
                      value={formData.resolution} 
                      onValueChange={(value) => setFormData({...formData, resolution: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                        <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                        <SelectItem value="1366x768">1366x768 (HD)</SelectItem>
                        <SelectItem value="1280x720">1280x720 (HD Ready)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="size_inches">Size (inches)</Label>
                    <Input
                      id="size_inches"
                      type="number"
                      value={formData.size_inches}
                      onChange={(e) => setFormData({...formData, size_inches: parseFloat(e.target.value)})}
                      placeholder="32"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orientation">Orientation</Label>
                  <Select 
                    value={formData.orientation} 
                    onValueChange={(value) => setFormData({...formData, orientation: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location Information with Map */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-500" />
                    Location Details
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center gap-2"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    Update GPS Location
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Location Form Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.location?.address || ""}
                        onChange={(e) => handleLocationChange("address", e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.location?.city || ""}
                          onChange={(e) => handleLocationChange("city", e.target.value)}
                          placeholder="New York"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">Region / County</Label>
                        <Input
                          id="region"
                          value={formData.location?.region || ""}
                          onChange={(e) => handleLocationChange("region", e.target.value)}
                          placeholder="e.g., Essex"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.location?.country || ""}
                        onChange={(e) => handleLocationChange("country", e.target.value)}
                        placeholder="United Kingdom"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={formData.location?.latitude || ""}
                          onChange={(e) => handleLocationChange("latitude", parseFloat(e.target.value))}
                          placeholder="40.7128"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={formData.location?.longitude || ""}
                          onChange={(e) => handleLocationChange("longitude", parseFloat(e.target.value))}
                          placeholder="-74.0060"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Map */}
                  <div className="space-y-2">
                    <Label>Screen Location</Label>
                    <p className="text-sm text-slate-500 mb-2">
                      Location auto-detected via GPS. Click on the map to adjust, or use "Update GPS Location" button.
                    </p>
                    <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-200">
                      <MapContainer
                        key={`${formData.location?.latitude}-${formData.location?.longitude}`}
                        center={mapCenter}
                        zoom={15}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {formData.location?.latitude && formData.location?.longitude && (
                          <Marker position={[formData.location.latitude, formData.location.longitude]} />
                        )}
                        <MapEvents onMapClick={handleMapClick} />
                      </MapContainer>
                    </div>
                    {formData.location?.latitude && formData.location?.longitude && (
                      <p className="text-xs text-slate-500">
                        Current location: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  Update Screen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
