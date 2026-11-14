"use client";

import React, { useEffect, useState } from "react";
import {
  Video,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  Radio,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState<any[]>([]);

  // Form states
  const [teamId, setTeamId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("20");

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessData, teamsData, eventsData] = await Promise.all([
        api.getSessions(),
        api.getTeams(),
        api.getEvents(),
      ]);
      setSessions(sessData);
      setTeams(teamsData.items || teamsData);
      setEvents(eventsData);
      if (teamsData.items?.[0] || teamsData[0]) {
        setTeamId(String((teamsData.items?.[0] || teamsData[0]).id));
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    try {
      await api.createSession({
        team_id: team.id,
        event_id: team.event_id,
        duration_minutes: parseInt(durationMinutes) || 20,
      });
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Failed to create session: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleStatusUpdate = async (sessionId: number, newStatus: string) => {
    try {
      await api.updateSessionStatus(sessionId, newStatus);
      loadData();
    } catch (err: any) {
      alert("Failed to update status: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleViewTranscript = async (sessionId: number) => {
    try {
      const records = await api.getSessionTranscript(sessionId);
      setActiveTranscript(records);
      setTranscriptModalOpen(true);
    } catch (err: any) {
      alert("Failed to load transcripts: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Judging Sessions</h1>
            <p className="text-xs text-slate-400 mt-1">
              Allocate video time slots, view live speech transcripts, and monitor AI avatar interaction.
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            <Plus className="size-3.5 mr-1.5" />
            Schedule Session
          </Button>
        </div>

        {/* Sessions Table */}
        {loading ? (
          <LoadingSpinner message="Loading Sessions..." />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No Scheduled Sessions"
            description="Assign judging time slots to registered teams to begin pitch evaluation."
            actionLabel="Schedule Session"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3 px-4 font-medium">Session ID</th>
                    <th className="py-3 px-4 font-medium">Team</th>
                    <th className="py-3 px-4 font-medium">Duration</th>
                    <th className="py-3 px-4 font-medium">Room Name</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="text-slate-300 hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-100">#{sess.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-200">
                          {sess.team?.name || `Team #${sess.team_id}`}
                        </p>
                        <p className="text-[11px] text-slate-500">Event #{sess.event_id}</p>
                      </td>
                      <td className="py-3 px-4 font-mono">{sess.duration_minutes || 20} mins</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {sess.livekit_room_name || `ainireekshak_session_${sess.id}`}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sess.status} />
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewTranscript(sess.id)}
                          className="h-7 text-xs text-blue-400 hover:bg-slate-800"
                        >
                          <MessageSquare className="size-3 mr-1" />
                          Transcript
                        </Button>

                        {sess.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusUpdate(sess.id, "active")}
                            className="h-7 text-xs text-emerald-400 hover:bg-emerald-950/40"
                          >
                            <Play className="size-3 mr-1" />
                            Start
                          </Button>
                        )}

                        {sess.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusUpdate(sess.id, "completed")}
                            className="h-7 text-xs text-indigo-400 hover:bg-indigo-950/40"
                          >
                            <CheckCircle className="size-3 mr-1" />
                            Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Session Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Schedule Judging Slot</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Assign a dedicated real-time judging room and AI avatar interview duration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-300">Select Team</Label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
                className="w-full mt-1 h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Event #{t.event_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Allocated Duration (Minutes)</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                min={5}
                max={60}
                required
                className="mt-1 bg-slate-950 border-slate-800 text-sm"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                Create Room Slot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transcript Viewer Modal */}
      <Dialog open={transcriptModalOpen} onOpenChange={setTranscriptModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="size-4 text-blue-400" />
              Judging Session Transcript Log
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Complete spoken dialogue between the AI judge and the participant team.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2.5 my-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            {activeTranscript.length === 0 ? (
              <p className="text-center text-slate-500 py-6">No transcript entries recorded yet.</p>
            ) : (
              activeTranscript.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded border ${
                    t.speaker === "ai_judge"
                      ? "bg-blue-950/20 border-blue-900/30 text-blue-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-semibold ${t.speaker === "ai_judge" ? "text-blue-400" : "text-emerald-400"}`}>
                      {t.speaker === "ai_judge" ? "AI Judge" : "Participant"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 uppercase">
                      Lang: {t.language || "en"}
                    </span>
                  </div>
                  <p className="leading-relaxed">{t.content}</p>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setTranscriptModalOpen(false)} className="bg-slate-800 text-slate-200 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
