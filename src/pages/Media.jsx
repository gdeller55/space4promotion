import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Play,
  Eye,
  MoreVertical,
  Edit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import MediaUploadForm from "../components/media/MediaUploadForm";

export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const data = await base44.entities.Media.list("-created_date");
      setMedia(data);
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (mediaData, file) => {
    try {
      let fileUrl = mediaData.file_url;
      
      if (file) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadResult.file_url;
      }
      
      if (editingMedia) {
        await base44.entities.Media.update(editingMedia.id, {
          ...mediaData,
          file_url: fileUrl || editingMedia.file_url
        });
      } else {
        await base44.entities.Media.create({
          ...mediaData,
          file_url: fileUrl
        });
      }
      
      setShowUploadForm(false);
      setEditingMedia(null);
      loadMedia();
    } catch (error) {
      console.error("Error uploading media:", error);
    }
  };

  const handleEdit = (media) => {
    setEditingMedia(media);
    setShowUploadForm(true);
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getMediaIcon = (type) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'html': return FileText;
      default: return FileText;
    }
  };

  const getMediaColor = (type) => {
    switch (type) {
      case 'image': return 'from-green-400 to-green-500';
      case 'video': return 'from-purple-400 to-purple-500';
      case 'html': return 'from-blue-400 to-blue-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Media Library
            </h1>
            <p className="text-slate-600">Upload and manage your digital content</p>
          </div>
          <Button 
            onClick={() => setShowUploadForm(true)}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/25"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl shadow-slate-200/20 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search media by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {["all", "image", "video", "html"].map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                    className={typeFilter === type ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredMedia.map((item, index) => {
              const Icon = getMediaIcon(item.type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${getMediaColor(item.type)} rounded-xl flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold text-slate-900 truncate">
                              {item.title}
                            </CardTitle>
                            <Badge className="mt-1 text-xs">
                              {item.type}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {item.file_url && (
                              <DropdownMenuItem asChild>
                                <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                                  <Play className="w-4 h-4 mr-2" />
                                  Open File
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Thumbnail/Preview */}
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                        {item.thumbnail_url ? (
                          <img 
                            src={item.thumbnail_url} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : item.type === 'image' && item.file_url ? (
                          <img 
                            src={item.file_url} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-12 h-12 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>
                          {item.duration_seconds ? `${item.duration_seconds}s` : "Static"}
                        </span>
                        {item.file_size_mb && (
                          <span>
                            {item.file_size_mb.toFixed(1)} MB
                          </span>
                        )}
                      </div>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredMedia.length === 0 && !loading && (
          <div className="text-center py-12">
            <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchTerm || typeFilter !== "all" ? "No media matches your filters" : "No media uploaded"}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || typeFilter !== "all" 
                ? "Try adjusting your search criteria" 
                : "Upload images, videos, and HTML content to get started"
              }
            </p>
            {(!searchTerm && typeFilter === "all") && (
              <Button 
                onClick={() => setShowUploadForm(true)}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Media
              </Button>
            )}
          </div>
        )}

        {/* Upload Form Modal */}
        <AnimatePresence>
          {showUploadForm && (
            <MediaUploadForm
              onUpload={handleUpload}
              onCancel={() => {
                setShowUploadForm(false);
                setEditingMedia(null);
              }}
              editingMedia={editingMedia}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}