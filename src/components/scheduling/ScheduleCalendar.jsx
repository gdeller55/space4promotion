import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

export default function ScheduleCalendar({ schedules, screens, playlists, onEditSchedule }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSchedulesForDay = (day) => {
    return schedules.filter(schedule => {
      const startDate = new Date(schedule.start_date);
      const endDate = new Date(schedule.end_date);
      const dayOfWeek = format(day, 'EEEE');
      
      return day >= startDate && 
             day <= endDate && 
             schedule.days_of_week?.includes(dayOfWeek);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-medium text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-4">
          {monthDays.map(day => {
            const daySchedules = getSchedulesForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border rounded-lg ${
                  isToday 
                    ? 'border-cyan-300 bg-cyan-50' 
                    : isSameMonth(day, currentDate)
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday 
                    ? 'text-cyan-600' 
                    : isSameMonth(day, currentDate)
                    ? 'text-slate-900'
                    : 'text-slate-400'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {daySchedules.slice(0, 2).map(schedule => {
                    const screen = screens.find(s => s.id === schedule.screen_id);
                    const playlist = playlists.find(p => p.id === schedule.playlist_id);
                    
                    return (
                      <div
                        key={schedule.id}
                        onClick={() => onEditSchedule(schedule)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Badge 
                          className={`text-xs w-full justify-start truncate ${getStatusColor(schedule.status)}`}
                        >
                          <div className="flex items-center gap-1 w-full">
                            <Clock className="w-3 h-3" />
                            <span className="truncate">{schedule.name}</span>
                          </div>
                        </Badge>
                        <div className="text-xs text-slate-500 mt-1 px-1">
                          {schedule.start_time} - {schedule.end_time}
                        </div>
                      </div>
                    );
                  })}
                  
                  {daySchedules.length > 2 && (
                    <div className="text-xs text-slate-500 px-1">
                      +{daySchedules.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-sm text-slate-600">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-sm text-slate-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span className="text-sm text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm text-slate-600">Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}