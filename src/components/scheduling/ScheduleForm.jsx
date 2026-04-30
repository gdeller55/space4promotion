import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Calendar, Clock, Monitor, PlaySquare } from "lucide-react";

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export default function ScheduleForm({ schedule, screens, playlists, onSave, onCancel }) {
  const [formData, setFormData] = useState(schedule || {
    name: "",
    screen_id: "",
    playlist_id: "",
    start_date: "",
    end_date: "",
    start_time: "09:00",
    end_time: "17:00",
    days_of_week: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    priority: 1,
    status: "scheduled"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-white shadow-2xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-500" />
                {schedule ? "Edit Schedule" : "Create New Schedule"}
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Schedule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Morning Ads Campaign"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="screen_id">Target Screen *</Label>
                    <Select 
                      value={formData.screen_id} 
                      onValueChange={(value) => setFormData({...formData, screen_id: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select screen">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            <span>
                              {screens.find(s => s.id === formData.screen_id)?.name || "Select screen"}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {screens.map(screen => (
                          <SelectItem key={screen.id} value={screen.id}>
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4" />
                              <span>{screen.name}</span>
                              <span className="text-xs text-slate-500">({screen.screen_id})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="playlist_id">Playlist *</Label>
                    <Select 
                      value={formData.playlist_id} 
                      onValueChange={(value) => setFormData({...formData, playlist_id: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select playlist">
                          <div className="flex items-center gap-2">
                            <PlaySquare className="w-4 h-4" />
                            <span>
                              {playlists.find(p => p.id === formData.playlist_id)?.name || "Select playlist"}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {playlists.map(playlist => (
                          <SelectItem key={playlist.id} value={playlist.id}>
                            <div className="flex items-center gap-2">
                              <PlaySquare className="w-4 h-4" />
                              <span>{playlist.name}</span>
                              <span className="text-xs text-slate-500">
                                ({playlist.media_items?.length || 0} items)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  Schedule Period
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Daily Schedule */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Clock className="w-5 h-5 text-slate-500" />
                  Daily Schedule
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    />
                  </div>
                </div>

                {/* Days of Week */}
                <div className="space-y-3">
                  <Label>Active Days</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={formData.days_of_week.includes(day)}
                          onCheckedChange={() => toggleDay(day)}
                        />
                        <Label htmlFor={day} className="text-sm">{day.slice(0, 3)}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority.toString()} 
                      onValueChange={(value) => setFormData({...formData, priority: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Low</SelectItem>
                        <SelectItem value="2">2 - Normal</SelectItem>
                        <SelectItem value="3">3 - High</SelectItem>
                        <SelectItem value="4">4 - Critical</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
                  disabled={!formData.name || !formData.screen_id || !formData.playlist_id}
                >
                  {schedule ? "Update Schedule" : "Create Schedule"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}