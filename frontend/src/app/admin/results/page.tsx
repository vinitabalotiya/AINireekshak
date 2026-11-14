"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreChart } from "@/components/charts/score-chart";
import { api } from "@/services/api";

export default function AdminResultsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Shortlist Modal
  const [shortlistModalOpen, setShortlistModalOpen] = useState(false);
  const [topN, setTopN] = useState("3");
  const [shortlistedTeams, setShortlistedTeams] = useState<any[]>([]);

  // Detailed Report Modal
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await api.getEvents();
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(String(data[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    }
    loadEvents();
  }, []);

  const loadRankings = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await api.getRankings(eventId);
      setRankings(data);
    } catch (err) {
      console.error("Failed to load rankings", err);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadRankings(selectedEventId);
    }
  }, [selectedEventId]);

  const handleShortlist = async () => {
    if (!selectedEventId) return;
    try {
      const res = await api.shortlistTeams(selectedEventId, parseInt(topN) || 3);
      setShortlistedTeams(res.shortlisted_teams || []);
      alert(`Shortlisted top ${topN} teams successfully!`);
      setShortlistModalOpen(false);
    } catch (err: any) {
      alert("Failed to shortlist: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleViewReport = async (teamId: number) => {
    try {
      const reports = await api.getTeamEvaluations(teamId);
      if (reports && reports.length > 0) {
        setSelectedReport(reports[0]);
        setReportModalOpen(true);
      } else {
        alert("No completed evaluation scorecard found for this team yet.");
      }
    } catch (err: any) {
      alert("Failed to fetch report: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Export Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <Award className="size-6 text-amber-400" />
              Rankings & Evaluation Reports
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Automated score aggregation, tie-breaker rankings, and official report exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShortlistModalOpen(true)}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
            >
              <CheckCircle className="size-3.5 mr-1.5 text-emerald-400" />
              Shortlist Top N
            </Button>

            {selectedEventId && (
              <>
                <a href={api.getCSVExportUrl(selectedEventId)} download>
                  <Button size="sm" variant="outline" className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs">
                    <Download className="size-3.5 mr-1.5 text-blue-400" />
                    Export CSV
                  </Button>
                </a>

                <a href={api.getExcelExportUrl(selectedEventId)} download>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                    <FileSpreadsheet className="size-3.5 mr-1.5" />
                    Export Excel
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <Filter className="size-4 text-slate-400" />
          <Label className="text-xs text-slate-300 whitespace-nowrap">Selected Event:</Label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex-1 max-w-xs h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Rankings Table */}
        {loading ? (
          <LoadingSpinner message="Calculating Official Standings..." />
        ) : rankings.length === 0 ? (
          <EmptyState
            title="No Evaluated Teams Yet"
            description="As teams complete their live AI judging sessions, their weighted scores and rankings will automatically populate here."
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3 px-4 font-medium text-center w-16">Rank</th>
                    <th className="py-3 px-4 font-medium">Team Name</th>
                    <th className="py-3 px-4 font-medium">Project Title</th>
                    <th className="py-3 px-4 font-medium text-right">Weighted Score</th>
                    <th className="py-3 px-4 font-medium text-right">Scorecard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rankings.map((team, idx) => (
                    <tr
                      key={team.team_id || idx}
                      className={`text-slate-300 hover:bg-slate-900/40 transition-colors ${
                        team.rank === 1
                          ? "bg-amber-500/5 font-semibold"
                          : team.rank <= 3
                          ? "bg-blue-500/5"
                          : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center size-6 rounded-full font-mono text-xs font-bold ${
                            team.rank === 1
                              ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30"
                              : team.rank === 2
                              ? "bg-slate-300 text-slate-950"
                              : team.rank === 3
                              ? "bg-amber-700 text-white"
                              : "text-slate-400"
                          }`}
                        >
                          {team.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{team.team_name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{team.project_name || "—"}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-emerald-400">
                        {(team.total_score || 0).toFixed(2)}/100
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewReport(team.team_id)}
                          className="h-7 text-xs text-blue-400 hover:bg-slate-800"
                        >
                          <FileText className="size-3 mr-1" />
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Shortlist Modal */}
      <Dialog open={shortlistModalOpen} onOpenChange={setShortlistModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Shortlist Top N Teams</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Select highest ranking teams for grand finale or awards stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <Label className="text-xs text-slate-300">Number of Top Teams to Shortlist:</Label>
            <Input
              type="number"
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              min={1}
              max={20}
              className="bg-slate-950 border-slate-800 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShortlistModalOpen(false)} className="border-slate-800 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleShortlist} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Confirm Shortlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Evaluation Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileCheck className="size-5 text-emerald-400" />
              Detailed Evidence-Linked Evaluation Scorecard
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Total Score: <strong className="text-emerald-400 font-mono text-sm">{(selectedReport?.total_score || 0).toFixed(1)}/100</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-2 text-xs">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-semibold text-slate-300">AI Judge Executive Summary:</span>
              <p className="mt-1 text-slate-400 leading-relaxed">
                {selectedReport?.summary || "Comprehensive interactive pitch and technical submission evaluated."}
              </p>
            </div>

            {/* Categories */}
            {selectedReport?.categories && (
              <div className="space-y-3">
                <span className="font-semibold text-slate-200">Category Breakdown & Evidence References:</span>
                {selectedReport.categories.map((cat: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-slate-200 capitalize">
                        {cat.category_name?.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">Weight: {cat.weight}%</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {(cat.score || 0).toFixed(1)}/100
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-400 leading-relaxed">{cat.justification}</p>

                    {cat.evidence_references && cat.evidence_references.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                        <strong className="text-slate-400">Cited Evidence: </strong>
                        {cat.evidence_references.join(" • ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setReportModalOpen(false)} className="bg-slate-800 text-slate-200 text-xs">
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
