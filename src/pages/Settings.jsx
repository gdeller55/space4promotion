import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { subDays } from "date-fns";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [retentionDays, setRetentionDays] = useState(90);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const userSettings = await base44.entities.AppSettings.filter({ owner_user_id: currentUser.id });
        if (userSettings.length > 0) {
          setSettings(userSettings[0]);
          setRetentionDays(userSettings[0].playback_retention_days || 90);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveRetentionSetting = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (settings) {
        await base44.entities.AppSettings.update(settings.id, {
          playback_retention_days: retentionDays,
          updated_at: new Date().toISOString()
        });
      } else {
        const newSettings = await base44.entities.AppSettings.create({
          owner_user_id: user.id,
          playback_retention_days: retentionDays,
          updated_at: new Date().toISOString()
        });
        setSettings(newSettings);
      }
      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const cleanupOldEvents = async () => {
    if (!user) return;
    if (!confirm(`Delete PlaybackEvents older than ${retentionDays} days?`)) return;

    setCleaning(true);
    try {
      const cutoffDate = subDays(new Date(), retentionDays).toISOString();
      
      // Fetch user's screens
      const screens = await base44.entities.Screen.filter({ owner_user_id: user.id });
      const screenIds = screens.map(s => s.screen_id);

      // Fetch all events
      const allEvents = await base44.entities.PlaybackEvent.list('-played_at', 100000);
      
      // Filter events to delete (user's screens + older than cutoff)
      const eventsToDelete = allEvents.filter(event => 
        screenIds.includes(event.screen_id) && event.played_at < cutoffDate
      );

      // Delete events
      for (const event of eventsToDelete) {
        await base44.entities.PlaybackEvent.delete(event.id);
      }

      toast.success(`Deleted ${eventsToDelete.length} old playback events`);
    } catch (error) {
      console.error('Error cleaning up events:', error);
      toast.error('Failed to clean up events');
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Settings</h1>
          <p className="text-slate-500 text-sm">Configure your account and preferences</p>
        </div>

        {/* Data Retention Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
            <CardDescription>
              Manage how long playback event data is stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>PlaybackEvent Retention (days)</Label>
              <div className="flex gap-3 items-center">
                <Select value={String(retentionDays)} onValueChange={(val) => setRetentionDays(Number(val))}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={saveRetentionSetting} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Older playback events will be eligible for cleanup
              </p>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Clean Up Old Events</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Delete playback events older than {retentionDays} days
                  </p>
                </div>
                <Button
                  onClick={cleanupOldEvents}
                  disabled={cleaning}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  {cleaning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Clean Up Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}