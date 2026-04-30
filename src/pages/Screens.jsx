import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Users,
  PlaySquare,
  RefreshCw,
  Trash2,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useDebounce } from "../components/utils/useDebounce";
import { useConfirm } from "../components/utils/useConfirm";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import { SkeletonTable } from "../components/common/SkeletonCard";
import ScreensTable from "../components/screens/ScreensTable";
import ScreenDetailDrawer from "../components/screens/ScreenDetailDrawer";
import ScreenPairingForm from "../components/screens/ScreenPairingForm";

export default function Screens() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedScreenIds, setSelectedScreenIds] = useState([]);
  const [detailScreen, setDetailScreen] = useState(null);
  const [showPairingForm, setShowPairingForm] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { confirmState, confirm, handleOpenChange } = useConfirm();
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch user area assignments
  const { data: userAreas = [] } = useQuery({
    queryKey: ["userAreaAssignments", user?.id],
    queryFn: () =>
      base44.entities.UserAreaAssignment.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const allowedAreaIds = userAreas?.map((ua) => ua.area_id) || [];

  // Fetch screens
  const {
    data: allScreens = [],
    isLoading: loadingScreens,
  } = useQuery({
    queryKey: ["screens"],
    queryFn: () => base44.entities.Screen.list(),
  });

  const screens = allScreens.filter(
    (screen) =>
      allowedAreaIds.length === 0 ||
      !screen.area_id ||
      allowedAreaIds.includes(screen.area_id)
  );

  // Fetch groups
  const {
    data: allGroups = [],
    isLoading: loadingGroups,
  } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: () =>
      base44.entities.ScreenGroup.filter(
        { owner_user_id: user.id },
        "name"
      ),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const groups = allGroups.filter(
    (group) =>
      allowedAreaIds.length === 0 ||
      !group.area_id ||
      allowedAreaIds.includes(group.area_id)
  );

  // Fetch playlists
  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists", user?.id],
    queryFn: () =>
      base44.entities.Playlist.filter(
        { created_by_user_id: user.id },
        "name"
      ),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Mutations
  const updateScreenMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.Screen.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("Screen updated successfully");
    },
    onError: () => toast.error("Failed to update screen"),
  });

  const deleteScreenMutation = useMutation({
    mutationFn: (id) => base44.entities.Screen.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      toast.success("Screen deleted successfully");
    },
    onError: () => toast.error("Failed to delete screen"),
  });

  // Filtering
  const filteredScreens = screens.filter((screen) => {
    const matchesSearch =
      debouncedSearch === "" ||
      screen.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      screen.screen_id?.toLowerCase().includes(debouncedSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || screen.status === statusFilter;

    const matchesGroup =
      groupFilter === "all" ||
      (groupFilter === "none"
        ? !screen.group_id
        : screen.group_id === groupFilter);

    return matchesSearch && matchesStatus && matchesGroup;
  });

  if (userLoading || loadingScreens || loadingGroups) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <SkeletonTable rows={8} columns={7} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">
              Screens
            </h1>
            <p className="text-slate-500 text-sm">
              {screens.length} screen
              {screens.length !== 1 ? "s" : ""} paired
            </p>
          </div>
          <Button onClick={() => setShowPairingForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Pair Screen
          </Button>
        </div>

        {filteredScreens.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={
              screens.length === 0
                ? "No screens paired yet"
                : "No screens match your filters"
            }
            description={
              screens.length === 0
                ? "Get started by pairing your first screen"
                : "Try adjusting your search or filters"
            }
            actionLabel={
              screens.length === 0 ? "Pair Screen" : undefined
            }
            onAction={
              screens.length === 0
                ? () => setShowPairingForm(true)
                : undefined
            }
          />
        ) : (
          <ScreensTable
            screens={filteredScreens}
            selectedIds={selectedScreenIds}
            onSelectScreen={(id) =>
              setSelectedScreenIds((prev) =>
                prev.includes(id)
                  ? prev.filter((i) => i !== id)
                  : [...prev, id]
              )
            }
            onSelectAll={(checked) =>
              setSelectedScreenIds(
                checked ? filteredScreens.map((s) => s.id) : []
              )
            }
            onOpenDetail={setDetailScreen}
            groups={groups}
          />
        )}

        <ScreenDetailDrawer
          screen={detailScreen}
          open={!!detailScreen}
          onOpenChange={(open) =>
            !open && setDetailScreen(null)
          }
          groups={groups}
          onUpdate={(id, data) =>
            updateScreenMutation.mutate({ id, data })
          }
          onDelete={(id) => deleteScreenMutation.mutate(id)}
        />

        {showPairingForm && user && (
          <ScreenPairingForm
            groups={groups}
            onCancel={() => setShowPairingForm(false)}
          />
        )}

        <ConfirmDialog
          open={confirmState.open}
          onOpenChange={handleOpenChange}
          title={confirmState.title}
          description={confirmState.description}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          onConfirm={confirmState.onConfirm}
          variant={confirmState.variant}
        />
      </div>
    </div>
  );
}