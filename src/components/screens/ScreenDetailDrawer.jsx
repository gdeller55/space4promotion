import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Monitor,
  MapPin,
  Activity,
  RefreshCw,
  AlertCircle,
  Settings as SettingsIcon,
  Trash2,
  Power,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ScreenDetailDrawer({ screen, open, onOpenChange, groups, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: screen?.name || "",
    group_id: screen?.group_id || "",
    status: screen?.status || "online",
  });
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

  const { data: commands = [], refetch: refetchCommands } = useQuery({
    queryKey: ['screenCommands', screen?.id],
    queryFn: () => base44.entities.ScreenCommand.filter(
      { screen_id: screen.screen_id },
      '-created_at',
      10
    ),
    enabled: !!screen?.screen_id && open,
    staleTime: 10000,
  });

  if (!screen) return null;

  const isOnline = screen.last_seen_at 
    ? (Date.now() - new Date(screen.last_seen_at).getTime()) < 90000
    : false;

  const handleSave = async () => {
    await onUpdate(screen.id, editData);
    setIsEditing(false);
  };

  const handleSendCommand = async (type) => {
    if (!user?.id) {
      toast.error("User not loaded");
      return;
    }

    try {
      await base44.entities.ScreenCommand.create({
        screen_id: screen.screen_id,
        type: type,
        payload: null,
        status: 'pending',
        created_at: new Date().toISOString(),
        created_by_user_id: user.id
      });
      toast.success("Command sent");
      refetchCommands();
    } catch (error) {
      toast.error("Failed to send command");
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommandStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'acked': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupInfo = groups?.find(g => g.id === screen.group_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-3">
                <Monitor className="w-5 h-5" />
                {screen.name}
              </SheetTitle>
              <SheetDescription>
                Screen ID: {screen.screen_id}
              </SheetDescription>
            </div>
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onDelete(screen.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Live Status */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Connection</span>
                <Badge className={isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <Badge className={getStatusColor(screen.status)}>
                  {screen.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Last Seen</span>
                <span className="text-sm font-medium">
                  {screen.last_seen_at 
                    ? formatDistanceToNow(new Date(screen.last_seen_at), { addSuffix: true })
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Last Sync</span>
                <span className="text-sm font-medium">
                  {screen.last_sync_at 
                    ? formatDistanceToNow(new Date(screen.last_sync_at), { addSuffix: true })
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Player Version</span>
                <span className="text-sm font-medium">
                  {screen.player_version || 'Unknown'}
                </span>
              </div>
              {screen.last_error && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Last Error</span>
                    <span className="text-xs text-red-600">
                      {screen.last_error}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Error Time</span>
                    <span className="text-xs text-slate-500">
                      {screen.last_error_at && formatDistanceToNow(new Date(screen.last_error_at), { addSuffix: true })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Device Info */}
          {screen.device_info && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Device Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Resolution</span>
                  <span className="font-medium">
                    {screen.device_info.screen_width}x{screen.device_info.screen_height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Player Version</span>
                  <span className="font-medium">{screen.device_info.player_version || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Online Status</span>
                  <span className="font-medium">
                    {screen.device_info.is_online ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Content Assignment */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Configuration
            </h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label>Screen Name</Label>
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Group</Label>
                  <Select
                    value={editData.group_id}
                    onValueChange={(value) => setEditData({ ...editData, group_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No group</SelectItem>
                      {groups?.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) => setEditData({ ...editData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Group</span>
                  <span className="font-medium">{groupInfo?.name || 'No group'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Orientation</span>
                  <span className="font-medium">{screen.orientation || 'landscape'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Resolution</span>
                  <span className="font-medium">{screen.resolution || 'Not set'}</span>
                </div>
                {screen.location && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Location</span>
                    <span className="font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {screen.location.city}, {screen.location.country}
                    </span>
                  </div>
                )}
                <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full mt-3">
                  Edit Configuration
                </Button>
              </div>
            )}
          </div>

          {/* Commands */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Remote Commands
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand('refresh')}
                className="justify-start"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand('request_status')}
                className="justify-start"
              >
                <Activity className="w-4 h-4 mr-2" />
                Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand('clear_cache')}
                className="justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand('reboot')}
                className="justify-start"
              >
                <Power className="w-4 h-4 mr-2" />
                Reboot
              </Button>
            </div>

            {/* Recent Commands */}
            {commands.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-600 mb-2">Recent Commands</h4>
                <div className="space-y-1.5">
                  {commands.slice(0, 5).map((cmd) => (
                    <div key={cmd.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={getCommandStatusColor(cmd.status)} variant="outline">
                          {cmd.status}
                        </Badge>
                        <span className="font-medium">{cmd.type}</span>
                      </div>
                      <span className="text-slate-500">
                        {formatDistanceToNow(new Date(cmd.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}