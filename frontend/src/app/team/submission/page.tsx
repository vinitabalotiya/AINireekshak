"use client";

import React, { useEffect, useState } from "react";
import {
  UploadCloud,
  FileCode2,
  FileText,
  GitBranch,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Eye,
} from "lucide-react";
import { TeamLayout } from "@/components/layout/team-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/shared/file-upload";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function TeamSubmissionPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submissionType, setSubmissionType] = useState<"presentation" | "code" | "document" | "github">("presentation");
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Analysis modal
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  const fetchSubmissions = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await api.getTeamSubmissions(user.id);
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to load submissions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Need event_id
    const eventId = user.event_id || 1;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("team_id", String(user.id));
      formData.append("event_id", String(eventId));
      formData.append("submission_type", submissionType);

      if (submissionType === "github") {
        if (!githubUrl) {
          alert("Please enter a valid GitHub repository link.");
          setUploading(false);
          return;
        }
        formData.append("github_url", githubUrl);
      } else {
        if (!selectedFile) {
          alert("Please select a file to upload.");
          setUploading(false);
          return;
        }
        formData.append("file", selectedFile);
      }

      await api.uploadSubmission(formData);
      setSelectedFile(null);
      setGithubUrl("");
      fetchSubmissions();
      alert("Submission uploaded successfully!");
    } catch (err: any) {
      alert("Upload failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerAnalysis = async (submissionId: number) => {
    try {
      const res = await api.analyzeSubmission(submissionId);
      setAnalysisResult(res.analysis_result || res);
      setAnalysisModalOpen(true);
      fetchSubmissions();
    } catch (err: any) {
      alert("Analysis failed: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <UploadCloud className="size-6 text-blue-400" />
            Project Submission Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Submit presentations, source code ZIP archives, or public GitHub repositories for static analysis.
          </p>
        </div>

        {/* Upload Form Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-5">
          <h3 className="text-sm font-semibold text-slate-200">New Submission</h3>

          {/* Submission Type Switcher */}
          <div className="flex flex-wrap gap-2">
            {[
              { type: "presentation", label: "Presentation (PPT/PDF)", icon: FileText },
              { type: "code", label: "Source Code (ZIP)", icon: FileCode2 },
              { type: "github", label: "GitHub Repository", icon: GitBranch },
              { type: "document", label: "Documentation (DOCX/PDF)", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = submissionType === tab.type;
              return (
                <Button
                  key={tab.type}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setSubmissionType(tab.type as any)}
                  className={`h-9 text-xs transition-all ${
                    isSelected
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="size-3.5 mr-1.5" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {submissionType === "github" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Public GitHub Repository URL</Label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="bg-slate-950 border-slate-800 text-sm font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  AiNireekshak performs safe static analysis of directories and dependency manifests. Code is never arbitrarily executed.
                </p>
              </div>
            ) : (
              <FileUpload
                onFileSelect={(file) => setSelectedFile(file)}
                accept={
                  submissionType === "presentation"
                    ? ".pdf,.pptx,.ppt"
                    : submissionType === "code"
                    ? ".zip"
                    : ".pdf,.docx,.doc,.txt"
                }
                label={`Upload ${submissionType.toUpperCase()} file`}
              />
            )}

            <Button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium h-9"
            >
              {uploading ? "Uploading & Extracting..." : "Submit Material"}
            </Button>
          </form>
        </div>

        {/* Existing Submissions List */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Uploaded Submissions ({submissions.length})</h3>

          {loading ? (
            <LoadingSpinner message="Fetching submission history..." />
          ) : submissions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No project files submitted yet. Upload your presentation and code above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">File / Link</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="text-slate-300">
                      <td className="py-3 font-semibold text-slate-200 capitalize">
                        {sub.submission_type}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-slate-300">
                        {sub.original_filename || sub.github_url || "Submission File"}
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {sub.file_size ? `${(sub.file_size / (1024 * 1024)).toFixed(2)} MB` : "—"}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-3 text-right space-x-2">
                        {sub.analysis_result ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAnalysisResult(sub.analysis_result);
                              setAnalysisModalOpen(true);
                            }}
                            className="h-7 text-xs text-emerald-400 hover:bg-emerald-950/30"
                          >
                            <Eye className="size-3 mr-1" />
                            View Evidence
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTriggerAnalysis(sub.id)}
                            className="h-7 text-xs text-indigo-400 hover:bg-indigo-950/30"
                          >
                            <Sparkles className="size-3 mr-1" />
                            Analyze
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Evidence Modal */}
      <Dialog open={analysisModalOpen} onOpenChange={setAnalysisModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[80vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-blue-400" />
              Automated AI Submission Evidence Analysis
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Extracted content, architectural structure, and technical components.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 my-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            {analysisResult ? (
              <pre className="font-mono text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500 py-6 text-center">No analysis content available.</p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setAnalysisModalOpen(false)} className="bg-slate-800 text-slate-200 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeamLayout>
  );
}
