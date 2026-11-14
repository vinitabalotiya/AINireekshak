"use client";

import React, { useEffect, useState } from "react";
import { Plus, Sliders, Trash2, Calendar, Users, AlertCircle, Check } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { api } from "@/services/api";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [weightsModalOpen, setWeightsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Form states for new event
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState("50");

  // Form states for scoring weights
  const [weights, setWeights] = useState({
    pitch_technical: 60,
    presentation: 15,
    code_implementation: 8,
    feasibility: 7,
    innovation: 5,
    problem_relevance: 5,
  });
  const [weightsError, setWeightsError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEvent({
        name,
        description,
        max_teams: parseInt(maxTeams) || 50,
      });
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      fetchEvents();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create event");
    }
  };

  const handleOpenWeights = (evt: any) => {
    setSelectedEvent(evt);
    if (evt.scoring_weights) {
      setWeights({
        pitch_technical: evt.scoring_weights.pitch_technical ?? 60,
        presentation: evt.scoring_weights.presentation ?? 15,
        code_implementation: evt.scoring_weights.code_implementation ?? 8,
        feasibility: evt.scoring_weights.feasibility ?? 7,
        innovation: evt.scoring_weights.innovation ?? 5,
        problem_relevance: evt.scoring_weights.problem_relevance ?? 5,
      });
    }
    setWeightsError(null);
    setWeightsModalOpen(true);
  };

  const handleSaveWeights = async () => {
    const total =
      Number(weights.pitch_technical) +
      Number(weights.presentation) +
      Number(weights.code_implementation) +
      Number(weights.feasibility) +
      Number(weights.innovation) +
      Number(weights.problem_relevance);

    if (Math.abs(total - 100) > 0.01) {
      setWeightsError(`Weights must sum to exactly 100%. Current sum: ${total.toFixed(1)}%`);
      return;
    }

    try {
      await api.updateScoringWeights(selectedEvent.id, weights);
      setWeightsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      setWeightsError(err?.response?.data?.detail || "Failed to save scoring weights");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await api.deleteEvent(selectedEvent.id);
      fetchEvents();
    } catch (err: any) {
      alert("Failed to delete event: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Hackathon Events</h1>
            <p className="text-xs text-slate-400 mt-1">
              Create competitions, allocate team slots, and configure AI judging criteria weights.
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Event
          </Button>
        </div>

        {/* Events List */}
        {loading ? (
          <LoadingSpinner message="Loading Events..." />
        ) : events.length === 0 ? (
          <EmptyState
            title="No Events Created"
            description="Create your first hackathon event to register teams and schedule multilingual judging sessions."
            actionLabel="Create Event"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs text-blue-400 font-semibold">Event #{evt.id}</span>
                    <StatusBadge status={evt.status} />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{evt.name}</h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{evt.description || "No description provided."}</p>

                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-slate-500" />
                      Max {evt.max_teams || 50} Teams
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-slate-500" />
                      Status: {evt.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800/80">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenWeights(evt)}
                    className="h-8 border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300 text-xs"
                  >
                    <Sliders className="size-3.5 mr-1.5 text-indigo-400" />
                    Judging Weights
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedEvent(evt);
                      setDeleteModalOpen(true);
                    }}
                    className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Create New Hackathon Event</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Setup competition parameters and team capacity.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-3.5 py-2">
            <div>
              <Label htmlFor="evt-name" className="text-xs text-slate-300">Event Title</Label>
              <Input
                id="evt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 bg-slate-950 border-slate-800 text-sm"
                placeholder="e.g. Smart India AI Hackathon 2026"
              />
            </div>
            <div>
              <Label htmlFor="evt-desc" className="text-xs text-slate-300">Description</Label>
              <Textarea
                id="evt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 bg-slate-950 border-slate-800 text-sm"
                placeholder="Brief summary of hackathon theme and tracks..."
              />
            </div>
            <div>
              <Label htmlFor="evt-max" className="text-xs text-slate-300">Max Teams Capacity</Label>
              <Input
                id="evt-max"
                type="number"
                value={maxTeams}
                onChange={(e) => setMaxTeams(e.target.value)}
                min={1}
                className="mt-1 bg-slate-950 border-slate-800 text-sm"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scoring Weights Dialog */}
      <Dialog open={weightsModalOpen} onOpenChange={setWeightsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Configure Judging Weights</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Adjust weights for {selectedEvent?.name}. All 6 criteria must sum to exactly 100%.
            </DialogDescription>
          </DialogHeader>

          {weightsError && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{weightsError}</span>
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            {[
              { key: "pitch_technical", label: "Pitch & Interactive Technical Understanding" },
              { key: "presentation", label: "PPT & Presentation Material" },
              { key: "code_implementation", label: "Code & Implementation Evidence" },
              { key: "feasibility", label: "Feasibility & Practicality" },
              { key: "innovation", label: "Innovation" },
              { key: "problem_relevance", label: "Problem Relevance & Impact" },
            ].map((crit) => (
              <div key={crit.key} className="flex items-center justify-between gap-4">
                <span className="text-slate-300 font-medium">{crit.label}:</span>
                <div className="flex items-center gap-1.5 w-24">
                  <Input
                    type="number"
                    step="0.5"
                    value={(weights as any)[crit.key]}
                    onChange={(e) =>
                      setWeights({
                        ...weights,
                        [crit.key]: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 bg-slate-950 border-slate-800 text-right font-mono"
                  />
                  <span className="text-slate-500 font-mono">%</span>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-800 flex justify-between font-semibold text-slate-200">
              <span>Total Sum:</span>
              <span
                className={`font-mono ${
                  Math.abs(
                    Object.values(weights).reduce((a, b) => a + Number(b), 0) - 100
                  ) < 0.01
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {Object.values(weights)
                  .reduce((a, b) => a + Number(b), 0)
                  .toFixed(1)}
                %
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWeightsModalOpen(false)} className="border-slate-800 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleSaveWeights} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Check className="size-4 mr-1.5" />
              Save Weights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Hackathon Event?"
        description={`Are you sure you want to delete "${selectedEvent?.name}"? All associated team sessions and scores will be permanently removed.`}
        confirmLabel="Delete Event"
        onConfirm={handleDeleteEvent}
      />
    </AdminLayout>
  );
}
