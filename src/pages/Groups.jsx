import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  PlaySquare,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import EmptyState from "../components/common/EmptyState";
import { SkeletonTable } from "../components/common/SkeletonCard";

export default function Groups() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: allGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: () => base44.entities.ScreenGroup.filter({ owner_user_id: user.id }, "name"),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const groups = allGroups.filter(group => 
    allowedAreaIds.length === 0 || !group.area_id || allowedAreaIds.includes(group.area_id)
  );

  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: () => base44.entities.Playlist.filter({ created_by_user_id: user.id }, "name"),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const assignPlaylistMutation = useMutation({
    mutationFn: async ({ groupId, playlistId }) => {
      const now = new Date().toISOString();
      const group = groups.find(g => g.id === groupId);
      
      // Upsert Assignment entity
      const existingAssignments = await base44.entities.Assignment.filter({
        target_type: 'group',
        target_id: groupId,
        active: true
      });
      
      if (existingAssignments.length > 0) {
        await base44.entities.Assignment.update(existingAssignments[0].id, {
          playlist_id: playlistId,
          updated_at: now,
          active: true
        });
      } else {
        await base44.entities.Assignment.create({
          target_type: 'group',
          target_id: groupId,
          playlist_id: playlistId,
          priority: 0,
          active: true,
          created_at: now,
          updated_at: now,
          created_by_user_id: user.id
        });
      }
      
      // Update ScreenGroup.default_playlist_id
      await base44.entities.ScreenGroup.update(groupId, {
        default_playlist_id: playlistId
      });
      
      // Legacy: Update Playlist.assigned_groups
      const playlist = await base44.entities.Playlist.get(playlistId);
      const newAssignedGroups = [...new Set([...(playlist.assigned_groups || []), groupId])];
      await base44.entities.Playlist.update(playlistId, {
        assigned_groups: newAssignedGroups
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success("Playlist assigned to group successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign playlist");
      console.error(error);
    },
  });

  const handleAssignPlaylist = (groupId, playlistId) => {
    if (!playlistId) return;
    assignPlaylistMutation.mutate({ groupId, playlistId });
  };

  const getColorBadgeClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800';
  };

  if (loadingGroups) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-10 w-64 bg-slate-200 rounded mb-6 animate-pulse" />
          <SkeletonTable rows={5} columns={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Groups</h1>
            <p className="text-slate-500 text-sm">
              {groups.length} group{groups.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <Button onClick={() => window.location.href = '/screens?hub_access=1'}>
            <Plus className="w-4 h-4 mr-2" />
            Manage Groups
          </Button>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Groups help you organize screens and assign content to multiple screens at once"
            actionLabel="Go to Screens"
            onAction={() => window.location.href = '/screens?hub_access=1'}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Default Playlist</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => {
                    const assignedPlaylist = playlists.find(p => p.id === group.default_playlist_id);
                    return (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="text-slate-600">
                          {group.location || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getColorBadgeClass(group.color)}>
                            {group.color || 'blue'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {assignedPlaylist?.name || 'None'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select onValueChange={(playlistId) => handleAssignPlaylist(group.id, playlistId)}>
                            <SelectTrigger className="w-40 h-9">
                              <PlaySquare className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="Assign Playlist" />
                            </SelectTrigger>
                            <SelectContent>
                              {playlists.map((playlist) => (
                                <SelectItem key={playlist.id} value={playlist.id}>
                                  {playlist.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}