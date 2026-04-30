import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, color, details }) {
  const colorClasses = {
    cyan: "from-cyan-500 to-cyan-400",
    green: "from-green-500 to-green-400",
    purple: "from-purple-500 to-purple-400",
    orange: "from-orange-500 to-orange-400",
  };

  return (
    <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-tr", colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <p className="text-xs text-slate-500 mt-1">{details}</p>
      </CardContent>
    </Card>
  );
}