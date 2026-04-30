import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Play, Monitor, Film, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import PDFDownloader from '../components/reports/PDFDownloader';

export default function SharedReport() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportShare, setReportShare] = useState(null);
  const [userScreens, setUserScreens] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [playbackEvents, setPlaybackEvents] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);

        // Fetch share by token
        const shares = await base44.entities.ReportShare.filter({ token });
        
        if (shares.length === 0) {
          setError('Share link not found');
          setLoading(false);
          return;
        }

        const share = shares[0];

        // Check if revoked
        if (share.revoked_at) {
          setError('This share link has been revoked');
          setLoading(false);
          return;
        }

        // Check expiry
        if (new Date(share.expires_at) < new Date()) {
          setError('This share link has expired');
          setLoading(false);
          return;
        }

        setReportShare(share);
        setFilters(JSON.parse(share.filters_json));

        // Fetch owner's screens
        const screens = await base44.entities.Screen.filter({ owner_user_id: share.owner_user_id });
        setUserScreens(screens);

        // Fetch groups
        const fetchedGroups = await base44.entities.ScreenGroup.filter({ owner_user_id: share.owner_user_id });
        setGroups(fetchedGroups);

        // Fetch media
        const media = await base44.entities.Media.filter({ created_by_user_id: share.owner_user_id });
        setAllMedia(media);

        // Fetch playback events
        const screenIds = screens.map(s => s.screen_id);
        const allEvents = await base44.entities.PlaybackEvent.list('-played_at', 50000);
        
        const fromTime = new Date(share.date_from).getTime();
        const toTime = new Date(share.date_to).getTime();
        
        const filtered = allEvents.filter(event => {
          if (!screenIds.includes(event.screen_id)) return false;
          const eventTime = new Date(event.played_at).getTime();
          return eventTime >= fromTime && eventTime <= toTime;
        });

        setPlaybackEvents(filtered);
        setLoading(false);
      } catch (err) {
        console.error('Error loading shared report:', err);
        setError('Failed to load report');
        setLoading(false);
      }
    };

    if (token) {
      loadReport();
    }
  }, [token]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = [...playbackEvents];

    if (filters.group !== 'all') {
      const groupScreens = userScreens.filter(s => s.group_id === filters.group).map(s => s.screen_id);
      filtered = filtered.filter(e => groupScreens.includes(e.screen_id));
    }

    if (filters.screen !== 'all') {
      const screen = userScreens.find(s => s.id === filters.screen);
      if (screen) {
        filtered = filtered.filter(e => e.screen_id === screen.screen_id);
      }
    }

    if (filters.playlist !== 'all') {
      filtered = filtered.filter(e => e.playlist_id === filters.playlist);
    }

    if (filters.media !== 'all') {
      filtered = filtered.filter(e => e.media_id === filters.media);
    }

    // Support both advertiser_id (new) and advertiser (old name-based)
    if (filters.advertiser_id) {
      const advertiserMedia = allMedia.filter(m => m.advertiser_id === filters.advertiser_id).map(m => m.id);
      filtered = filtered.filter(e => advertiserMedia.includes(e.media_id));
    } else if (filters.advertiser !== 'all') {
      const advertiserMedia = allMedia.filter(m => 
        m.tags && m.tags.some(tag => tag === `advertiser:${filters.advertiser}`)
      ).map(m => m.id);
      filtered = filtered.filter(e => advertiserMedia.includes(e.media_id));
    }

    // Hide unassigned if requested
    if (filters.hide_unassigned) {
      const assignedMedia = allMedia.filter(m => 
        m.advertiser_id || (m.tags && m.tags.some(tag => tag.startsWith('advertiser:')))
      ).map(m => m.id);
      filtered = filtered.filter(e => assignedMedia.includes(e.media_id));
    }

    return filtered;
  }, [playbackEvents, filters, userScreens, allMedia]);

  // Calculate metrics
  const summaryMetrics = useMemo(() => {
    const totalPlays = filteredEvents.length;
    const totalSeconds = filteredEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    const activeScreens = new Set(filteredEvents.map(e => e.screen_id)).size;
    const uniqueMedia = new Set(filteredEvents.map(e => e.media_id)).size;

    return { totalPlays, totalSeconds, activeScreens, uniqueMedia };
  }, [filteredEvents]);

  // Media performance
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

    return Array.from(mediaMap.values())
      .map(entry => {
        const media = allMedia.find(m => m.id === entry.media_id);
        const advertiser = media?.tags?.find(tag => tag.startsWith('advertiser:'))?.replace('advertiser:', '') || 'Unassigned';

        return {
          ...entry,
          media,
          advertiser,
          screenCount: entry.screens.size
        };
      })
      .sort((a, b) => b.plays - a.plays);
  }, [filteredEvents, allMedia]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <p className="text-slate-600">This link may have expired or been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Shared Advertiser Report</h1>
              <p className="text-sm text-slate-600">
                {format(new Date(reportShare.date_from), 'MMM d, yyyy')} - {format(new Date(reportShare.date_to), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
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
            dateRange={`${format(new Date(reportShare.date_from), 'MMM d, yyyy')} - ${format(new Date(reportShare.date_to), 'MMM d, yyyy')}`}
            advertiserName={filters.advertiser !== 'all' ? filters.advertiser : ''}
            fileName={`shared_report_${format(new Date(reportShare.date_from), 'yyyy-MM-dd')}.pdf`}
          />
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
            <CardTitle>Media Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {mediaPerformance.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No playback data available</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mediaPerformance.map(row => (
                      <TableRow key={row.media_id}>
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
                          <Badge variant="outline">{row.advertiser}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{row.plays.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatDuration(row.totalSeconds)}</TableCell>
                        <TableCell className="text-right">{row.screenCount}</TableCell>
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

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 py-4">
          <p>This is a read-only shared report. Link expires on {format(new Date(reportShare.expires_at), 'MMM d, yyyy')}</p>
        </div>
      </div>
    </div>
  );
}