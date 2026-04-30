
import React, { useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, MapPin, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import GeoFenceForm from "../components/geotargeting/GeoFenceForm";

export default function GeoTargeting() {
  const [fences, setFences] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFence, setEditingFence] = useState(null);
  const [selectedFence, setSelectedFence] = useState(null); // Added from outline
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Added from outline

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fencesData, mediaData] = await Promise.all([
        base44.entities.GeoFence.list(), // Updated to use base44 client
        base44.entities.Media.list()    // Updated to use base44 client
      ]);
      setFences(fencesData);
      setMedia(mediaData);
    } catch (error) {
      console.error("Error loading geo-targeting data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fenceData) => {
    try {
      if (editingFence) {
        await base44.entities.GeoFence.update(editingFence.id, fenceData); // Updated to use base44 client
      } else {
        await base44.entities.GeoFence.create(fenceData); // Updated to use base44 client
      }
      setShowForm(false);
      setEditingFence(null);
      loadData();
    } catch (error) {
      console.error("Error saving geo-fence:", error);
    }
  };

  const handleDelete = async (fenceId) => { // Added from outline
    if (window.confirm("Are you sure you want to delete this geo-fence?")) {
      try {
        await base44.entities.GeoFence.delete(fenceId); // Updated to use base44 client
        loadData();
      } catch (error) {
        console.error("Error deleting geo-fence:", error);
      }
    }
  };

  // handleMapClick was mentioned in the outline but not present in the current file.
  // Not adding it to preserve original functionality unless specified to add.

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Geo-Targeting Campaigns
            </h1>
            <p className="text-slate-600">Create location-based advertising zones</p>
          </div>
          <Button 
            onClick={() => {
              setEditingFence(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Geo-Fence
          </Button>
        </div>

        {/* Geo-Fence List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {fences.map((fence, index) => {
              const assignedMedia = media.find(m => m.id === fence.assigned_media_id);
              return (
                <motion.div
                  key={fence.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold text-slate-900 truncate">
                              {fence.name}
                            </CardTitle>
                            <Badge 
                              className={`mt-1 text-xs ${
                                fence.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              {fence.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>Radius: {(fence.radius_meters / 1000).toFixed(2)} km</span>
                      </div>

                      {assignedMedia && (
                        <div className="pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-2">Assigned Media:</p>
                          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                            <ImageIcon className="w-5 h-5 text-slate-500" />
                            <p className="font-medium text-slate-900 truncate">
                              {assignedMedia.title}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 mt-2"
                          onClick={() => {
                            setEditingFence(fence);
                            setShowForm(true);
                          }}
                        >
                          Edit Fence
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="w-1/4 mt-2"
                          onClick={() => handleDelete(fence.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {fences.length === 0 && !loading && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No Geo-Fences Created
            </h3>
            <p className="text-slate-500 mb-4">
              Create a geo-fence to target specific locations with your ads.
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Geo-Fence
            </Button>
          </div>
        )}

        {/* GeoFence Form Modal */}
        <AnimatePresence>
          {showForm && (
            <GeoFenceForm
              fence={editingFence}
              media={media}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingFence(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
