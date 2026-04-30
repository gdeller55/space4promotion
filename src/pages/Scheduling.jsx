
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, Monitor, PlaySquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

import ScheduleForm from "../components/scheduling/ScheduleForm";
import ScheduleCalendar from "../components/scheduling/ScheduleCalendar";

export default function Scheduling() {
  const [schedules, setSchedules] = useState([]);
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewMode, setViewMode] = useState("calendar"); // calendar or list

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesData, screensData, playlistsData] = await Promise.all([
        base44.entities.Schedule.list("-created_date"),
        base44.entities.Screen.list(),
        base44.entities.Playlist.filter({status: "active"})
      ]);
      setSchedules(schedulesData);
      setScreens(screensData);
      setPlaylists(playlistsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (scheduleData) => {
    try {
      if (editingSchedule) {
        await base44.entities.Schedule.update(editingSchedule.id, scheduleData);
      } else {
        await base44.entities.Schedule.create(scheduleData);
      }
      setShowForm(false);
      setEditingSchedule(null);
      loadData();
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
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
              Content Scheduling
            </h1>
            <p className="text-slate-600">Plan when and where your content plays</p>
          </div>
          <div className="flex gap-3">
            <div className="flex border border-slate-200 rounded-lg p-1 bg-white">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={viewMode === "calendar" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
              >
                List View
              </Button>
            </div>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Content
            </Button>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <ScheduleCalendar 
            schedules={schedules} 
            screens={screens} 
            playlists={playlists}
            onEditSchedule={(schedule) => {
              setEditingSchedule(schedule);
              setShowForm(true);
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Active Schedules */}
            <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Active Schedules
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedules.filter(s => s.status === 'active').length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active schedules</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.filter(s => s.status === 'active').map((schedule, index) => (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-green-200 bg-green-50/50 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{schedule.name}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Monitor className="w-4 h-4" />
                                <span>
                                  {screens.find(s => s.id === schedule.screen_id)?.name || "Unknown Screen"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <PlaySquare className="w-4 h-4" />
                                <span>
                                  {playlists.find(p => p.id === schedule.playlist_id)?.name || "Unknown Playlist"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            {schedule.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Duration</p>
                            <p className="font-medium text-slate-900">
                              {format(new Date(schedule.start_date), "MMM d")} - {format(new Date(schedule.end_date), "MMM d")}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Daily Time</p>
                            <p className="font-medium text-slate-900">
                              {schedule.start_time} - {schedule.end_time}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Days</p>
                            <p className="font-medium text-slate-900">
                              {schedule.days_of_week?.join(", ") || "All days"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Schedules */}
            <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">
                  Upcoming Schedules
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedules.filter(s => s.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming schedules</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.filter(s => s.status === 'scheduled').map((schedule, index) => (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-blue-200 bg-blue-50/50 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{schedule.name}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Monitor className="w-4 h-4" />
                                <span>
                                  {screens.find(s => s.id === schedule.screen_id)?.name || "Unknown Screen"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <PlaySquare className="w-4 h-4" />
                                <span>
                                  {playlists.find(p => p.id === schedule.playlist_id)?.name || "Unknown Playlist"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {schedule.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Starts</p>
                            <p className="font-medium text-slate-900">
                              {format(new Date(schedule.start_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Daily Time</p>
                            <p className="font-medium text-slate-900">
                              {schedule.start_time} - {schedule.end_time}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Priority</p>
                            <p className="font-medium text-slate-900">
                              {schedule.priority || "Normal"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {schedules.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No schedules created yet
            </h3>
            <p className="text-slate-500 mb-4">
              Start scheduling your content to display at specific times
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Schedule
            </Button>
          </div>
        )}

        {/* Schedule Form Modal */}
        <AnimatePresence>
          {showForm && (
            <ScheduleForm
              schedule={editingSchedule}
              screens={screens}
              playlists={playlists}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingSchedule(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
