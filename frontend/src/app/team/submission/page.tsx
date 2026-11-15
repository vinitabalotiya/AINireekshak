"use client";

import React, { useEffect, useState } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Layers,
  Cpu,
  Lightbulb,
  CheckCircle,
  FileCheck,
  Trash2,
} from "lucide-react";
import { TeamLayout } from "@/components/layout/team-layout";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/shared/file-upload";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/services/api";

export default function TeamSubmissionPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Evidence Modal
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const fetchSubmissions = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await api.getTeamSubmissions(user.id);
      setSubmissions(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      console.error("Failed to load submissions", err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  const hasUploaded = Array.isArray(submissions) && submissions.length >= 1;

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (hasUploaded) {
      alert("Submission limit reached: Teams are strictly limited to 1 presentation submission.");
      return;
    }

    if (!selectedFile) {
      alert("Please select a presentation file (.pptx, .ppt, or .pdf) to upload.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("team_id", String(user.id));
      formData.append("event_id", String(user.event_id || 1));
      formData.append("submission_type", "presentation");
      formData.append("file", selectedFile);

      const uploadRes = await api.uploadSubmission(formData);

      setSelectedFile(null);
      await fetchSubmissions();
      if (uploadRes?.analysis_result) {
        setAnalysisResult(uploadRes.analysis_result);
      }
      alert("Presentation uploaded and analyzed successfully by AI Judge! Your slides and architecture are ready for cross-examination.");
    } catch (err: any) {
      alert("Upload failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerAnalysis = async (subId: number) => {
    try {
      const res = await api.analyzeSubmission(subId);
      setAnalysisResult(res.analysis_result);
      setAnalysisModalOpen(true);
      fetchSubmissions();
    } catch (err: any) {
      alert("Analysis failed: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleDeleteSubmission = async (subId: number) => {
    if (!confirm("Are you sure you want to remove your submitted presentation? You will be able to upload a fresh presentation deck.")) {
      return;
    }
    try {
      setLoading(true);
      await api.deleteSubmission(subId);
      await fetchSubmissions();
      alert("Previous presentation removed successfully. You may now upload a new pitch deck.");
    } catch (err: any) {
      alert("Failed to remove presentation: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
            <span>Artifact Requirements</span>
            <span className="text-zinc-600">·</span>
            <span className="text-red-500 font-bold">1 PPT Submission Limit</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UploadCloud className="size-6 text-red-500" />
            Presentation Deck Submission
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Upload your project presentation slides (.pptx, .ppt, or .pdf, max 10 MB). The AI Judge extracts architectural claims and cross-examines your pitch in real-time.
          </p>
        </div>

        {/* Dynamic Upload / Registered State Container */}
        {hasUploaded ? (
          /* Locked State: 1-Submission Limit Enforced */
          <div className="p-6 rounded border border-white bg-white text-black font-mono shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                    Limit Reached: 1/1 Submitted
                  </span>
                  <span className="text-red-600 font-bold text-xs uppercase flex items-center gap-1">
                    <FileCheck className="size-3.5" /> Official Registered Deck
                  </span>
                </div>
                <h3 className="text-lg font-black text-black tracking-tight">
                  {submissions[0].original_filename || "Presentation Deck"}
                </h3>
                <p className="text-xs text-zinc-600 font-sans max-w-xl">
                  Each participating team is strictly permitted to submit exactly one presentation deck. Additional uploads are disabled to preserve evaluation integrity.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1 font-mono">
                  <span>Size: {submissions[0].file_size ? `${(submissions[0].file_size / (1024 * 1024)).toFixed(2)} MB` : "Ready"}</span>
                  <span>Status: <strong className="text-black uppercase">{submissions[0].status}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {submissions[0].analysis_result ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setAnalysisResult(submissions[0].analysis_result);
                      setAnalysisModalOpen(true);
                    }}
                    className="bg-black hover:bg-zinc-800 text-white text-xs font-mono uppercase tracking-wider h-9 px-4 rounded shadow-sm"
                  >
                    <Eye className="size-3.5 mr-1.5 text-red-500" />
                    View AI Analysis
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleTriggerAnalysis(submissions[0].id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase tracking-wider h-9 px-4 rounded"
                  >
                    <Sparkles className="size-3.5 mr-1.5" />
                    Extract &amp; Analyze
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteSubmission(submissions[0].id)}
                  className="border-red-600/40 hover:border-red-600 hover:bg-red-600/10 text-red-600 text-xs font-mono uppercase tracking-wider h-9 px-3 rounded transition-colors"
                >
                  <Trash2 className="size-3.5 mr-1.5 text-red-600" />
                  Remove &amp; Re-upload
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Upload Dropzone (When 0 submissions uploaded) */
          <div className="p-6 rounded border border-white/10 bg-zinc-950 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
                  Upload Presentation Deck (PPT / PPTX / PDF)
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Single upload allowed per team · Maximum file size 10 MB
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 bg-black text-zinc-400">
                0/1 Submitted
              </span>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <FileUpload
                onFileSelect={(file) => setSelectedFile(file)}
                maxSizeMB={10}
                accept=".pptx,.ppt,.pdf"
                label="Select Presentation Deck (.pptx, .ppt, .pdf — Max 10 MB)"
              />

              <div className="flex items-center justify-between pt-2 border-t border-white/8">
                <span className="text-[10px] text-zinc-500 font-mono">
                  Supported: Microsoft PowerPoint (.ppt, .pptx) and Adobe PDF (.pdf)
                </span>
                <Button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-mono uppercase tracking-wider h-9 px-5 rounded"
                >
                  {uploading ? "Uploading & Extracting..." : "Submit Presentation Deck"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Submissions List */}
        <div className="p-6 rounded border border-white/10 bg-zinc-950">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Registered Presentation ({submissions.length}/1)
            </h3>
            {hasUploaded && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-600/30 bg-red-600/10 text-red-400">
                Limit Reached
              </span>
            )}
          </div>

          {loading ? (
            <LoadingSpinner message="Fetching submission status..." />
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded font-mono text-xs text-zinc-500 space-y-1">
              <p>No presentation deck submitted yet.</p>
              <p className="text-[11px] text-zinc-600">Please upload your PowerPoint or PDF deck above before entering the live judging room.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Presentation File</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(Array.isArray(submissions) ? submissions : []).map((sub) => (
                    <tr key={sub.id} className="text-zinc-300">
                      <td className="py-3 font-semibold text-white uppercase">
                        PPT / Deck
                      </td>
                      <td className="py-3 font-mono text-[11px] text-zinc-300">
                        {sub.original_filename || "Presentation File"}
                      </td>
                      <td className="py-3 font-mono text-zinc-500">
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
                            className="h-7 text-xs font-mono text-white hover:text-red-400 hover:bg-white/5 rounded"
                          >
                            <Eye className="size-3 mr-1 text-red-500" />
                            View Evidence
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTriggerAnalysis(sub.id)}
                            className="h-7 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/5 rounded"
                          >
                            <Sparkles className="size-3 mr-1 text-red-500" />
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
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col bg-zinc-950 border border-white/10 text-white rounded">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-mono font-semibold uppercase tracking-wider text-white">
              <Sparkles className="size-4 text-red-500" />
              Automated AI Submission Evidence Analysis
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Extracted architectural claims, technical stack, problem relevance, and implementation feasibility from presentation slides.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3.5 my-2 p-4 rounded bg-black border border-white/8 text-xs">
            {analysisResult ? (
              <div className="space-y-3.5">
                {/* Mode Indicator */}
                {analysisResult.mode && (
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 font-mono">
                    <span className="font-semibold text-xs flex items-center gap-1.5">
                      <Sparkles className="size-3 text-red-500" /> Engine Status
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white">{analysisResult.mode}</span>
                  </div>
                )}

                {/* Problem & Solution Cards */}
                <div className="space-y-2">
                  <div className="p-3 rounded bg-zinc-900/60 border border-white/8 space-y-1">
                    <span className="text-zinc-200 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="size-3 text-red-500" /> Problem Statement
                    </span>
                    <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                      {analysisResult.problem_statement || "Extracted from presentation slides."}
                    </p>
                  </div>

                  <div className="p-3 rounded bg-zinc-900/60 border border-white/8 space-y-1">
                    <span className="text-zinc-200 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="size-3 text-red-500" /> Proposed Solution
                    </span>
                    <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                      {analysisResult.solution || "Extracted from presentation slides."}
                    </p>
                  </div>
                </div>

                {/* Tech Stack Chips */}
                {Array.isArray(analysisResult.tech_stack) && analysisResult.tech_stack.length > 0 && (
                  <div className="p-3 rounded bg-zinc-900/60 border border-white/8 space-y-2">
                    <span className="text-zinc-200 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="size-3 text-red-500" /> Identified Tech Stack
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                      {analysisResult.tech_stack.map((tech: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-black border border-white/15 text-zinc-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Innovation & Feasibility Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysisResult.innovation && (
                    <div className="p-3 rounded bg-zinc-900/60 border border-white/8 space-y-1">
                      <span className="text-zinc-200 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="size-3 text-red-500" /> Innovation
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">{analysisResult.innovation}</p>
                    </div>
                  )}

                  {analysisResult.feasibility && (
                    <div className="p-3 rounded bg-zinc-900/60 border border-white/8 space-y-1">
                      <span className="text-zinc-200 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="size-3 text-red-500" /> Feasibility
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">{analysisResult.feasibility}</p>
                    </div>
                  )}
                </div>

                {/* Summary / Raw Fallback */}
                {analysisResult.raw_response && (
                  <div className="p-3 rounded bg-zinc-900/60 border border-white/8 text-zinc-300 text-xs font-sans">
                    {analysisResult.raw_response}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-600 py-6 text-center font-mono">No analysis content available.</p>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center">
            <span className="text-[10px] text-zinc-500 font-mono">AiNireekshak PPT Analysis Engine</span>
            <Button onClick={() => setAnalysisModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs h-8 rounded font-mono">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeamLayout>
  );
}
