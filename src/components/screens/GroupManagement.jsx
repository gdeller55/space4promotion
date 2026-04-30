
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Users, Edit, Trash2 } from "lucide-react";

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", class: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "green", label: "Green", class: "bg-green-100 text-green-800 border-green-200" },
  { value: "purple", label: "Purple", class: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "orange", label: "Orange", class: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "red", label: "Red", class: "bg-red-100 text-red-800 border-red-200" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-100 text-yellow-800 border-yellow-200" }
];

function GroupForm({ group, onSave, onCancel }) {
  const [formData, setFormData] = useState(group || {
    name: "",
    description: "",
    location: "",
    color: "blue",
    news_feed_url: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="bg-white shadow-2xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-500" />
                {group ? "Edit Group" : "Create New Group"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Mall Entrance Displays"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., Main Mall, Food Court"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="news_feed_url">News Feed URL (RSS)</Label>
                <Input
                  id="news_feed_url"
                  type="url"
                  value={formData.news_feed_url}
                  onChange={(e) => setFormData({...formData, news_feed_url: e.target.value})}
                  placeholder="https://feeds.bbci.co.uk/news/rss.xml"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({...formData, color: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`}></div>
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe this group of screens..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  {group ? "Update Group" : "Create Group"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function GroupManagement({ groups, onCreateGroup, onEditGroup, onDeleteGroup }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const handleSave = (groupData) => {
    if (editingGroup) {
      onEditGroup(editingGroup.id, groupData);
    } else {
      onCreateGroup(groupData);
    }
    setShowForm(false);
    setEditingGroup(null);
  };

  const getColorClass = (color) => {
    return COLOR_OPTIONS.find(c => c.value === color)?.class || COLOR_OPTIONS[0].class;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Screen Groups
          </CardTitle>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No groups created yet</p>
            <p className="text-sm">Create groups to organize your screens</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Badge className={getColorClass(group.color)}>
                    {group.name}
                  </Badge>
                  {group.location && (
                    <span className="text-sm text-slate-600">{group.location}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingGroup(group);
                      setShowForm(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm(`Delete group "${group.name}"?`)) {
                        onDeleteGroup(group.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <GroupForm
              group={editingGroup}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingGroup(null);
              }}
            />
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
