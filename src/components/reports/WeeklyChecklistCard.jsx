import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function WeeklyChecklistCard({ user, onGenerateLinks }) {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [linksCount, setLinksCount] = useState(0);
  const [deliveriesCount, setDeliveriesCount] = useState(0);

  // Calculate current week (Mon-Sun Europe/London)
  const getCurrentWeek = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return { weekStart, weekEnd };
  };

  // Load or create checklist
  useEffect(() => {
    const loadChecklist = async () => {
      if (!user?.id) return;
      try {
        const { weekStart, weekEnd } = getCurrentWeek();
        const weekStartStr = weekStart.toISOString();
        
        // Find existing checklist for this week
        const existing = await base44.entities.WeeklyChecklist.filter({
          owner_user_id: user.id,
          week_start_date: weekStartStr
        });

        let current;
        if (existing.length > 0) {
          current = existing[0];
        } else {
          // Create new checklist
          current = await base44.entities.WeeklyChecklist.create({
            owner_user_id: user.id,
            week_start_date: weekStartStr,
            week_end_date: weekEnd.toISOString(),
            status: 'in_progress',
            deliveries_logged_count: 0,
            last_updated_at: new Date().toISOString()
          });
        }

        setChecklist(current);
        setIsExpanded(current.status !== 'completed');

        // Load links count
        const shares = await base44.entities.ReportShare.filter({
          owner_user_id: user.id
        });
        const weekShares = shares.filter(s => {
          const createdAt = new Date(s.created_at);
          return createdAt >= weekStart && createdAt <= weekEnd && s.template_id;
        });
        setLinksCount(weekShares.length);

        // Load deliveries count
        const deliveries = await base44.entities.ReportDelivery.filter({
          owner_user_id: user.id
        });
        const weekShareIds = weekShares.map(s => s.id);
        const weekDeliveries = deliveries.filter(d => 
          weekShareIds.includes(d.reportshare_id)
        );
        setDeliveriesCount(weekDeliveries.length);

        // Update checklist counts if different
        if (current.deliveries_logged_count !== weekDeliveries.length) {
          await base44.entities.WeeklyChecklist.update(current.id, {
            deliveries_logged_count: weekDeliveries.length,
            last_updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error loading checklist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChecklist();
  }, [user]);

  const markComplete = async () => {
    if (!checklist) return;
    try {
      const now = new Date().toISOString();
      await base44.entities.WeeklyChecklist.update(checklist.id, {
        status: 'completed',
        completed_at: now,
        last_updated_at: now
      });
      setChecklist({ ...checklist, status: 'completed', completed_at: now });
      setIsExpanded(false);
      toast.success('Week marked complete!');
    } catch (error) {
      console.error('Error marking complete:', error);
      toast.error('Failed to mark complete');
    }
  };

  const updateLinksGenerated = async () => {
    if (!checklist) return;
    try {
      await base44.entities.WeeklyChecklist.update(checklist.id, {
        links_generated_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      });
      setChecklist({ ...checklist, links_generated_at: new Date().toISOString() });
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  if (loading || !checklist) return null;

  const { weekStart, weekEnd } = getCurrentWeek();
  const isComplete = checklist.status === 'completed';

  return (
    <Card className={isComplete ? 'border-green-200 bg-green-50/50' : 'border-cyan-200 bg-cyan-50/50'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className={`w-5 h-5 ${isComplete ? 'text-green-600' : 'text-cyan-600'}`} />
            <div>
              <CardTitle className="text-base">
                Weekly Checklist
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Checklist items */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              {checklist.links_generated_at ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">Generate weekly links</p>
                <p className="text-xs text-slate-600 mt-1">
                  Links generated: <span className="font-semibold">{linksCount}</span>
                </p>
                {checklist.links_generated_at && (
                  <p className="text-xs text-slate-500 mt-1">
                    Last generated: {format(new Date(checklist.links_generated_at), 'MMM d, HH:mm')}
                  </p>
                )}
              </div>
              {!checklist.links_generated_at && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await updateLinksGenerated();
                    if (onGenerateLinks) onGenerateLinks();
                  }}
                >
                  Generate
                </Button>
              )}
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              {deliveriesCount > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">Send/Log deliveries</p>
                <p className="text-xs text-slate-600 mt-1">
                  Deliveries logged: <span className="font-semibold">{deliveriesCount}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">Mark week complete</p>
                {isComplete && checklist.completed_at && (
                  <p className="text-xs text-slate-500 mt-1">
                    Completed: {format(new Date(checklist.completed_at), 'MMM d, HH:mm')}
                  </p>
                )}
              </div>
              {!isComplete && (
                <Button
                  size="sm"
                  onClick={markComplete}
                  disabled={linksCount === 0 && deliveriesCount === 0}
                >
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}