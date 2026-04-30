import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Download, Calendar as CalendarIcon, TrendingUp, Play, Monitor, Film, Share2, Copy, Check, Activity, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { SkeletonCard } from '../components/common/SkeletonCard';
import WeeklyTemplateManager from '../components/reports/WeeklyTemplateManager';
import PDFDownloader from '../components/reports/PDFDownloader';

export default function Reports() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedScreen, setSelectedScreen] = useState('all');
  const [selectedPlaylist, setSelectedPlaylist] = useState('all');
  const [selectedMedia, setSelectedMedia] = useState('all');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('all');
  const [drillDownMedia, setDrillDownMedia] = useState(null);
  const [mediaSortBy, setMediaSortBy] = useState('plays');
  const [screenSortBy, setScreenSortBy] = useState('plays');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [hideUnassigned, setHideUnassigned] = useState(false);
  const [expiryOption, setExpiryOption] = useState('7d');
  const [customExpiryDate, setCustomExpiryDate] = useState(null);
  const [showWeeklyTemplates, setShowWeeklyTemplates] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch user's screens
  const { data: userScreens = [], isLoading: screensLoading } = useQuery({
    queryKey: ['user-screens', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Screen.filter({ owner_user_id: user.id });
    },
    enabled: !!user?.id
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.ScreenGroup.filter({ owner_user_id: user.id });
    },
    enabled: !!user?.id
  });

  // Fetch playlists
  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Playlist.filter({ created_by_user_id: user.id });
    },
    enabled: !!user?.id
  });

  // Fetch all media
  const { data: allMedia = [] } = useQuery({
    queryKey: ['media', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Media.filter({ created_by_user_id: user.id });
    },
    enabled: !!user?.id
  });

  // Fetch recent share links
  const { data: recentShares = [], refetch: refetchShares } = useQuery({
    queryKey: ['report-shares', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const shares = await base44.entities.ReportShare.filter(
        { owner_user_id: user.id },
        '-created_at',
        10
      );
      return shares;
    },
    enabled: !!user?.id
  });

  // Fetch playback events
  const { data: playbackEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['playback-events', dateRange, user?.id],
    queryFn: async () => {
      if (!user?.id || userScreens.length === 0) return [];
      
      const screenIds = userScreens.map(s => s.screen_id);
      
      // Fetch events in date range
      const allEvents = await base44.entities.PlaybackEvent.list('-played_at', 50000);
      
      // Filter by date range and user's screens
      const fromTime = dateRange.from.getTime();
      const toTime = dateRange.to.setHours(23, 59, 59, 999);
      
      return allEvents.filter(event => {
        if (!screenIds.includes(event.screen_id)) return false;
        const eventTime = new Date(event.played_at).getTime();
        return eventTime >= fromTime && eventTime <= toTime;
      });
    },
    enabled: !!user?.id && userScreens.length > 0
  });

  // Fetch advertisers from Advertiser entity
  const { data: advertiserEntities = [] } = useQuery({
    queryKey: ['advertisers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Advertiser.filter({ owner_user_id: user.id }, 'name');
    },
    enabled: !!user?.id
  });

  // Combine advertisers from entity and media tags
  const advertisers = useMemo(() => {
    const advertiserSet = new Set();
    
    // Add from Advertiser entity
    advertiserEntities.forEach(adv => {
      advertiserSet.add(adv.name);
    });
    
    // Add from media tags (for backwards compatibility)
    allMedia.forEach(media => {
      if (media.tags && Array.isArray(media.tags)) {
        media.tags.forEach(tag => {
          if (tag.startsWith('advertiser:')) {
            advertiserSet.add(tag.replace('advertiser:', ''));
          }
        });
      }
    });
    
    return Array.from(advertiserSet).sort();
  }, [allMedia, advertiserEntities]);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    let filtered = [...playbackEvents];

    // Filter by group
    if (selectedGroup !== 'all') {
      const groupScreens = userScreens.filter(s => s.group_id === selectedGroup).map(s => s.screen_id);
      filtered = filtered.filter(e => groupScreens.includes(e.screen_id));
    }

    // Filter by screen
    if (selectedScreen !== 'all') {
      const screen = userScreens.find(s => s.id === selectedScreen);
      if (screen) {
        filtered = filtered.filter(e => e.screen_id === screen.screen_id);
      }
    }

    // Filter by playlist
    if (selectedPlaylist !== 'all') {
      filtered = filtered.filter(e => e.playlist_id === selectedPlaylist);
    }

    // Filter by media
    if (selectedMedia !== 'all') {
      filtered = filtered.filter(e => e.media_id === selectedMedia);
    }

    // Filter by advertiser
    if (selectedAdvertiser !== 'all') {
      const advertiserMedia = allMedia.filter(m => 
        m.tags && m.tags.some(tag => tag === `advertiser:${selectedAdvertiser}`)
      ).map(m => m.id);
      filtered = filtered.filter(e => advertiserMedia.includes(e.media_id));
    }

    return filtered;
  }, [playbackEvents, selectedGroup, selectedScreen, selectedPlaylist, selectedMedia, selectedAdvertiser, userScreens, allMedia]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalPlays = filteredEvents.length;
    const totalSeconds = filteredEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    const activeScreens = new Set(filteredEvents.map(e => e.screen_id)).size;
    const uniqueMedia = new Set(filteredEvents.map(e => e.media_id)).size;

    return { totalPlays, totalSeconds, activeScreens, uniqueMedia };
  }, [filteredEvents]);

  // Media performance table data
  const mediaPerformance = useMemo(() => {
    const mediaMap = new Map();

    filteredEvents.forEach(event => {
      if (!mediaMap.has(event.media_id)) {
        mediaMap.set(event.media_id, {
          media_id: event.media_id,
          plays: 0,
          totalSeconds: 0,
          screens: new Set(),
          lastPlayed: event.played_at
        });
      }

      const entry = mediaMap.get(event.media_id);
      entry.plays++;
      entry.totalSeconds += event.duration_seconds || 0;
      entry.screens.add(event.screen_id);
      if (new Date(event.played_at) > new Date(entry.lastPlayed)) {
        entry.lastPlayed = event.played_at;
      }
    });

    let result = Array.from(mediaMap.values()).map(entry => {
      const media = allMedia.find(m => m.id === entry.media_id);
      const advertiser = media?.tags?.find(tag => tag.startsWith('advertiser:'))?.replace('advertiser:', '') || 'Unassigned';

      return {
        ...entry,
        media,
        advertiser,
        screenCount: entry.screens.size
      };
    });

    // Filter out unassigned if toggle is on
    if (hideUnassigned) {
      result = result.filter(r => r.advertiser !== 'Unassigned');
    }

    // Sort
    result.sort((a, b) => {
      if (mediaSortBy === 'plays') return b.plays - a.plays;
      if (mediaSortBy === 'totalSeconds') return b.totalSeconds - a.totalSeconds;
      if (mediaSortBy === 'screens') return b.screenCount - a.screenCount;
      if (mediaSortBy === 'lastPlayed') return new Date(b.lastPlayed) - new Date(a.lastPlayed);
      return 0;
    });

    return result;
  }, [filteredEvents, allMedia, mediaSortBy]);

  // Diagnostic metrics
  const diagnosticMetrics = useMemo(() => {
    const totalRawEvents = playbackEvents.length;
    
    // Group by date
    const eventsByDate = new Map();
    playbackEvents.forEach(event => {
      const date = format(new Date(event.played_at), 'yyyy-MM-dd');
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, 0);
      }
      eventsByDate.set(date, eventsByDate.get(date) + 1);
    });
    
    const dateGroups = Array.from(eventsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Top 5 screens by event count
    const screenEventCounts = new Map();
    playbackEvents.forEach(event => {
      if (!screenEventCounts.has(event.screen_id)) {
        screenEventCounts.set(event.screen_id, 0);
      }
      screenEventCounts.set(event.screen_id, screenEventCounts.get(event.screen_id) + 1);
    });
    
    const topScreens = Array.from(screenEventCounts.entries())
      .map(([screen_id, count]) => {
        const screen = userScreens.find(s => s.screen_id === screen_id);
        return { screen_id, screen, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return { totalRawEvents, dateGroups, topScreens };
  }, [playbackEvents, userScreens]);

  // Screen performance table data
  const screenPerformance = useMemo(() => {
    const screenMap = new Map();

    filteredEvents.forEach(event => {
      if (!screenMap.has(event.screen_id)) {
        screenMap.set(event.screen_id, {
          screen_id: event.screen_id,
          plays: 0,
          totalSeconds: 0,
          lastPlayed: event.played_at
        });
      }

      const entry = screenMap.get(event.screen_id);
      entry.plays++;
      entry.totalSeconds += event.duration_seconds || 0;
      if (new Date(event.played_at) > new Date(entry.lastPlayed)) {
        entry.lastPlayed = event.played_at;
      }
    });

    const result = Array.from(screenMap.values()).map(entry => {
      const screen = userScreens.find(s => s.screen_id === entry.screen_id);
      const group = groups.find(g => g.id === screen?.group_id);

      return {
        ...entry,
        screen,
        group
      };
    });

    // Sort
    result.sort((a, b) => {
      if (screenSortBy === 'plays') return b.plays - a.plays;
      if (screenSortBy === 'totalSeconds') return b.totalSeconds - a.totalSeconds;
      if (screenSortBy === 'lastPlayed') return new Date(b.lastPlayed) - new Date(a.lastPlayed);
      return 0;
    });

    return result;
  }, [filteredEvents, userScreens, groups, screenSortBy]);

  // Generate share link
  const generateShareLink = async () => {
    try {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const now = new Date();
      let expiresAt;
      
      // Calculate expiry based on selected option
      switch (expiryOption) {
        case '24h':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (!customExpiryDate) {
            toast.error('Please select a custom expiry date');
            return;
          }
          expiresAt = customExpiryDate;
          break;
        default:
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      const filtersJson = JSON.stringify({
        group: selectedGroup,
        screen: selectedScreen,
        playlist: selectedPlaylist,
        media: selectedMedia,
        advertiser: selectedAdvertiser
      });

      await base44.entities.ReportShare.create({
        token,
        owner_user_id: user.id,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        filters_json: filtersJson,
        date_from: dateRange.from.toISOString(),
        date_to: dateRange.to.toISOString()
      });

      const url = `${window.location.origin}/shared-report/${token}`;
      setShareUrl(url);
      setShareDialogOpen(true);
      refetchShares(); // Refresh the list of recent shares
      toast.success('Share link created successfully');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    }
  };

  // Copy share URL
  const copyShareUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url || shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Revoke share link
  const revokeShareLink = async (shareId) => {
    try {
      await base44.entities.ReportShare.update(shareId, {
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: user.id
      });
      refetchShares();
      toast.success('Link revoked successfully');
    } catch (error) {
      console.error('Error revoking share link:', error);
      toast.error('Failed to revoke link');
    }
  };

  // Delete share link
  const deleteShareLink = async (shareId) => {
    try {
      await base44.entities.ReportShare.delete(shareId);
      refetchShares();
      toast.success('Link deleted successfully');
    } catch (error) {
      console.error('Error deleting share link:', error);
      toast.error('Failed to delete link');
    }
  };

  // Get share link status
  const getShareStatus = (share) => {
    if (share.revoked_at) return 'revoked';
    if (new Date(share.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  // Export CSV
  const exportCSV = () => {
    const csvRows = [];
    
    // Media performance CSV
    csvRows.push('MEDIA PERFORMANCE');
    csvRows.push('Media Title,Advertiser,Plays,Total Seconds,Screens,Last Played');
    mediaPerformance.forEach(row => {
      csvRows.push(`"${row.media?.title || 'Unknown'}","${row.advertiser}",${row.plays},${row.totalSeconds},${row.screenCount},${format(new Date(row.lastPlayed), 'yyyy-MM-dd HH:mm')}`);
    });
    
    csvRows.push('');
    csvRows.push('SCREEN PERFORMANCE');
    csvRows.push('Screen Name,Group,Plays,Total Seconds,Last Played');
    screenPerformance.forEach(row => {
      csvRows.push(`"${row.screen?.name || 'Unknown'}","${row.group?.name || 'N/A'}",${row.plays},${row.totalSeconds},${format(new Date(row.lastPlayed), 'yyyy-MM-dd HH:mm')}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advertiser-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Drill-down data
  const drillDownEvents = useMemo(() => {
    if (!drillDownMedia) return [];
    
    const events = filteredEvents
      .filter(e => e.media_id === drillDownMedia.media_id)
      .slice(0, 100)
      .map(event => {
        const screen = userScreens.find(s => s.screen_id === event.screen_id);
        const group = groups.find(g => g.id === screen?.group_id);
        return { ...event, screen, group };
      });
    
    return events;
  }, [drillDownMedia, filteredEvents, userScreens, groups]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  if (!user || screensLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Advertiser Reports</h1>
          <p className="text-slate-600 mt-1">Proof-of-play analytics and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowWeeklyTemplates(!showWeeklyTemplates)} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Weekly Templates
          </Button>
          <PDFDownloader
            reportData={{
              totalPlays: summaryMetrics.totalPlays,
              totalSeconds: summaryMetrics.totalSeconds,
              activeScreens: summaryMetrics.activeScreens,
              uniqueMedia: summaryMetrics.uniqueMedia,
              mediaPerformance: mediaPerformance.map(m => ({
                title: m.media?.title || 'Unknown',
                plays: m.plays,
                totalSeconds: m.totalSeconds,
                screens: m.screenCount
              }))
            }}
            dateRange={`${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`}
            advertiserName={selectedAdvertiser !== 'all' ? selectedAdvertiser : ''}
            fileName={`advertiser_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
          />
          <Button onClick={() => setShareDialogOpen(true)} variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share Report
          </Button>
          <Button onClick={exportCSV} className="bg-cyan-600 hover:bg-cyan-700">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Weekly Templates Section */}
      {showWeeklyTemplates && (
        <WeeklyTemplateManager 
          user={user}
          advertisersList={advertiserEntities}
          groups={groups}
          screens={userScreens}
          playlists={playlists}
          allMedia={allMedia}
        />
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                      : 'Select dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => range && setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Group Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Group</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Screen Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Screen</label>
              <Select value={selectedScreen} onValueChange={setSelectedScreen}>
                <SelectTrigger>
                  <SelectValue placeholder="All Screens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Screens</SelectItem>
                  {userScreens.map(screen => (
                    <SelectItem key={screen.id} value={screen.id}>{screen.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Playlist Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Playlist</label>
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="All Playlists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Playlists</SelectItem>
                  {playlists.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>{playlist.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Media Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Media</label>
              <Select value={selectedMedia} onValueChange={setSelectedMedia}>
                <SelectTrigger>
                  <SelectValue placeholder="All Media" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Media</SelectItem>
                  {allMedia.map(media => (
                    <SelectItem key={media.id} value={media.id}>{media.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advertiser Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Advertiser</label>
              <Select value={selectedAdvertiser} onValueChange={setSelectedAdvertiser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Advertisers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Advertisers</SelectItem>
                  {advertisers.map(advertiser => (
                    <SelectItem key={advertiser} value={advertiser}>{advertiser}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Switch id="hide-unassigned" checked={hideUnassigned} onCheckedChange={setHideUnassigned} />
            <Label htmlFor="hide-unassigned" className="text-sm font-medium cursor-pointer">
              Hide Unassigned
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="diagnostics" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium">Diagnostics</span>
              <Badge variant="secondary" className="ml-2">{diagnosticMetrics.totalRawEvents} events</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* Total Events */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Total PlaybackEvents (Date Range)</span>
                <span className="text-lg font-bold">{diagnosticMetrics.totalRawEvents.toLocaleString()}</span>
              </div>

              {/* Events by Date */}
              <div>
                <h4 className="text-sm font-medium mb-2">Events by Date</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Event Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diagnosticMetrics.dateGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-slate-500">No events</TableCell>
                        </TableRow>
                      ) : (
                        diagnosticMetrics.dateGroups.map(({ date, count }) => (
                          <TableRow key={date}>
                            <TableCell>{format(new Date(date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right font-semibold">{count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Top 5 Screens */}
              <div>
                <h4 className="text-sm font-medium mb-2">Top 5 Screens by Event Count</h4>
                <div className="space-y-2">
                  {diagnosticMetrics.topScreens.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-2">No events</p>
                  ) : (
                    diagnosticMetrics.topScreens.map(({ screen_id, screen, count }) => (
                      <div key={screen_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{screen?.name || screen_id}</p>
                          <p className="text-xs text-slate-500">{screen_id}</p>
                        </div>
                        <Badge variant="outline">{count.toLocaleString()}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Plays</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {summaryMetrics.totalPlays.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Play Time</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatDuration(summaryMetrics.totalSeconds)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Screens</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {summaryMetrics.activeScreens}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Monitor className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Unique Media</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {summaryMetrics.uniqueMedia}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Film className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Media Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Media Performance</CardTitle>
            <Select value={mediaSortBy} onValueChange={setMediaSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plays">Sort by Plays</SelectItem>
                <SelectItem value="totalSeconds">Sort by Duration</SelectItem>
                <SelectItem value="screens">Sort by Screens</SelectItem>
                <SelectItem value="lastPlayed">Sort by Last Played</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <p className="text-center py-8 text-slate-500">Loading events...</p>
          ) : mediaPerformance.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No playback data for selected filters</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Thumbnail</TableHead>
                    <TableHead>Media Title</TableHead>
                    <TableHead>Advertiser</TableHead>
                    <TableHead className="text-right">Plays</TableHead>
                    <TableHead className="text-right">Total Duration</TableHead>
                    <TableHead className="text-right">Screens</TableHead>
                    <TableHead>Last Played</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mediaPerformance.map(row => (
                    <TableRow 
                      key={row.media_id} 
                      className={`hover:bg-slate-50 ${row.advertiser === 'Unassigned' ? 'bg-slate-50/50' : ''}`}
                    >
                      <TableCell>
                        {row.media?.thumbnail_url ? (
                          <img src={row.media.thumbnail_url} alt="" className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                            <Film className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.media?.title || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={row.advertiser === 'Unassigned' ? 'secondary' : 'outline'}>
                          {row.advertiser}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{row.plays.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatDuration(row.totalSeconds)}</TableCell>
                      <TableCell className="text-right">{row.screenCount}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(row.lastPlayed), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDrillDownMedia(row)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screen Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Screen Performance</CardTitle>
            <Select value={screenSortBy} onValueChange={setScreenSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plays">Sort by Plays</SelectItem>
                <SelectItem value="totalSeconds">Sort by Duration</SelectItem>
                <SelectItem value="lastPlayed">Sort by Last Played</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <p className="text-center py-8 text-slate-500">Loading events...</p>
          ) : screenPerformance.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No playback data for selected filters</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Screen Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Plays</TableHead>
                    <TableHead className="text-right">Total Duration</TableHead>
                    <TableHead>Last Played</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screenPerformance.map(row => (
                    <TableRow key={row.screen_id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{row.screen?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {row.group ? (
                          <Badge variant="outline">{row.group.name}</Badge>
                        ) : (
                          <span className="text-slate-400">No Group</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{row.plays.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatDuration(row.totalSeconds)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(row.lastPlayed), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(open) => {
        setShareDialogOpen(open);
        if (!open) {
          setShareUrl('');
          setExpiryOption('7d');
          setCustomExpiryDate(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Report Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Create New Link Section */}
            {!shareUrl && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Link Expiry</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={expiryOption === '24h' ? 'default' : 'outline'}
                      onClick={() => setExpiryOption('24h')}
                      className="w-full"
                    >
                      24 Hours
                    </Button>
                    <Button
                      variant={expiryOption === '7d' ? 'default' : 'outline'}
                      onClick={() => setExpiryOption('7d')}
                      className="w-full"
                    >
                      7 Days
                    </Button>
                    <Button
                      variant={expiryOption === '30d' ? 'default' : 'outline'}
                      onClick={() => setExpiryOption('30d')}
                      className="w-full"
                    >
                      30 Days
                    </Button>
                    <Button
                      variant={expiryOption === 'custom' ? 'default' : 'outline'}
                      onClick={() => setExpiryOption('custom')}
                      className="w-full"
                    >
                      Custom
                    </Button>
                  </div>
                  {expiryOption === 'custom' && (
                    <div className="mt-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {customExpiryDate ? format(customExpiryDate, 'PPP') : 'Pick expiry date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customExpiryDate}
                            onSelect={setCustomExpiryDate}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                <Button onClick={generateShareLink} className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Generate Share Link
                </Button>
              </div>
            )}

            {/* Generated Link Display */}
            {shareUrl && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="w-5 h-5" />
                  <p className="font-medium">Share link created successfully!</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-green-300 rounded-md text-sm font-mono bg-white"
                    onClick={(e) => e.target.select()}
                  />
                  <Button onClick={() => copyShareUrl(shareUrl)} variant="outline" className="border-green-300">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-green-700">
                  <span>• No login required</span>
                  <span>• Read-only access</span>
                  <span>• Expires: {format(new Date(Date.now() + (expiryOption === '24h' ? 24 * 60 * 60 * 1000 : expiryOption === '30d' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)), 'MMM d, yyyy')}</span>
                </div>
              </div>
            )}

            {/* Recent Share Links */}
            {recentShares.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Recent Share Links</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-48">Date Range</TableHead>
                        <TableHead className="w-40">Created</TableHead>
                        <TableHead className="w-40">Expires</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentShares.map((share) => {
                        const status = getShareStatus(share);
                        const shareLink = `${window.location.origin}/shared-report/${share.token}`;
                        const filters = JSON.parse(share.filters_json || '{}');
                        
                        return (
                          <TableRow key={share.id} className={status !== 'active' ? 'opacity-50' : ''}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">
                                  {format(new Date(share.date_from), 'MMM d')} - {format(new Date(share.date_to), 'MMM d, yyyy')}
                                </p>
                                {(filters.advertiser !== 'all' || filters.group !== 'all' || filters.screen !== 'all') && (
                                  <p className="text-xs text-slate-400 mt-1 truncate">
                                    {filters.advertiser !== 'all' && `${filters.advertiser}`}
                                    {filters.group !== 'all' && ` • Group`}
                                    {filters.screen !== 'all' && ` • Screen`}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {format(new Date(share.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {format(new Date(share.expires_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={status === 'active' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {status === 'active' && 'Active'}
                                {status === 'expired' && 'Expired'}
                                {status === 'revoked' && 'Revoked'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button
                                  onClick={() => copyShareUrl(shareLink)}
                                  variant="ghost"
                                  size="sm"
                                  disabled={status !== 'active'}
                                  title="Copy link"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                {status === 'active' && (
                                  <Button
                                    onClick={() => revokeShareLink(share.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    title="Revoke link"
                                  >
                                    Revoke
                                  </Button>
                                )}
                                <Button
                                  onClick={() => deleteShareLink(share.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete link"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Drill-down Sheet */}
      <Sheet open={!!drillDownMedia} onOpenChange={() => setDrillDownMedia(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drillDownMedia?.media?.title || 'Media Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* Media Info */}
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              {drillDownMedia?.media?.thumbnail_url && (
                <img src={drillDownMedia.media.thumbnail_url} alt="" className="w-20 h-20 object-cover rounded" />
              )}
              <div>
                <p className="font-semibold">{drillDownMedia?.media?.title}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Advertiser: <Badge variant="outline" className="ml-1">{drillDownMedia?.advertiser}</Badge>
                </p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{drillDownMedia?.plays}</strong> plays</span>
                  <span><strong>{drillDownMedia?.screenCount}</strong> screens</span>
                  <span><strong>{formatDuration(drillDownMedia?.totalSeconds || 0)}</strong> total</span>
                </div>
              </div>
            </div>

            {/* Recent Plays */}
            <div>
              <h3 className="font-semibold mb-3">Recent Plays (Last 100)</h3>
              <div className="space-y-2">
                {drillDownEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{event.screen?.name || 'Unknown Screen'}</p>
                      <p className="text-xs text-slate-500">
                        {event.group?.name || 'No Group'} • {event.source || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{format(new Date(event.played_at), 'MMM d, HH:mm')}</p>
                      <p className="text-xs text-slate-500">{formatDuration(event.duration_seconds || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}