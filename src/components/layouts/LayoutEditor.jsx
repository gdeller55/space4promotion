import React, { useState, useEffect, useRef } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const ZONE_COLORS = [
  "#ef4444","#f97316","#f59e0b","#84cc16","#22c55e",
  "#14b8a6","#06b6d4","#3b82f6","#6366f1","#8b5cf6",
  "#a855f7","#ec4899","#f43f5e"
];

export default function LayoutEditor({ layout, onClose }) {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [user, setUser] = useState(null);
  const canvasRef = useRef(null);

  // Load user
  useEffect(() => {
    apiGet("/auth/me").then(setUser).catch(() => {});
  }, []);

  // Load zones
  useEffect(() => {
    if (!layout?.id) return;
    apiGet(`/layout-zones?layout_id=${layout.id}`)
      .then(setZones)
      .catch(console.error);
  }, [layout]);

  // Load playlists
  const [playlists, setPlaylists] = useState([]);
  useEffect(() => {
    if (!user?.email) return;
    apiGet("/playlists").then(setPlaylists).catch(console.error);
  }, [user]);

  // Load media
  const [mediaItems, setMediaItems] = useState([]);
  useEffect(() => {
    if (!user?.email) return;
    apiGet("/media").then(setMediaItems).catch(console.error);
  }, [user]);

  const handleAddZone = async () => {
    const newZone = {
      name: `Zone ${String.fromCharCode(65 + zones.length)}`,
      type: "playlist",
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      z_index: zones.length + 1,
      rotation: 0,
      online_only: false,
      background_color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
      layout_id: layout.id,
      owner_email: user?.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const created = await apiPost("/layout-zones", newZone);
    setZones([...zones, created]);
  };

  const handleUpdateZone = async (id, updates) => {
    const updated = await apiPut(`/layout-zones/${id}`, updates);
    setZones(zones.map(z => z.id === id ? updated : z));
  };

  const handleDeleteZone = async (id) => {
    if (!confirm("Delete this zone?")) return;
    await apiDelete(`/layout-zones/${id}`);
    setZones(zones.filter(z => z.id !== id));
    setSelectedZone(null);
  };

  const scale = Math.min(
    800 / layout.canvas_width,
    600 / layout.canvas_height
  );

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-hidden">
      <div className="h-full flex flex-col">

        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{layout.name}</h2>
            <p className="text-sm text-slate-400">
              {layout.canvas_width}×{layout.canvas_height}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>

        <div className="flex-1 flex">

          {/* Canvas */}
          <div className="flex-1 p-6 flex items-center justify-center bg-slate-800">
            <div
              ref={canvasRef}
              style={{
                width: layout.canvas_width * scale,
                height: layout.canvas_height * scale,
                backgroundColor: "#000",
                position: "relative",
                borderRadius: 8
              }}
            >
              {zones.map((zone, index) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  style={{
                    position: "absolute",
                    left: zone.x * scale,
                    top: zone.y * scale,
                    width: zone.width * scale,
                    height: zone.height * scale,
                    backgroundColor: zone.background_color,
                    border: selectedZone?.id === zone.id
                      ? "3px solid #06b6d4"
                      : "2px solid rgba(255,255,255,0.3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff"
                  }}
                >
                  {zone.name}
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <Button onClick={handleAddZone}>
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </Button>
            </div>
          </div>

          {/* Properties */}
          <div className="w-80 bg-slate-900 p-4 overflow-y-auto">
            {selectedZone && (
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    Zone Properties
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteZone(selectedZone.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  <div>
                    <Label>Name</Label>
                    <Input
                      value={selectedZone.name}
                      onChange={e => {
                        const name = e.target.value;
                        setSelectedZone({...selectedZone, name});
                        handleUpdateZone(selectedZone.id, { name });
                      }}
                    />
                  </div>

                  <div>
                    <Label>Type</Label>
                    <Select
                      value={selectedZone.type}
                      onValueChange={value => {
                        setSelectedZone({...selectedZone, type: value});
                        handleUpdateZone(selectedZone.id, { type: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="playlist">Playlist</SelectItem>
                        <SelectItem value="media">Single Media</SelectItem>
                        <SelectItem value="live_news">Live News</SelectItem>
                        <SelectItem value="live_weather">Live Weather</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}