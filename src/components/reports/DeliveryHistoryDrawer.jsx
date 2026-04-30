import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Mail, MessageSquare, Phone, Share2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryHistoryDrawer({ open, onOpenChange, reportShareId }) {
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();
  
  const { data: deliveries = [] } = useQuery({
    queryKey: ['report-deliveries', reportShareId],
    queryFn: () => base44.entities.ReportDelivery.filter({ reportshare_id: reportShareId }, '-sent_at'),
    enabled: !!reportShareId && open
  });

  const handleDelete = async (delivery) => {
    if (!confirm('Delete this delivery log entry?')) return;
    try {
      await base44.entities.ReportDelivery.delete(delivery.id);
      queryClient.invalidateQueries(['report-deliveries', reportShareId]);
      toast.success('Delivery log deleted');
    } catch (error) {
      console.error('Error deleting delivery:', error);
      toast.error('Failed to delete delivery log');
    }
  };

  const getChannelIcon = (channel) => {
    const icons = {
      whatsapp: <MessageSquare className="w-4 h-4" />,
      email: <Mail className="w-4 h-4" />,
      sms: <Phone className="w-4 h-4" />,
      other: <Share2 className="w-4 h-4" />
    };
    return icons[channel] || icons.other;
  };

  const getChannelColor = (channel) => {
    const colors = {
      whatsapp: 'bg-green-100 text-green-800',
      email: 'bg-blue-100 text-blue-800',
      sms: 'bg-purple-100 text-purple-800',
      other: 'bg-slate-100 text-slate-800'
    };
    return colors[channel] || colors.other;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Delivery History</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {deliveries.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No deliveries logged yet</p>
          ) : (
            deliveries.map(delivery => {
              const isExpanded = expandedId === delivery.id;
              const messagePreview = delivery.message_text.length > 100 
                ? delivery.message_text.substring(0, 100) + '...'
                : delivery.message_text;
              
              return (
                <div key={delivery.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={getChannelColor(delivery.channel)}>
                      <span className="mr-1">{getChannelIcon(delivery.channel)}</span>
                      {delivery.channel}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {format(new Date(delivery.sent_at), 'MMM d, yyyy HH:mm')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(delivery)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {delivery.recipient && (
                    <p className="text-sm text-slate-700 font-medium">{delivery.recipient}</p>
                  )}
                  <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                    <p>{isExpanded ? delivery.message_text : messagePreview}</p>
                    {delivery.message_text.length > 100 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                        className="text-cyan-600 hover:text-cyan-700 text-xs mt-1 flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>Show less <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Show more <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}