import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Layout as LayoutIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import LayoutEditor from '@/components/layouts/LayoutEditor';

export default function Layouts() {
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState(null);
  const [editorLayout, setEditorLayout] = useState(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    screen_orientation: 'landscape',
    canvas_width: 1920,
    canvas_height: 1080
  });

  // Fetch user
  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch layouts
  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ['layouts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Layout.filter({ owner_email: user.email }, '-created_at');
    },
    enabled: !!user?.email
  });

  // Create layout mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const now = new Date().toISOString();
      return await base44.entities.Layout.create({
        ...data,
        owner_email: user.email,
        created_at: now,
        updated_at: now
      });
    },
    onSuccess: (newLayout) => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
      toast.success('Layout created successfully');
      setCreateDialogOpen(false);
      resetForm();
      // Open editor for new layout
      setEditorLayout(newLayout);
    },
    onError: (error) => {
      toast.error('Failed to create layout: ' + error.message);
    }
  });

  // Delete layout mutation
  const deleteMutation = useMutation({
    mutationFn: async (layoutId) => {
      // Delete all zones first
      const zones = await base44.entities.LayoutZone.filter({ layout_id: layoutId });
      await Promise.all(zones.map(zone => base44.entities.LayoutZone.delete(zone.id)));
      // Delete layout
      await base44.entities.Layout.delete(layoutId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
      toast.success('Layout deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete layout: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      screen_orientation: 'landscape',
      canvas_width: 1920,
      canvas_height: 1080
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a layout name');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (layout) => {
    if (confirm(`Are you sure you want to delete layout "${layout.name}"? This will also delete all zones.`)) {
      deleteMutation.mutate(layout.id);
    }
  };

  const handleEdit = (layout) => {
    setEditorLayout(layout);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  // If editor is open, show full-screen editor
  if (editorLayout) {
    return (
      <LayoutEditor
        layout={editorLayout}
        onClose={() => setEditorLayout(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Screen Layouts</h1>
          <p className="text-slate-600 mt-1">Create multi-zone screen layouts for advanced content display</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Layout
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-slate-500">Loading layouts...</p>
        </div>
      ) : layouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No layouts yet</h3>
            <p className="text-slate-500 mb-4">Create your first screen layout to get started</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Layout
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layouts.map(layout => (
            <Card key={layout.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutIcon className="w-5 h-5 text-cyan-600" />
                    <span className="truncate">{layout.name}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  {layout.description && <p className="line-clamp-2">{layout.description}</p>}
                  <div className="flex gap-4">
                    <span>📐 {layout.canvas_width} × {layout.canvas_height}</span>
                    <span>📱 {layout.screen_orientation || 'landscape'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(layout)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(layout)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Layout Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Layout Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mall Main Screen"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Canvas Width</Label>
                <Input
                  type="number"
                  value={formData.canvas_width}
                  onChange={(e) => setFormData({ ...formData, canvas_width: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Canvas Height</Label>
                <Input
                  type="number"
                  value={formData.canvas_height}
                  onChange={(e) => setFormData({ ...formData, canvas_height: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Screen Orientation</Label>
              <Select value={formData.screen_orientation} onValueChange={(value) => setFormData({ ...formData, screen_orientation: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Layout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}