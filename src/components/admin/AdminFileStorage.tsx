import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Upload, FileText, Trash2, Download, Search, FolderOpen, Loader2, FolderPlus, Folder, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminExportButton } from "./AdminExportButton";

interface StoredFile {
  name: string;
  id: string;
  created_at: string;
  metadata: { size?: number; mimetype?: string };
}

export function AdminFileStorage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState("admin-docs");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from("chat-files").list(currentPath, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

      if (error) {
        console.log("No files yet or folder doesn't exist");
        setFiles([]);
      } else {
        setFiles(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("chat-files")
        .upload(`${currentPath}/${fileName}`, file);

      if (error) throw error;

      toast({ title: "✅ File uploaded!", description: file.name });
      fetchFiles();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      // Create folder by uploading a placeholder file
      const folderPath = `${currentPath}/${newFolderName.trim()}/.folder`;
      const { error } = await supabase.storage
        .from("chat-files")
        .upload(folderPath, new Blob([""]));

      if (error) throw error;

      toast({ title: "✅ Folder created!", description: newFolderName });
      setNewFolderName("");
      setShowNewFolder(false);
      fetchFiles();
    } catch (err: any) {
      toast({ title: "Create folder failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("chat-files")
        .remove([`${currentPath}/${fileName}`]);

      if (error) throw error;

      toast({ title: "File deleted" });
      fetchFiles();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownload = async (fileName: string) => {
    const { data } = supabase.storage
      .from("chat-files")
      .getPublicUrl(`${currentPath}/${fileName}`);
    
    window.open(data.publicUrl, "_blank");
  };

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(`${currentPath}/${folderName}`);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/");
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath(parts.join("/"));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) && f.name !== ".folder"
  );

  const folders = filteredFiles.filter(f => !f.metadata?.mimetype && f.name !== ".emptyFolderPlaceholder");
  const regularFiles = filteredFiles.filter(f => f.metadata?.mimetype || f.metadata?.size);

  const breadcrumbs = currentPath.split("/");

  const exportColumns = [
    { key: "name", label: "File Name" },
    { key: "created_at", label: "Created At" },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                CodeNova Drive
              </CardTitle>
              <CardDescription>
                Store and manage files related to CodeNova AI and StackMind Technologies
              </CardDescription>
            </div>
            <AdminExportButton data={filteredFiles} columns={exportColumns} fileName="drive_files" tabName="CodeNova Drive" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && <span className="text-muted-foreground">/</span>}
                <button
                  onClick={() => setCurrentPath(breadcrumbs.slice(0, idx + 1).join("/"))}
                  className="text-primary hover:underline"
                >
                  {crumb}
                </button>
              </span>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {currentPath !== "admin-docs" && (
              <Button variant="outline" size="sm" onClick={navigateUp}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)}>
              <FolderPlus className="w-4 h-4 mr-1" /> New Folder
            </Button>
            <Button disabled={uploading} asChild className="relative" size="sm">
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            </Button>
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="flex gap-2 p-3 rounded-lg bg-muted/20 border">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              <Button size="sm" onClick={handleCreateFolder}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{folders.length}</p>
              <p className="text-xs text-muted-foreground">Folders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{regularFiles.length}</p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">
                {formatFileSize(regularFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total Size</p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Empty folder</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {/* Folders first */}
              {folders.map((folder) => (
                <div
                  key={folder.id || folder.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigateToFolder(folder.name)}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="font-medium text-sm">{folder.name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Folder</Badge>
                </div>
              ))}
              {/* Files */}
              {regularFiles.map((file) => (
                <div key={file.id || file.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.metadata?.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(file.name)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(file.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
