import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function MarkAsSentDialog({ open, onOpenChange, link, user, messageText, onSuccess }) {
  const [channel, setChannel] = useState('whatsapp');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState(messageText || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error('Message text is required');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.ReportDelivery.create({
        owner_user_id: user.id,
        reportshare_id: link.id,
        advertiser_id: link.advertiser_id || null,
        channel,
        recipient: recipient.trim() || null,
        message_text: message,
        sent_at: now,
        created_at: now
      });
      toast.success('Delivery logged');
      onOpenChange(false);
      if (onSuccess) onSuccess();
      // Reset form
      setRecipient('');
      setMessage(messageText || '');
    } catch (error) {
      console.error('Error logging delivery:', error);
      toast.error('Failed to log delivery');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Sent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Recipient (optional)</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Phone, email, or name"
            />
          </div>

          <div>
            <Label>Message Text</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="The message that was sent"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Log Delivery'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}