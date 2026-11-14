"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Upload,
  Key,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  AlertCircle,
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

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ teamName: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [member1Name, setMember1Name] = useState("");
  const [member1Email, setMember1Email] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, eventsData] = await Promise.all([
        api.getTeams(selectedEventId ? Number(selectedEventId) : undefined),
        api.getEvents(),
      ]);
      setTeams(teamsData.items || teamsData);
      setEvents(eventsData);
      if (!selectedEventId && eventsData.length > 0) {
        setSelectedEventId(String(eventsData[0].id));
      }
    } catch (err) {
      console.error("Failed to load teams or events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert("Please select or create an event first.");
      return;
    }

    try {
      const res = await api.createTeam({
        event_id: Number(selectedEventId),
        name: teamName,
        project_name: projectName,
        members: member1Name ? [{ name: member1Name, email: member1Email || undefined, role: "Lead" }] : [],
      });

      setCreateModalOpen(false);
      setTeamName("");
      setProjectName("");
      setMember1Name("");
      setMember1Email("");

      // Show plain access code modal (only shown once!)
      setGeneratedCode({
        teamName: res.team.name,
        code: res.access_code,
      });
      setCodeModalOpen(true);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create team");
    }
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedEventId) return;

    try {
      await api.importTeamsCSV(selectedEventId, importFile);
      setImportModalOpen(false);
      setImportFile(null);
      loadData();
      alert("Teams successfully imported from CSV!");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to import CSV file");
    }
  };

  const handleRegenerateCode = async (teamId: number, teamName: string) => {
    try {
      const res = await api.regenerateAccessCode(teamId);
      setGeneratedCode({
        teamName,
        code: res.access_code,
      });
      setCodeModalOpen(true);
    } catch (err: any) {
      alert("Failed to regenerate code: " + (err?.response?.data?.detail || err.message));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTeams = teams.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Team Management</h1>
            <p className="text-xs text-slate-400 mt-1">
              Issue secret team login codes, track member rosters, and import bulk participants.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportModalOpen(true)}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
            >
              <Upload className="size-3.5 mr-1.5 text-indigo-400" />
              Import CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              <Plus className="size-3.5 mr-1.5" />
              Add Team
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team or project name..."
              className="pl-9 bg-slate-900/60 border-slate-800 text-xs h-9"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900/60 border border-slate-800 text-xs text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">All Events</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teams Table */}
        {loading ? (
          <LoadingSpinner message="Loading Teams..." />
        ) : filteredTeams.length === 0 ? (
          <EmptyState
            title="No Teams Found"
            description="Create a team or import a CSV roster to begin judging."
            actionLabel="Add Team"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3 px-4 font-medium">Team Name</th>
                    <th className="py-3 px-4 font-medium">Project Name</th>
                    <th className="py-3 px-4 font-medium">Event</th>
                    <th className="py-3 px-4 font-medium">Members</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Access Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTeams.map((team) => (
                    <tr key={team.id} className="text-slate-300 hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-100">{team.name}</td>
                      <td className="py-3 px-4 text-slate-400">{team.project_name || "—"}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">Event #{team.event_id}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {team.members_count || team.members?.length || 1} member(s)
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={team.is_active ? "active" : "draft"} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRegenerateCode(team.id, team.name)}
                          className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 font-medium"
                        >
                          <Key className="size-3 mr-1" />
                          Regenerate Code
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

      {/* Create Team Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Register Participating Team</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              A cryptographically secure secret code will be generated for the team to access their portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs text-slate-300">Hackathon Event</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                required
                className="w-full mt-1 h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Team Name</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="mt-1 bg-slate-950 border-slate-800 text-sm"
                placeholder="e.g. Team BharatAI"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Project Name (Optional)</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-1 bg-slate-950 border-slate-800 text-sm"
                placeholder="e.g. Multilingual Voice Assistant"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs text-slate-300">Lead Member Name</Label>
                <Input
                  value={member1Name}
                  onChange={(e) => setMember1Name(e.target.value)}
                  className="mt-1 bg-slate-950 border-slate-800 text-sm"
                  placeholder="Lead full name"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Lead Email</Label>
                <Input
                  value={member1Email}
                  onChange={(e) => setMember1Email(e.target.value)}
                  type="email"
                  className="mt-1 bg-slate-950 border-slate-800 text-sm"
                  placeholder="lead@domain.com"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                Generate Team & Secret Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Secret Access Code Modal (Shown Once) */}
      <Dialog open={codeModalOpen} onOpenChange={setCodeModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Key className="size-5" />
              Team Secret Access Code
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Provide this confidential access code to team <strong>{generatedCode?.teamName}</strong>. For security, only the salted hash is preserved in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <span className="font-mono text-base font-bold text-amber-300 tracking-wider">
              {generatedCode?.code}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatedCode && copyToClipboard(generatedCode.code)}
              className="h-8 border-slate-700 bg-slate-900 text-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 mr-1 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setCodeModalOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white">
              Done & Secured
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Import Teams from CSV</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Upload a CSV file containing columns: <code>team_name, project_name, member1_name, member1_email...</code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImportCSV} className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-300">Target Hackathon Event</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                required
                className="w-full mt-1 h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-300">CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                required
                className="mt-1 bg-slate-950 border-slate-800 text-xs file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Import & Generate Codes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
