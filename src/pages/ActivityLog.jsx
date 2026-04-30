import React from "react";
import { Activity } from "lucide-react";
import EmptyState from "../components/common/EmptyState";

export default function ActivityLog() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Activity Log</h1>
          <p className="text-slate-500 text-sm">Audit trail of all system events</p>
        </div>

        <EmptyState
          icon={Activity}
          title="Activity log coming in Phase 3"
          description="This will track all user actions, screen events, and system changes"
        />
      </div>
    </div>
  );
}