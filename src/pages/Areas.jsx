import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AreasPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaDescription, setNewAreaDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const queryClient = useQueryClient();

  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ["areas"],
    queryFn: () => base44.entities.Area.list("-created_at"),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["userAreaAssignments"],
    queryFn: () => base44.entities.UserAreaAssignment.list(),
  });

  const createAreaMutation = useMutation({
    mutationFn: (data) => base44.entities.Area.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Area created successfully");
      setShowCreateDialog(false);
      setNewAreaName("");
      setNewAreaDescription("");
    },
    onError: () => toast.error("Failed to create area"),
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id) => base44.entities.Area.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Area deleted successfully");
    },
    onError: () => toast.error("Failed to delete area"),
  });

  const assignUserMutation = useMutation({
    mutationFn: (data) => base44.entities.UserAreaAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAreaAssignments"] });
      toast.success("User assigned to area");
      setShowAssignDialog(false);
      setSelectedUserId("");
    },
    onError: () => toast.error("Failed to assign user"),
  });

  const unassignUserMutation = useMutation({
    mutationFn: (id) => base44.entities.UserAreaAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAreaAssignments"] });
      toast.success("User unassigned from area");
    },
    onError: () => toast.error("Failed to unassign user"),
  });

  const handleCreateArea = () => {
    if (!newAreaName.trim()) {
      toast.error("Area name is required");
      return;
    }
    createAreaMutation.mutate({
      name: newAreaName.trim(),
      description: newAreaDescription.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleAssignUser = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    assignUserMutation.mutate({
      user_id: selectedUserId,
      area_id: selectedArea.id,
      assigned_at: new Date().toISOString(),
    });
  };

  const getAssignedUsers = (areaId) => {
    return assignments.filter(a => a.area_id === areaId);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || "Unknown User";
  };

  const isUserAssigned = (userId, areaId) => {
    return assignments.some(a => a.user_id === userId && a.area_id === areaId);
  };

  const availableUsers = selectedArea 
    ? users.filter(u => !isUserAssigned(u.id, selectedArea.id))
    : [];

  if (loadingAreas || loadingUsers) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Area Management</h1>
          <p className="text-slate-600 mt-1">Manage geographic areas and user assignments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Area
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area) => {
          const assignedUsers = getAssignedUsers(area.id);
          return (
            <Card key={area.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{area.name}</CardTitle>
                      {area.description && (
                        <CardDescription className="text-sm">{area.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAreaMutation.mutate(area.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>{assignedUsers.length} user{assignedUsers.length !== 1 ? 's' : ''}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedArea(area);
                        setShowAssignDialog(true);
                      }}
                    >
                      Assign User
                    </Button>
                  </div>
                  
                  {assignedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignedUsers.map((assignment) => (
                        <Badge
                          key={assignment.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {getUserName(assignment.user_id)}
                          <button
                            onClick={() => unassignUserMutation.mutate(assignment.id)}
                            className="ml-1 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {areas.length === 0 && (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No areas yet</h3>
          <p className="text-slate-600 mb-4">Create your first area to start organizing screens and users</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Area
          </Button>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-name">Area Name</Label>
              <Input
                id="area-name"
                placeholder="e.g., London, Manchester, Birmingham"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-description">Description (optional)</Label>
              <Input
                id="area-description"
                placeholder="e.g., Greater London area"
                value={newAreaDescription}
                onChange={(e) => setNewAreaDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateArea} disabled={createAreaMutation.isPending}>
              {createAreaMutation.isPending ? "Creating..." : "Create Area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to {selectedArea?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500">All users are assigned</div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignUser} 
              disabled={assignUserMutation.isPending || availableUsers.length === 0}
            >
              {assignUserMutation.isPending ? "Assigning..." : "Assign User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}