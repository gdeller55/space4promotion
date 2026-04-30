import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Monitor,
  Users,
  PlaySquare,
  Calendar,
  Globe,
  Image,
  Map,
  MapPin,
  Activity,
  Settings,
  BarChart3,
  Megaphone,
  Layout,
  X,
} from "lucide-react";

const navigationItems = [
  { title: "Overview", page: "Dashboard", icon: LayoutDashboard },
  { title: "Screens", page: "Screens", icon: Monitor },
  { title: "Groups", page: "Groups", icon: Users },
  { title: "Playlists", page: "Playlists", icon: PlaySquare },
  { title: "Layouts", page: "Layouts", icon: Layout },
  { title: "Scheduling", page: "Scheduling", icon: Calendar },
  { title: "Geo-targeting", page: "GeoTargeting", icon: Globe },
  { title: "Media Library", page: "Media", icon: Image },
  { title: "Advertisers", page: "Advertisers", icon: Megaphone },
  { title: "Areas", page: "Areas", icon: MapPin },
  { title: "Reports", page: "Reports", icon: BarChart3 },
  { title: "Locations", page: "Locations", icon: Map },
  { title: "Activity Log", page: "ActivityLog", icon: Activity },
  { title: "Settings", page: "Settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col
        fixed lg:static inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <div className="p-6 h-16 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Screen Manager</h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden text-slate-500 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain">
        {navigationItems.map((item) => {
          const url = createPageUrl(item.page);
          const isActive = location.pathname === url;
          
          return (
            <Link
              key={item.page}
              to={url}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
    </>
  );
}