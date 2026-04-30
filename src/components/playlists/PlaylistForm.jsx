import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  X, 
  PlaySquare, 
  Plus, 
  Trash2, 
  GripVertical,
  Clock,
  Image as ImageIcon,
  Monitor,
  Users
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function PlaylistForm({ playlist, media, screens, groups, onSave, onCancel }) {
  const [formData, setFormData] = useState(playlist || {
    name: "",
    description: "",
    media_items: [],
    loop_enabled: true,
    status: "draft",
    assigned_screens: [],
    assigned_groups: []
  });

  // Ensure arrays are always initialized
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      assigned_screens: prev.assigned_screens || [],
      assigned_groups: prev.assigned_groups || [],
      media_items: prev.media_items || []
    }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate total duration
    const totalDuration = (formData.media_items || []).reduce((sum, item) => {
      const mediaItem = media.find(m => m.id === item.media_id);
      return sum + (item.duration_seconds || mediaItem?.duration_seconds || 10);
    }, 0);

    onSave({
      ...formData,
      total_duration_seconds: totalDuration,
      assigned_screens: formData.assigned_screens || [],
      assigned_groups: formData.assigned_groups || []
    });
  };

  const addMediaItem = (mediaId) => {
    const mediaItem = media.find(m => m.id === mediaId);
    const currentItems = formData.media_items || [];
    if (mediaItem && !currentItems.find(item => item.media_id === mediaId)) {
      setFormData(prev => ({
        ...prev,
        media_items: [
          ...currentItems,
          {
            media_id: mediaId,
            duration_seconds: mediaItem.duration_seconds || 10,
            order: currentItems.length
          }
        ]
      }));
    }
  };

  const removeMediaItem = (index) => {
    setFormData(prev => ({
      ...prev,
      media_items: (prev.media_items || []).filter((_, i) => i !== index)
    }));
  };

  const updateMediaItemDuration = (index, duration) => {
    setFormData(prev => ({
      ...prev,
      media_items: (prev.media_items || []).map((item, i) => 
        i === index ? { ...item, duration_seconds: parseInt(duration) } : item
      )
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.media_items || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setFormData(prev => ({
      ...prev,
      media_items: updatedItems
    }));
  };

  const toggleScreenAssignment = (screenId) => {
    const currentScreens = formData.assigned_screens || [];
    setFormData(prev => ({
      ...prev,
      assigned_screens: currentScreens.includes(screenId)
        ? currentScreens.filter(id => id !== screenId)
        : [...currentScreens, screenId]
    }));
  };

  const toggleGroupAssignment = (groupId) => {
    const currentGroups = formData.assigned_groups || [];
    setFormData(prev => ({
      ...prev,
      assigned_groups: currentGroups.includes(groupId)
        ? currentGroups.filter(id => id !== groupId)
        : [...currentGroups, groupId]
    }));
  };

  const availableMedia = media.filter(m => 
    !(formData.media_items || []).find(item => item.media_id === m.id)
  );

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-white shadow-2xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <PlaySquare className="w-5 h-5 text-cyan-500" />
                {playlist ? "Edit Timeline" : "Create New Timeline"}
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
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Timeline Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter timeline name"
                      required
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
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="loop_enabled"
                      checked={formData.loop_enabled}
                      onCheckedChange={(checked) => setFormData({...formData, loop_enabled: checked})}
                    />
                    <Label htmlFor="loop_enabled">Loop timeline continuously</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe this timeline..."
                    rows={6}
                  />
                </div>
              </div>

              {/* Assignment Section */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h3 className="text-lg font-medium text-slate-900">Assign Timeline</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Screen Assignment */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Individual Screens
                    </Label>
                    <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {screens.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No screens available</p>
                      ) : (
                        <div className="space-y-2">
                          {screens.map(screen => (
                            <div key={screen.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`screen-${screen.id}`}
                                checked={(formData.assigned_screens || []).includes(screen.id)}
                                onCheckedChange={() => toggleScreenAssignment(screen.id)}
                              />
                              <Label htmlFor={`screen-${screen.id}`} className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span>{screen.name}</span>
                                  <span className="text-xs text-slate-500">{screen.screen_id}</span>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group Assignment */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Screen Groups
                    </Label>
                    <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {groups.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No groups available</p>
                      ) : (
                        <div className="space-y-2">
                          {groups.map(group => (
                            <div key={group.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`group-${group.id}`}
                                checked={(formData.assigned_groups || []).includes(group.id)}
                                onCheckedChange={() => toggleGroupAssignment(group.id)}
                              />
                              <Label htmlFor={`group-${group.id}`} className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span>{group.name}</span>
                                  {group.location && (
                                    <span className="text-xs text-slate-500">{group.location}</span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Timeline */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                {/* Available Media */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900">Available Media</h3>
                  <div className="border border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {availableMedia.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">
                        {media.length === 0 
                          ? "No media files available. Upload some media first."
                          : "All media items are already in the timeline."
                        }
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableMedia.map(mediaItem => (
                          <div
                            key={mediaItem.id}
                            className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="font-medium text-slate-900">{mediaItem.title}</p>
                                <p className="text-xs text-slate-500">
                                  {mediaItem.type} • {formatDuration(mediaItem.duration_seconds || 10)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addMediaItem(mediaItem.id)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-900">Timeline Sequence</h3>
                    <div className="text-sm text-slate-500">
                      Total: {formatDuration(
                        (formData.media_items || []).reduce((sum, item) => {
                          return sum + (item.duration_seconds || 10);
                        }, 0)
                      )}
                    </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {(formData.media_items || []).length === 0 ? (
                      <p className="text-center text-slate-500 py-8">
                        No media items in timeline. Add some from the left panel.
                      </p>
                    ) : (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="timeline-items">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {(formData.media_items || []).map((item, index) => {
                                const mediaItem = media.find(m => m.id === item.media_id);
                                return (
                                  <Draggable key={item.media_id} draggableId={item.media_id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg bg-white"
                                      >
                                        <div {...provided.dragHandleProps}>
                                          <GripVertical className="w-4 h-4 text-slate-400" />
                                        </div>
                                        
                                        <div className="w-8 h-6 bg-slate-100 rounded flex items-center justify-center text-xs font-medium text-slate-600">
                                          {index + 1}
                                        </div>
                                        
                                        <ImageIcon className="w-4 h-4 text-slate-400" />
                                        
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-slate-900 truncate">
                                            {mediaItem?.title}
                                          </p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-slate-500">
                                              {mediaItem?.type}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-slate-400" />
                                              <Input
                                                type="number"
                                                min="1"
                                                value={item.duration_seconds}
                                                onChange={(e) => updateMediaItemDuration(index, e.target.value)}
                                                className="w-16 h-6 text-xs"
                                              />
                                              <span className="text-xs text-slate-500">s</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeMediaItem(index)}
                                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
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
                  disabled={!formData.name || (formData.media_items || []).length === 0}
                >
                  {playlist ? "Update Timeline" : "Create Timeline"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}