import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import StatCard from "../components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Monitor,
  CheckCircle,
  PlaySquare,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow, startOfWeek, endOfWeek } from "date-fns";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: userAreas = [] } = useQuery({
    queryKey: ['userAreaAssignments', user?.id],
    queryFn: () => base44.entities.UserAreaAssignment.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const allowedAreaIds = userAreas.map(ua => ua.area_id);

  const { data: allScreens = [], isLoading: loadingScreens } = useQuery({
    queryKey: ['screens'],
    queryFn: () => base44.entities.Screen.filter({ is_paired: true }),
    staleTime: 60000, // Cache for 60 seconds
  });

  const screens = allScreens.filter(screen => 
    allowedAreaIds.length === 0 || !screen.area_id || allowedAreaIds.includes(screen.area_id)
  );

  const { data: playlists = [], isLoading: loadingPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => base44.entities.Playlist.list(),
    staleTime: 60000,
  });

  const { data: media = [], isLoading: loadingMedia } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.Media.list(),
    staleTime: 60000,
  });

  // Check weekly checklist status
  const { data: weeklyChecklist } = useQuery({
    queryKey: ['weekly-checklist', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekStartStr = weekStart.toISOString();
      const checklists = await base44.entities.WeeklyChecklist.filter({
        owner_user_id: user.id,
        week_start_date: weekStartStr
      });
      return checklists.length > 0 ? checklists[0] : null;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const loading = loadingScreens || loadingPlaylists || loadingMedia;

  const stats = {
    totalScreens: screens.length,
    onlineScreens: screens.filter(s => s.status === "online").length,
    offlineScreens: screens.filter(s => s.status === "offline").length,
    totalPlaylists: playlists.length,
    activePlaylists: playlists.filter(p => p.status === "active").length,
    totalMedia: media.length,
  };

  const recentScreens = [...screens]
    .sort((a, b) => new Date(b.last_heartbeat || 0) - new Date(a.last_heartbeat || 0))
    .slice(0, 5);

  const needsAttention = screens.filter(s => {
    const lastHeartbeat = s.last_heartbeat ? new Date(s.last_heartbeat) : null;
    const minutesSinceHeartbeat = lastHeartbeat ? (Date.now() - lastHeartbeat) / 60000 : 9999;
    return s.status === "offline" || minutesSinceHeartbeat > 5;
  });

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-1" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            Welcome back, {user?.full_name?.split(" ")[0] || 'Admin'}
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor and manage your digital signage network
          </p>
        </div>

        {/* Weekly Checklist Banner */}
        {weeklyChecklist && weeklyChecklist.status !== 'completed' && (
          <Alert className="mb-6 border-cyan-200 bg-cyan-50">
            <ClipboardList className="h-4 w-4 text-cyan-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-cyan-900">
                Your weekly reporting checklist is not complete yet
              </span>
              <Button asChild size="sm" variant="default" className="bg-cyan-600 hover:bg-cyan-700">
                <Link to={createPageUrl("Reports")}>
                  Complete Checklist <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Button asChild>
            <Link to={createPageUrl("Screens")}>
              <Plus className="w-4 h-4 mr-2" /> Pair Screen
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={createPageUrl("Media")}>
              <Plus className="w-4 h-4 mr-2" /> Upload Media
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={createPageUrl("Playlists")}>
              <Plus className="w-4 h-4 mr-2" /> Create Playlist
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Screens"
            value={stats.totalScreens}
            icon={Monitor}
            color="cyan"
            details={`${stats.onlineScreens} online, ${stats.offlineScreens} offline`}
          />
          <StatCard
            title="Online Status"
            value={`${
              stats.totalScreens > 0
                ? Math.round((stats.onlineScreens / stats.totalScreens) * 100)
                : 0
            }%`}
            icon={CheckCircle}
            color="green"
            details="Network health"
          />
          <StatCard
            title="Active Playlists"
            value={stats.activePlaylists}
            icon={PlaySquare}
            color="purple"
            details={`of ${stats.totalPlaylists} total`}
          />
          <StatCard
            title="Media Items"
            value={stats.totalMedia}
            icon={ImageIcon}
            color="orange"
            details="In library"
          />
        </div>

        {/* Attention Required & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {needsAttention.length > 0 && (
            <div className="lg:col-span-1">
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-orange-900">Needs Attention</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {needsAttention.slice(0, 5).map((screen) => (
                      <div key={screen.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{screen.name}</p>
                          <p className="text-xs text-slate-500">
                            {screen.last_heartbeat 
                              ? `Last seen ${formatDistanceToNow(new Date(screen.last_heartbeat), { addSuffix: true })}`
                              : 'Never connected'
                            }
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      </div>
                    ))}
                  </div>
                  {needsAttention.length > 5 && (
                    <Button asChild variant="ghost" size="sm" className="w-full mt-3">
                      <Link to={createPageUrl("Screens")}>
                        View all {needsAttention.length} screens <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className={needsAttention.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Recently Active Screens</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={createPageUrl("Screens")}>
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentScreens.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Monitor className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="font-medium mb-1">No screens paired yet</p>
                    <p className="text-sm mb-4">Get started by pairing your first screen</p>
                    <Button asChild size="sm">
                      <Link to={createPageUrl("Screens")}>
                        <Plus className="w-4 h-4 mr-2" /> Pair Screen
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentScreens.map((screen) => (
                      <div key={screen.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${screen.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{screen.name}</p>
                            <p className="text-xs text-slate-500">
                              {screen.location?.city || 'No location'} • {screen.screen_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${screen.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                            {screen.status.charAt(0).toUpperCase() + screen.status.slice(1)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {screen.last_heartbeat ? formatDistanceToNow(new Date(screen.last_heartbeat), { addSuffix: true }) : 'Never'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}