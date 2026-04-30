import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Advertisers() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);

  const queryClient = useQueryClient();

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

  const { data: advertisers = [], isLoading } = useQuery({
    queryKey: ['advertisers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Advertiser.filter({ owner_user_id: user.id }, '-created_at');
    },
    enabled: !!user?.id
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const now = new Date().toISOString();
      return await base44.entities.Advertiser.create({
        ...data,
        owner_user_id: user.id,
        created_at: now,
        updated_at: now
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['advertisers']);
      setDialogOpen(false);
      resetForm();
      toast.success('Advertiser created');
    },
    onError: (error) => {
      console.error('Error creating advertiser:', error);
      toast.error('Failed to create advertiser');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Advertiser.update(id, {
        ...data,
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['advertisers']);
      setDialogOpen(false);
      resetForm();
      toast.success('Advertiser updated');
    },
    onError: (error) => {
      console.error('Error updating advertiser:', error);
      toast.error('Failed to update advertiser');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Advertiser.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['advertisers']);
      toast.success('Advertiser deleted');
    },
    onError: (error) => {
      console.error('Error deleting advertiser:', error);
      toast.error('Failed to delete advertiser');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      notes: ''
    });
    setEditingAdvertiser(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (advertiser) => {
    setEditingAdvertiser(advertiser);
    setFormData({
      name: advertiser.name,
      contact_name: advertiser.contact_name || '',
      email: advertiser.email || '',
      phone: advertiser.phone || '',
      notes: advertiser.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Advertiser name is required');
      return;
    }

    if (editingAdvertiser) {
      updateMutation.mutate({ id: editingAdvertiser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this advertiser? Media tags will not be affected.')) {
      deleteMutation.mutate(id);
    }
  };

  const fixAdvertiserTags = async () => {
    setFixing(true);
    setFixResult(null);

    try {
      // Fetch all media for current user
      const allMedia = await base44.entities.Media.filter({ created_by_user_id: user.id });
      
      let updated = 0;
      let matched = 0;
      let unmatched = 0;
      
      // Create advertiser name map (case-insensitive)
      const advertiserMap = new Map();
      advertisers.forEach(adv => {
        advertiserMap.set(adv.name.toLowerCase(), adv.name);
      });

      for (const media of allMedia) {
        let shouldUpdate = false;
        let newTags = [...(media.tags || [])];
        
        // Remove all existing advertiser tags
        const oldAdvertiserTags = newTags.filter(tag => tag.startsWith('advertiser:'));
        newTags = newTags.filter(tag => !tag.startsWith('advertiser:'));
        
        // Check if media has advertiser tags but no dropdown value
        if (oldAdvertiserTags.length > 0) {
          const oldAdvertiserName = oldAdvertiserTags[0].replace('advertiser:', '');
          const matchedName = advertiserMap.get(oldAdvertiserName.toLowerCase());
          
          if (matchedName) {
            // Match found - add proper tag
            newTags.push(`advertiser:${matchedName}`);
            shouldUpdate = true;
            matched++;
          } else {
            // No match - tag removed, media becomes unassigned
            shouldUpdate = oldAdvertiserTags.length > 0;
            unmatched++;
          }
        }
        
        // If tags changed, update media
        if (shouldUpdate) {
          await base44.entities.Media.update(media.id, { tags: newTags });
          updated++;
        }
      }

      setFixResult({
        total: allMedia.length,
        updated,
        matched,
        unmatched
      });
      
      toast.success(`Fixed ${updated} media items`);
    } catch (error) {
      console.error('Error fixing advertiser tags:', error);
      toast.error('Failed to fix advertiser tags');
    } finally {
      setFixing(false);
    }
  };

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Advertisers</h1>
          <p className="text-slate-600 mt-1">Manage advertiser contacts and information</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fixAdvertiserTags} variant="outline" disabled={fixing}>
            <Wrench className="w-4 h-4 mr-2" />
            {fixing ? 'Fixing...' : 'Fix Advertiser Tags'}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Advertiser
          </Button>
        </div>
      </div>

      {fixResult && (
        <Alert>
          <AlertDescription>
            <strong>Tag Fix Complete:</strong> Scanned {fixResult.total} media items. 
            Updated {fixResult.updated} items. 
            Matched {fixResult.matched} tags to advertisers. 
            {fixResult.unmatched > 0 && ` ${fixResult.unmatched} unmatched tags removed.`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center py-8 text-slate-500">Loading...</p>
          ) : advertisers.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No advertisers yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertisers.map(advertiser => (
                  <TableRow key={advertiser.id}>
                    <TableCell className="font-medium">{advertiser.name}</TableCell>
                    <TableCell>{advertiser.contact_name || '-'}</TableCell>
                    <TableCell>{advertiser.email || '-'}</TableCell>
                    <TableCell>{advertiser.phone || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(advertiser.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          onClick={() => openEditDialog(advertiser)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(advertiser.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAdvertiser ? 'Edit Advertiser' : 'Add Advertiser'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Advertiser Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Coca-Cola"
              />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+44 20 1234 5678"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this advertiser..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                {editingAdvertiser ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}