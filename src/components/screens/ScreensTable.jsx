import React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ScreensTable({ 
  screens, 
  selectedIds, 
  onSelectScreen, 
  onSelectAll, 
  onOpenDetail,
  groups 
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGroupName = (groupId) => {
    const group = groups?.find(g => g.id === groupId);
    return group?.name || '-';
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <table className="w-full">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="w-12 p-3">
              <Checkbox
                checked={selectedIds.length === screens.length && screens.length > 0}
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="text-left p-3 text-sm font-semibold text-slate-700">Status</th>
            <th className="text-left p-3 text-sm font-semibold text-slate-700">Screen Name</th>
            <th className="text-left p-3 text-sm font-semibold text-slate-700">Group</th>
            <th className="text-left p-3 text-sm font-semibold text-slate-700">Location</th>
            <th className="text-left p-3 text-sm font-semibold text-slate-700">Last Heartbeat</th>
            <th className="text-left p-3 text-sm font-semibold text-slate-700">Playlist</th>
            <th className="w-20 p-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {screens.map((screen) => (
            <tr key={screen.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-3">
                <Checkbox
                  checked={selectedIds.includes(screen.id)}
                  onCheckedChange={() => onSelectScreen(screen.id)}
                />
              </td>
              <td className="p-3">
                <Badge className={getStatusColor(screen.status)}>
                  {screen.status}
                </Badge>
              </td>
              <td className="p-3">
                <div>
                  <p className="font-medium text-slate-900">{screen.name}</p>
                  <p className="text-xs text-slate-500">{screen.screen_id}</p>
                </div>
              </td>
              <td className="p-3 text-sm text-slate-700">
                {getGroupName(screen.group_id)}
              </td>
              <td className="p-3 text-sm text-slate-700">
                {screen.location ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {screen.location.city}
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="p-3 text-sm text-slate-700">
                {screen.last_heartbeat ? (
                  <span>{formatDistanceToNow(new Date(screen.last_heartbeat), { addSuffix: true })}</span>
                ) : (
                  <span className="text-slate-400">Never</span>
                )}
              </td>
              <td className="p-3 text-sm text-slate-700">
                {screen.current_playlist_id ? (
                  <span className="text-cyan-600">Assigned</span>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </td>
              <td className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenDetail(screen)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}