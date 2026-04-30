
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select imports
import { X, Monitor, Link, Loader2, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";

export default function ScreenPairingForm({ onPair, onCancel, groups = [] }) {
  const [pairingCode, setPairingCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(""); // New state for selected group
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Pass selectedGroup to onPair
    const result = await onPair(pairingCode.toUpperCase(), selectedGroup);
    setLoading(false);
    if (!result.success) {
      setError(result.message || "An unknown error occurred.");
    }
  };

  const playerUrl = window.location.origin + createPageUrl("Player");

  const copyUrl = () => {
    navigator.clipboard.writeText(playerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                <Link className="w-5 h-5 text-cyan-500" />
                Pair New Screen
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
            <Alert className="mb-6 bg-cyan-50 border-cyan-200">
              <Monitor className="h-4 w-4" />
              <AlertTitle className="font-semibold text-cyan-900">How to Pair a New Screen</AlertTitle>
              <AlertDescription className="text-cyan-800 space-y-3">
                <p><strong>Step 1:</strong> On your physical screen device, open a web browser in full-screen (kiosk) mode.</p>
                
                <p><strong>Step 2:</strong> Navigate to this URL:</p>
                <div className="bg-white border border-cyan-200 rounded-lg p-3 mt-2 flex items-center justify-between">
                  <code className="text-sm text-slate-800 break-all flex-1">{playerUrl}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyUrl}
                    className="ml-2 text-cyan-600 hover:text-cyan-700"
                  >
                    {copied ? "Copied!" : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <p><strong>Step 3:</strong> A 6-digit code will appear on the screen. Enter that code below to complete the pairing.</p>
              </AlertDescription>
            </Alert>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pairing_code">6-Digit Pairing Code</Label>
                <p className="text-sm text-slate-500">
                  Enter the code displayed on your digital screen to link it to your account.
                </p>
                <Input
                  id="pairing_code"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  placeholder="e.g., A4B9D1"
                  required
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest h-16"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {groups.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="group">Assign to Group (Optional)</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Group</SelectItem> {/* Use empty string for "No Group" */}
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} {group.location && `- ${group.location}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                  disabled={loading || pairingCode.length !== 6}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Pair Screen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
