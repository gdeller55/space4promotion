import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Zap, Copy, Check, MessageSquare, Send, History } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import MarkAsSentDialog from './MarkAsSentDialog';
import DeliveryHistoryDrawer from './DeliveryHistoryDrawer';
import WeeklyChecklistCard from './WeeklyChecklistCard';

export default function WeeklyTemplateManager({ 
  user, 
  advertisersList, 
  groups, 
  screens, 
  playlists, 
  allMedia 
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [copied, setCopied] = useState(null);
  const [copiedMessage, setCopiedMessage] = useState(null);
  const [messageTemplate, setMessageTemplate] = useState(
    "Hi {advertiser_name}, here's your Space4Promotion proof-of-play for {label}: {url}"
  );
  const [editingMessageTemplate, setEditingMessageTemplate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [markAsSentDialog, setMarkAsSentDialog] = useState({ open: false, link: null });
  const [deliveryHistory, setDeliveryHistory] = useState({ open: false, reportShareId: null });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    advertiser_id: '',
    group_id: '',
    screen_id: '',
    playlist_id: '',
    media_id: '',
    hide_unassigned: true,
    date_range_mode: 'last_week_mon_sun',
    custom_days: 7,
    share_expiry_days: 7,
    is_enabled: true
  });

  // Fetch templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['weekly-report-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.WeeklyReportTemplate.filter(
        { owner_user_id: user.id },
        '-created_at'
      );
    },
    enabled: !!user?.id
  });

  // Fetch message template
  const { data: savedTemplate, refetch: refetchTemplate } = useQuery({
    queryKey: ['reportMessageTemplate', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const templates = await base44.entities.ReportMessageTemplate.filter({ owner_user_id: user.id });
      return templates[0] || null;
    },
    enabled: !!user?.id
  });

  // Load message template from saved entity
  useEffect(() => {
    if (savedTemplate?.template_text) {
      setMessageTemplate(savedTemplate.template_text);
    }
  }, [savedTemplate]);

  // Save message template to entity
  const saveMessageTemplate = async () => {
    try {
      const now = new Date().toISOString();
      if (savedTemplate) {
        await base44.entities.ReportMessageTemplate.update(savedTemplate.id, {
          template_text: messageTemplate,
          updated_at: now
        });
      } else {
        await base44.entities.ReportMessageTemplate.create({
          owner_user_id: user.id,
          template_text: messageTemplate,
          created_at: now,
          updated_at: now
        });
      }
      await refetchTemplate();
      setEditingMessageTemplate(false);
      toast.success('Message template saved');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  // Format message with placeholders
  const formatMessage = (link) => {
    return messageTemplate
      .replace('{advertiser_name}', link.advertiser_name)
      .replace('{label}', link.label)
      .replace('{url}', link.url);
  };

  // Copy message
  const copyMessage = async (link) => {
    try {
      const message = formatMessage(link);
      await navigator.clipboard.writeText(message);
      setCopiedMessage(link.url);
      setTimeout(() => setCopiedMessage(null), 2000);
      toast.success('Message copied');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  // Calculate date range based on mode in Europe/London timezone
  const calculateDateRange = (mode, customDays = 7) => {
    const now = new Date();
    let from, to;

    switch (mode) {
      case 'last_7_days':
        to = endOfDay(now);
        from = startOfDay(subDays(now, 6));
        break;
      case 'last_week_mon_sun':
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        const lastWeekStart = subDays(currentWeekStart, 7);
        const lastWeekEnd = subDays(currentWeekStart, 1);
        from = startOfDay(lastWeekStart);
        to = endOfDay(lastWeekEnd);
        break;
      case 'custom_days':
        to = endOfDay(now);
        from = startOfDay(subDays(now, customDays - 1));
        break;
      default:
        to = endOfDay(now);
        from = startOfDay(subDays(now, 6));
    }

    return { from, to };
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      advertiser_id: '',
      group_id: '',
      screen_id: '',
      playlist_id: '',
      media_id: '',
      hide_unassigned: true,
      date_range_mode: 'last_week_mon_sun',
      custom_days: 7,
      share_expiry_days: 7,
      is_enabled: true
    });
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      advertiser_id: template.advertiser_id || '',
      group_id: template.group_id || '',
      screen_id: template.screen_id || '',
      playlist_id: template.playlist_id || '',
      media_id: template.media_id || '',
      hide_unassigned: template.hide_unassigned ?? true,
      date_range_mode: template.date_range_mode,
      custom_days: template.custom_days || 7,
      share_expiry_days: template.share_expiry_days || 7,
      is_enabled: template.is_enabled ?? true
    });
    setDialogOpen(true);
  };

  // Save template
  const saveTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const now = new Date().toISOString();
    const templateData = {
      name: formData.name,
      owner_user_id: user.id,
      advertiser_id: formData.advertiser_id || null,
      group_id: formData.group_id || null,
      screen_id: formData.screen_id || null,
      playlist_id: formData.playlist_id || null,
      media_id: formData.media_id || null,
      hide_unassigned: formData.hide_unassigned,
      date_range_mode: formData.date_range_mode,
      custom_days: formData.date_range_mode === 'custom_days' ? formData.custom_days : null,
      share_expiry_days: formData.share_expiry_days,
      is_enabled: formData.is_enabled,
      updated_at: now
    };

    try {
      if (editingTemplate) {
        await base44.entities.WeeklyReportTemplate.update(editingTemplate.id, templateData);
        toast.success('Template updated');
      } else {
        await base44.entities.WeeklyReportTemplate.create({
          ...templateData,
          created_at: now
        });
        toast.success('Template created');
      }
      refetchTemplates();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) return;
    try {
      await base44.entities.WeeklyReportTemplate.delete(templateId);
      refetchTemplates();
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Generate link for single template
  const generateLinkForTemplate = async (template) => {
    const { from, to } = calculateDateRange(template.date_range_mode, template.custom_days);
    
    // Build filters - use advertiser_id
    const filters = {
      group: template.group_id || 'all',
      screen: template.screen_id || 'all',
      playlist: template.playlist_id || 'all',
      media: template.media_id || 'all',
      advertiser: 'all',
      advertiser_id: template.advertiser_id || null,
      hide_unassigned: template.hide_unassigned ?? true
    };

    // Generate secure token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (template.share_expiry_days || 7) * 24 * 60 * 60 * 1000);

    // Create label
    let label = '';
    if (template.date_range_mode === 'last_week_mon_sun') {
      label = `Week of ${format(from, 'MMM d, yyyy')}`;
    } else if (template.date_range_mode === 'last_7_days') {
      label = `Last 7 days ending ${format(to, 'MMM d, yyyy')}`;
    } else if (template.date_range_mode === 'custom_days') {
      label = `Last ${template.custom_days} days ending ${format(to, 'MMM d, yyyy')}`;
    } else {
      label = `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
    }

    const shareRecord = await base44.entities.ReportShare.create({
      token,
      owner_user_id: user.id,
      template_id: template.id,
      label,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      filters_json: JSON.stringify(filters),
      date_from: from.toISOString(),
      date_to: to.toISOString()
    });

    const advertiser = advertisersList.find(a => a.id === template.advertiser_id);

    return {
      id: shareRecord.id,
      template_name: template.name,
      advertiser_name: advertiser?.name || 'All',
      label,
      url: `${window.location.origin}/shared-report/${token}`,
      expires_at: expiresAt,
      revoked_at: null
    };
  };

  // Generate all links
  const generateAllLinks = async () => {
    const activeTemplates = templates.filter(t => t.is_enabled);
    
    if (activeTemplates.length === 0) {
      toast.error('No active templates to generate');
      return;
    }

    setGenerating(true);
    const links = [];

    try {
      for (const template of activeTemplates) {
        const link = await generateLinkForTemplate(template);
        links.push(link);
      }
      setGeneratedLinks(links);
      toast.success(`Generated ${links.length} share links`);
    } catch (error) {
      console.error('Error generating links:', error);
      toast.error('Failed to generate some links');
    } finally {
      setGenerating(false);
    }
  };

  // Copy link
  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
      toast.success('Link copied');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Calculate link status
  const getLinkStatus = (link) => {
    if (link.revoked_at) return 'revoked';
    if (new Date(link.expires_at) <= new Date()) return 'expired';
    return 'active';
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600' },
      revoked: { label: 'Revoked', className: 'bg-red-100 text-red-800' }
    };
    return badges[status] || badges.active;
  };

  // Revoke link
  const revokeLink = async (link) => {
    if (!confirm('Revoke this share link? It will no longer be accessible.')) return;
    try {
      await base44.entities.ReportShare.update(link.id, {
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: user.id
      });
      setGeneratedLinks(links => 
        links.map(l => l.id === link.id ? { ...l, revoked_at: new Date().toISOString() } : l)
      );
      toast.success('Link revoked');
    } catch (error) {
      console.error('Error revoking link:', error);
      toast.error('Failed to revoke link');
    }
  };

  // Open mark as sent dialog
  const openMarkAsSent = (link) => {
    setMarkAsSentDialog({
      open: true,
      link,
      messageText: formatMessage(link)
    });
  };

  // Open delivery history
  const openDeliveryHistory = (link) => {
    setDeliveryHistory({
      open: true,
      reportShareId: link.id
    });
  };

  return (
    <div className="space-y-6">
      {/* Weekly Checklist */}
      <WeeklyChecklistCard 
        user={user} 
        onGenerateLinks={generateAllLinks}
      />

      {/* Message Template Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Message Template</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Customize the share message. Use: {'{advertiser_name}'}, {'{label}'}, {'{url}'}
              </p>
            </div>
            {editingMessageTemplate ? (
              <div className="flex gap-2">
                <Button onClick={() => setEditingMessageTemplate(false)} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button onClick={saveMessageTemplate} size="sm">
                  Save Template
                </Button>
              </div>
            ) : (
              <Button onClick={() => setEditingMessageTemplate(true)} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingMessageTemplate ? (
            <Textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={3}
              placeholder="Hi {advertiser_name}, here's your Space4Promotion proof-of-play for {label}: {url}"
            />
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg text-sm font-mono">
              {messageTemplate}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Report Templates</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Define report filters once, generate fresh links weekly
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateAllLinks} disabled={generating || templates.filter(t => t.is_enabled).length === 0}>
                <Zap className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate All Links'}
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No templates yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(template => {
                  const advertiser = advertisersList.find(a => a.id === template.advertiser_id);
                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        {advertiser ? (
                          <Badge variant="outline">{advertiser.name}</Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">All</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {template.date_range_mode === 'last_week_mon_sun' && 'Last Week (Mon-Sun)'}
                        {template.date_range_mode === 'last_7_days' && 'Last 7 Days'}
                        {template.date_range_mode === 'custom_days' && `Last ${template.custom_days} Days`}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {template.share_expiry_days} days
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_enabled ? 'default' : 'secondary'}>
                          {template.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            onClick={() => openEditDialog(template)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deleteTemplate(template.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
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
          )}
        </CardContent>
      </Card>

      {/* Generated Links Display */}
      {generatedLinks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Links ({format(new Date(), 'MMM d, yyyy')})</CardTitle>
              <div className="flex gap-2">
                {['all', 'active', 'expired', 'revoked'].map(filter => (
                  <Button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    variant={statusFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedLinks
                .filter(link => {
                  const status = getLinkStatus(link);
                  return statusFilter === 'all' || status === statusFilter;
                })
                .map((link, idx) => {
                  const status = getLinkStatus(link);
                  const statusBadge = getStatusBadge(status);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{link.template_name}</p>
                          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {link.advertiser_name} • {link.label}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 truncate font-mono">{link.url}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Expires: {format(link.expires_at, 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        {status === 'active' && (
                          <>
                            <Button
                              onClick={() => copyMessage(link)}
                              variant="default"
                              size="sm"
                              className="bg-cyan-600 hover:bg-cyan-700"
                            >
                              {copiedMessage === link.url ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            </Button>
                            <Button
                              onClick={() => copyLink(link.url)}
                              variant="outline"
                              size="sm"
                            >
                              {copied === link.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                            <Button
                              onClick={() => openMarkAsSent(link)}
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => openDeliveryHistory(link)}
                              variant="outline"
                              size="sm"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => revokeLink(link)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              Revoke
                            </Button>
                          </>
                        )}
                        {status !== 'active' && (
                          <>
                            <Button
                              onClick={() => copyLink(link.url)}
                              variant="outline"
                              size="sm"
                              disabled={status === 'revoked'}
                            >
                              {copied === link.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                            <Button
                              onClick={() => openDeliveryHistory(link)}
                              variant="outline"
                              size="sm"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Coca-Cola Weekly Report"
              />
            </div>

            <div>
              <Label>Advertiser</Label>
              <Select
                value={formData.advertiser_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, advertiser_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Advertisers</SelectItem>
                  {advertisersList.map(adv => (
                    <SelectItem key={adv.id} value={adv.id}>{adv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date Range Mode</Label>
                <Select
                  value={formData.date_range_mode}
                  onValueChange={(val) => setFormData({ ...formData, date_range_mode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_week_mon_sun">Last Week (Mon-Sun)</SelectItem>
                    <SelectItem value="custom_days">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.date_range_mode === 'custom_days' && (
                <div>
                  <Label>Custom Days</Label>
                  <Input
                    type="number"
                    value={formData.custom_days}
                    onChange={(e) => setFormData({ ...formData, custom_days: parseInt(e.target.value) || 7 })}
                    min="1"
                    max="365"
                  />
                </div>
              )}

              <div>
                <Label>Link Expiry (Days)</Label>
                <Select
                  value={formData.share_expiry_days.toString()}
                  onValueChange={(val) => setFormData({ ...formData, share_expiry_days: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Additional Filters (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Group</Label>
                  <Select
                    value={formData.group_id || 'all'}
                    onValueChange={(val) => setFormData({ ...formData, group_id: val === 'all' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Screen</Label>
                  <Select
                    value={formData.screen_id || 'all'}
                    onValueChange={(val) => setFormData({ ...formData, screen_id: val === 'all' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Screens</SelectItem>
                      {screens.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Playlist</Label>
                  <Select
                    value={formData.playlist_id || 'all'}
                    onValueChange={(val) => setFormData({ ...formData, playlist_id: val === 'all' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Playlists</SelectItem>
                      {playlists.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Media</Label>
                  <Select
                    value={formData.media_id || 'all'}
                    onValueChange={(val) => setFormData({ ...formData, media_id: val === 'all' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Media</SelectItem>
                      {allMedia.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="hide_unassigned"
                checked={formData.hide_unassigned}
                onCheckedChange={(checked) => setFormData({ ...formData, hide_unassigned: checked })}
              />
              <Label htmlFor="hide_unassigned" className="cursor-pointer">
                Hide media without advertiser
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
              <Label htmlFor="is_enabled" className="cursor-pointer">
                Enabled (include in batch generation)
              </Label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveTemplate}>Save Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Sent Dialog */}
      <MarkAsSentDialog
        open={markAsSentDialog.open}
        onOpenChange={(open) => setMarkAsSentDialog({ ...markAsSentDialog, open })}
        link={markAsSentDialog.link}
        user={user}
        messageText={markAsSentDialog.messageText}
        onSuccess={() => {
          // Optionally refresh delivery count or show indicator
        }}
      />

      {/* Delivery History Drawer */}
      <DeliveryHistoryDrawer
        open={deliveryHistory.open}
        onOpenChange={(open) => setDeliveryHistory({ ...deliveryHistory, open })}
        reportShareId={deliveryHistory.reportShareId}
      />
    </div>
  );
}