import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Image, Video, FileText, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function MediaUploadForm({ onUpload, onCancel, editingMedia }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "image",
    duration_seconds: 10,
    tags: [],
    target_audience: "",
    advertiser: ""
  });
  const [file, setFile] = useState(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (editingMedia) {
      // Extract advertiser from tags
      const advertiserTag = editingMedia.tags?.find(tag => tag.startsWith('advertiser:'));
      const advertiser = advertiserTag ? advertiserTag.replace('advertiser:', '') : '';
      
      // Filter out advertiser tags from regular tags
      const regularTags = editingMedia.tags?.filter(tag => !tag.startsWith('advertiser:')) || [];
      
      setFormData({
        title: editingMedia.title || "",
        description: editingMedia.description || "",
        type: editingMedia.type || "image",
        duration_seconds: editingMedia.duration_seconds || 10,
        tags: regularTags,
        target_audience: editingMedia.target_audience || "",
        advertiser: advertiser
      });
    }
  }, [editingMedia]);

  const { data: advertisers = [] } = useQuery({
    queryKey: ['advertisers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Advertiser.filter({ owner_user_id: user.id }, 'name');
    },
    enabled: !!user?.id
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Manage advertiser tag
    let tags = [...formData.tags];
    
    // Remove any existing advertiser tag
    tags = tags.filter(tag => !tag.startsWith('advertiser:'));
    
    // Add new advertiser tag if selected
    if (formData.advertiser) {
      tags.push(`advertiser:${formData.advertiser}`);
    }
    
    onUpload({ ...formData, tags }, file);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Auto-detect type based on file
      if (selectedFile.type.startsWith('image/')) {
        setFormData(prev => ({ ...prev, type: 'image' }));
      } else if (selectedFile.type.startsWith('video/')) {
        setFormData(prev => ({ ...prev, type: 'video' }));
      }
      
      // Set title to filename if empty
      if (!formData.title) {
        setFormData(prev => ({ 
          ...prev, 
          title: selectedFile.name.replace(/\.[^/.]+$/, "")
        }));
      }
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-white shadow-2xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-500" />
                {editingMedia ? 'Edit Media' : 'Upload New Media'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-colors">
                  <input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,video/*,.html,.htm"
                    className="hidden"
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-400">
                      Images, videos, or HTML files
                    </p>
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter media title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe this media content..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Content Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({...formData, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <Image className="w-4 h-4" />
                            Image
                          </div>
                        </SelectItem>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Video
                          </div>
                        </SelectItem>
                        <SelectItem value="html">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            HTML/Web Content
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={formData.duration_seconds}
                      onChange={(e) => setFormData({...formData, duration_seconds: parseInt(e.target.value)})}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advertiser">Advertiser</Label>
                  <Select 
                    value={formData.advertiser} 
                    onValueChange={(value) => setFormData({...formData, advertiser: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Unassigned</SelectItem>
                      {advertisers.map(adv => (
                        <SelectItem key={adv.id} value={adv.name}>{adv.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Input
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                    placeholder="e.g., Young Adults, Families, Professionals"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addTag}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-800 text-sm rounded-md"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-cyan-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                  disabled={!formData.title}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {editingMedia ? 'Save Changes' : 'Upload Media'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}