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
  ShieldCheck,
  AlertTriangle,
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
        const eList = Array.isArray(data) ? data : (data?.items || []);
        setEvents(eList);
        if (eList.length > 0) {
          setSelectedEventId(String(eList[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
        setEvents([]);
      }
    }
    loadEvents();
  }, []);

  const loadRankings = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await api.getRankings(eventId);
      setRankings(Array.isArray(data) ? data : (data?.items || []));
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
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Award className="size-6 text-red-500" />
              Rankings & Evaluation Reports
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Automated score aggregation, tie-breaker rankings, and official report exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShortlistModalOpen(true)}
              className="border-white/15 bg-black hover:border-white/30 text-zinc-300 text-xs font-mono rounded"
            >
              <CheckCircle className="size-3.5 mr-1.5 text-zinc-400" />
              Shortlist Top N
            </Button>

            {selectedEventId && (
              <>
                <a href={api.getCSVExportUrl(selectedEventId)} download>
                  <Button size="sm" variant="outline" className="border-white/15 bg-black hover:border-white/30 text-zinc-300 text-xs font-mono rounded">
                    <Download className="size-3.5 mr-1.5 text-red-500" />
                    Export CSV
                  </Button>
                </a>

                <a href={api.getExcelExportUrl(selectedEventId)} download>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase tracking-wider rounded">
                    <FileSpreadsheet className="size-3.5 mr-1.5" />
                    Export Excel
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-3 p-4 rounded border border-white/10 bg-zinc-950 font-mono">
          <Filter className="size-3.5 text-zinc-500" />
          <Label className="text-xs text-zinc-400 whitespace-nowrap uppercase tracking-wider text-[10px]">Selected Event:</Label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex-1 max-w-xs h-9 px-3 rounded bg-black border border-white/15 text-xs text-white outline-none focus:border-red-600 font-mono"
          >
            {(Array.isArray(events) ? events : []).map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Champion Podium Banner (White Tone Minimalist Showcase) */}
        {!loading && Array.isArray(rankings) && rankings.length > 0 && (
          <div className="p-5 rounded border border-white bg-white text-black font-mono shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-11 rounded bg-black text-white flex items-center justify-center font-black text-sm">
                #1
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-red-600 tracking-widest">
                    Tournament Leader
                  </span>
                  <span className="text-zinc-600 text-xs">· Team #{rankings[0].team_id}</span>
                </div>
                <h3 className="text-lg font-extrabold text-black tracking-tight">
                  {rankings[0].team_name}
                </h3>
                <p className="text-xs text-zinc-600">
                  {rankings[0].project_name || "Highest Aggregate Multilingual Evaluation"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-zinc-200 pt-3 sm:pt-0">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Score</span>
                <span className="text-2xl font-black text-black">
                  {(rankings[0].total_score || 0).toFixed(1)}
                  <span className="text-xs font-normal text-zinc-600">/100</span>
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => handleViewReport(rankings[0].team_id)}
                className="bg-red-600 hover:bg-black text-white text-xs font-mono uppercase tracking-wider h-8 px-4 rounded transition-colors"
              >
                Inspect Scorecard
              </Button>
            </div>
          </div>
        )}

        {/* Rankings Table */}
        {loading ? (
          <LoadingSpinner message="Calculating Official Standings..." />
        ) : rankings.length === 0 ? (
          <EmptyState
            title="No Evaluated Teams Yet"
            description="As teams complete their live AI judging sessions, their weighted scores and rankings will automatically populate here."
          />
        ) : (
          <div className="rounded border border-white/10 bg-zinc-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-black text-zinc-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-medium text-center w-16">Rank</th>
                    <th className="py-3 px-4 font-medium">Team Name</th>
                    <th className="py-3 px-4 font-medium">Project Title</th>
                    <th className="py-3 px-4 font-medium text-center">Liveness Status</th>
                    <th className="py-3 px-4 font-medium text-center">Behaviour (100)</th>
                    <th className="py-3 px-4 font-medium text-right">Weighted Score</th>
                    <th className="py-3 px-4 font-medium text-right">Scorecard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(Array.isArray(rankings) ? rankings : []).map((team, idx) => {
                    const isFlagged = team.liveness_flag === "FLAGGED";
                    const bScore = team.behaviour_score || 85;

                    return (
                      <tr
                        key={team.team_id || idx}
                        className={`text-zinc-300 hover:bg-white/4 transition-colors ${
                          team.rank === 1
                            ? "bg-red-600/5 font-semibold"
                            : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center size-6 rounded font-mono text-xs font-bold ${
                              team.rank === 1
                                ? "bg-red-600 text-white"
                                : team.rank <= 3
                                ? "bg-white text-black"
                                : "text-zinc-500"
                            }`}
                          >
                            {team.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{team.team_name}</td>
                        <td className="py-3.5 px-4 text-zinc-400">{team.project_name || "—"}</td>

                        {/* Liveness Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isFlagged
                                ? "bg-red-600/10 text-red-500 border-red-600/40"
                                : "bg-white/10 text-white border-white/20"
                            }`}
                          >
                            {isFlagged ? (
                              <AlertTriangle className="size-3 text-red-500" />
                            ) : (
                              <ShieldCheck className="size-3 text-white" />
                            )}
                            {isFlagged ? "Flagged" : "Verified"}
                          </span>
                        </td>

                        {/* Normalized Behaviour Score (1-100) */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                          {bScore}/100
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-white">
                          {(team.total_score || 0).toFixed(2)}/100
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewReport(team.team_id)}
                            className="h-7 text-xs font-mono text-zinc-300 hover:text-red-500 hover:bg-white/5 rounded"
                          >
                            <FileText className="size-3 mr-1 text-red-500" />
                            View Report
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Shortlist Modal */}
      <Dialog open={shortlistModalOpen} onOpenChange={setShortlistModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-zinc-950 border border-white/10 text-white rounded">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase tracking-wider text-white">Shortlist Top N Teams</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs font-sans">
              Select highest ranking teams for grand finale or awards stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 font-mono">
            <Label className="text-xs text-zinc-300">Number of Top Teams to Shortlist:</Label>
            <Input
              type="number"
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              min={1}
              max={20}
              className="bg-black border-white/10 text-white text-xs rounded focus:border-red-600"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShortlistModalOpen(false)} className="border-white/15 text-zinc-400 hover:text-white rounded text-xs font-mono">
              Cancel
            </Button>
            <Button onClick={handleShortlist} className="bg-red-600 hover:bg-red-700 text-white rounded text-xs font-mono uppercase tracking-wider">
              Confirm Shortlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Evaluation Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col bg-zinc-950 border border-white/10 text-white rounded">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-white">
              <FileCheck className="size-4 text-red-500" />
              Detailed Evidence-Linked Evaluation Scorecard
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs font-mono">
              Total Score: <strong className="text-white text-sm">{(selectedReport?.total_score || 0).toFixed(1)}/100</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3.5 my-3 pr-2 text-xs font-mono">
            {/* Summary */}
            <div className="p-3.5 rounded bg-black border border-white/8">
              <span className="font-semibold text-white uppercase tracking-wider text-[10px]">AI Judge Executive Summary:</span>
              <p className="mt-1 text-zinc-300 leading-relaxed font-sans text-xs">
                {selectedReport?.summary || "Comprehensive interactive pitch and technical submission evaluated."}
              </p>
            </div>

            {/* Categories */}
            {Array.isArray(selectedReport?.categories) && selectedReport.categories.length > 0 && (
              <div className="space-y-3">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Category Breakdown &amp; Evidence References:</span>
                {selectedReport.categories.map((cat: any, i: number) => (
                  <div key={i} className="p-3.5 rounded border border-white/8 bg-black">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-white capitalize font-mono">
                        {cat.category_name?.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-zinc-500">Weight: {cat.weight}%</span>
                        <span className="font-bold text-white">
                          {(cat.score || 0).toFixed(1)}/100
                        </span>
                      </div>
                    </div>

                    <p className="text-zinc-400 leading-relaxed font-sans text-xs">{cat.justification}</p>

                    {cat.evidence_references && cat.evidence_references.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/8 text-[11px] text-zinc-500 font-mono">
                        <strong className="text-zinc-400">Cited Evidence: </strong>
                        {cat.evidence_references.join(" • ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setReportModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded font-mono">
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
