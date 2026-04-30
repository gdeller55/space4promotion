import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Monitor,
  Image,
  PlaySquare,
  Calendar,
  User,
  LogOut,
  Menu,
} from "lucide-react";

export default function TopBar({ user, onMenuClick }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleQuickAction = (page) => {
    navigate(createPageUrl(page));
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-3">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-600 hover:text-slate-900"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      <div className="flex-1 max-w-xl hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search screens, groups, playlists, media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="bg-cyan-600 hover:bg-cyan-700 flex-shrink-0">
              <Plus className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-[80vh] overflow-y-auto">
            <DropdownMenuItem onClick={() => handleQuickAction("Playlists")}>
              <PlaySquare className="w-4 h-4 mr-2" />
              Create Playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}