import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X, Globe, ImageIcon } from "lucide-react";

function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function GeoFenceForm({ fence, media, onSave, onCancel }) {
  const [formData, setFormData] = useState(fence || {
    name: "",
    center: { lat: 51.505, lng: -0.09 },
    radius_meters: 1000,
    assigned_media_id: "",
    status: "draft"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleMapClick = (latlng) => {
    setFormData(prev => ({ ...prev, center: latlng }));
  };

  const handleRadiusChange = (value) => {
    setFormData(prev => ({ ...prev, radius_meters: value[0] }));
  };

  const mapKey = useMemo(() => JSON.stringify(formData.center), [formData.center]);

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
                <Globe className="w-5 h-5 text-cyan-500" />
                {fence ? "Edit Geo-Fence" : "Create New Geo-Fence"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form Fields */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Downtown Lunch Special"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assigned_media_id">Assigned Media *</Label>
                  <Select
                    value={formData.assigned_media_id}
                    onValueChange={(value) => setFormData({...formData, assigned_media_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select media to display" />
                    </SelectTrigger>
                    <SelectContent>
                      {media.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            <span>{m.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Radius: {(formData.radius_meters / 1000).toFixed(2)} km</Label>
                  <Slider
                    value={[formData.radius_meters]}
                    onValueChange={handleRadiusChange}
                    min={100}
                    max={10000}
                    step={100}
                  />
                </div>

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
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                    disabled={!formData.name || !formData.assigned_media_id}
                  >
                    {fence ? "Update Geo-Fence" : "Create Geo-Fence"}
                  </Button>
                </div>
              </div>

              {/* Map */}
              <div className="space-y-2">
                <Label>Set Fence Location</Label>
                 <p className="text-sm text-slate-500">
                    Click on the map to set the center of the geo-fence.
                  </p>
                <div className="h-96 w-full rounded-lg overflow-hidden border">
                  <MapContainer
                    key={mapKey}
                    center={formData.center}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Circle
                      center={formData.center}
                      radius={formData.radius_meters}
                      pathOptions={{ color: 'cyan', fillColor: 'cyan', fillOpacity: 0.3 }}
                    />
                    <MapEvents onMapClick={handleMapClick} />
                  </MapContainer>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}