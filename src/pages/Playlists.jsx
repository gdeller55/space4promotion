import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  PlaySquare, 
  Search,
  Edit,
  MoreVertical,
  Clock,
  Image as ImageIcon,
  Monitor,
  Users,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import PlaylistForm from "../components/playlists/PlaylistForm";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [media, setMedia] = useState([]);
  const [screens, setScreens] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [playlistsData, mediaData, screensData, groupsData] = await Promise.all([
        base44.entities.Playlist.list("-updated_date"),
        base44.entities.Media.list(),
        base44.entities.Screen.list(),
        base44.entities.ScreenGroup.list()
      ]);
      setPlaylists(playlistsData);
      setMedia(mediaData);
      setScreens(screensData);
      setGroups(groupsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (playlistData) => {
    try {
      if (editingPlaylist) {
        await base44.entities.Playlist.update(editingPlaylist.id, playlistData);
      } else {
        await base44.entities.Playlist.create(playlistData);
      }
      setShowForm(false);
      setEditingPlaylist(null);
      loadData();
    } catch (error) {
      console.error("Error saving playlist:", error);
    }
  };

  const handleDelete = async (playlistId) => {
    if (!confirm("Are you sure you want to delete this playlist? This action cannot be undone.")) {
      return;
    }
    try {
      await base44.entities.Playlist.delete(playlistId);
      loadData();
    } catch (error) {
      console.error("Error deleting playlist:", error);
    }
  };

  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (playlist.description && playlist.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || playlist.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
              Timeline Manager
            </h1>
            <p className="text-slate-600">Create and organize content sequences for your screens</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Timeline
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search timelines by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {["all", "draft", "active", "archived"].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Playlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPlaylists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          playlist.status === 'active' 
                            ? 'bg-gradient-to-r from-green-400 to-green-500' 
                            : playlist.status === 'draft'
                            ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}>
                          <PlaySquare className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold text-slate-900 truncate">
                            {playlist.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              className={`text-xs ${
                                playlist.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : playlist.status === 'draft'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              {playlist.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => {
                            setEditingPlaylist(playlist);
                            setShowForm(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Timeline
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(playlist.id)}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Timeline
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {playlist.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {playlist.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          {playlist.media_items?.length || 0} items
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          {formatDuration(playlist.total_duration_seconds || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Display assigned screens */}
                    {playlist.assigned_screens && playlist.assigned_screens.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Assigned to screens:</p>
                        <div className="flex flex-wrap gap-1">
                          {playlist.assigned_screens.slice(0, 2).map((screenId, i) => {
                            const screen = screens.find(s => s.id === screenId);
                            return (
                              <Badge key={i} variant="outline" className="text-xs">
                                <Monitor className="w-3 h-3 mr-1" />
                                {screen?.name || screenId}
                              </Badge>
                            );
                          })}
                          {playlist.assigned_screens.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{playlist.assigned_screens.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Display assigned groups */}
                    {playlist.assigned_groups && playlist.assigned_groups.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Assigned to groups:</p>
                        <div className="flex flex-wrap gap-1">
                          {playlist.assigned_groups.slice(0, 2).map((groupId, i) => {
                            const group = groups.find(g => g.id === groupId);
                            return (
                              <Badge key={i} variant="outline" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {group?.name || groupId}
                              </Badge>
                            );
                          })}
                          {playlist.assigned_groups.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{playlist.assigned_groups.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredPlaylists.length === 0 && !loading && (
          <div className="text-center py-12">
            <PlaySquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchTerm || statusFilter !== "all" ? "No timelines match your filters" : "No timelines created"}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search criteria" 
                : "Create your first timeline to organize your media content"
              }
            </p>
            {(!searchTerm && statusFilter === "all") && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:bg-cyan-600 hover:to-cyan-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Timeline
              </Button>
            )}
          </div>
        )}

        {/* Timeline Form Modal */}
        <AnimatePresence>
          {showForm && (
            <PlaylistForm
              playlist={editingPlaylist}
              media={media}
              screens={screens}
              groups={groups}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingPlaylist(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}