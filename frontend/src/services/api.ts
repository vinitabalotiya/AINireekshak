/**
 * Unified API Client for AiNireekshak FastAPI Backend.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "@/config/constants";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("ainireekshak_token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
          // If unauthenticated on a protected page, clean up token
          const path = window.location.pathname;
          if (path.startsWith("/admin") && path !== "/admin/login") {
            localStorage.removeItem("ainireekshak_token");
            localStorage.removeItem("ainireekshak_role");
            window.location.href = "/admin/login";
          } else if (path.startsWith("/team") && path !== "/team/login") {
            localStorage.removeItem("ainireekshak_token");
            localStorage.removeItem("ainireekshak_role");
            window.location.href = "/team/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // --- Auth ---
  async adminLogin(credentials: { username: string; password: string }) {
    const res = await this.client.post("/api/auth/admin/login", credentials);
    return res.data;
  }

  async adminRegister(payload: { email: string; username: string; password: string }) {
    const res = await this.client.post("/api/auth/admin/register", payload);
    return res.data;
  }

  async teamLogin(credentials: { team_name: string; access_code: string; event_id?: number }) {
    const res = await this.client.post("/api/auth/team/login", credentials);
    return res.data;
  }

  // --- Admin ---
  async getAdminProfile() {
    const res = await this.client.get("/api/admin/me");
    return res.data;
  }

  async getDashboardStats() {
    const res = await this.client.get("/api/admin/dashboard");
    return res.data;
  }

  // --- Events ---
  async getEvents() {
    const res = await this.client.get("/api/events");
    return res.data;
  }

  async getEvent(id: string | number) {
    const res = await this.client.get(`/api/events/${id}`);
    return res.data;
  }

  async createEvent(data: Record<string, unknown>) {
    const res = await this.client.post("/api/events", data);
    return res.data;
  }

  async updateEvent(id: string | number, data: Record<string, unknown>) {
    const res = await this.client.put(`/api/events/${id}`, data);
    return res.data;
  }

  async deleteEvent(id: string | number) {
    const res = await this.client.delete(`/api/events/${id}`);
    return res.data;
  }

  async updateScoringWeights(id: string | number, weights: Record<string, number>) {
    const res = await this.client.put(`/api/events/${id}/scoring-weights`, weights);
    return res.data;
  }

  // --- Teams ---
  async getTeams(eventId?: string | number) {
    const url = eventId ? `/api/teams?event_id=${eventId}` : "/api/teams";
    const res = await this.client.get(url);
    return res.data;
  }

  async getTeam(id: string | number) {
    const res = await this.client.get(`/api/teams/${id}`);
    return res.data;
  }

  async createTeam(data: Record<string, unknown>) {
    const res = await this.client.post("/api/teams", data);
    return res.data;
  }

  async importTeamsCSV(eventId: string | number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await this.client.post(`/api/teams/import?event_id=${eventId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }

  async regenerateAccessCode(id: string | number) {
    const res = await this.client.post(`/api/teams/${id}/regenerate-code`);
    return res.data;
  }

  async deleteTeam(id: string | number) {
    const res = await this.client.delete(`/api/teams/${id}`);
    return res.data;
  }

  // --- Sessions ---
  async getSessions(filters?: { event_id?: number | string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.event_id) params.append("event_id", String(filters.event_id));
    if (filters?.status) params.append("status", filters.status);
    const res = await this.client.get(`/api/sessions?${params.toString()}`);
    return res.data;
  }

  async getSession(id: string | number) {
    const res = await this.client.get(`/api/sessions/${id}`);
    return res.data;
  }

  async createSession(data: { team_id: number; event_id: number; scheduled_start?: string; duration_minutes?: number }) {
    const res = await this.client.post("/api/sessions", data);
    return res.data;
  }

  async updateSessionStatus(id: string | number, status: string) {
    const res = await this.client.put(`/api/sessions/${id}/status`, { status });
    return res.data;
  }

  async getSessionTranscript(id: string | number) {
    const res = await this.client.get(`/api/sessions/${id}/transcript`);
    return res.data;
  }

  // --- Submissions ---
  async uploadSubmission(formData: FormData) {
    const res = await this.client.post("/api/submissions/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }

  async getSubmission(id: string | number) {
    const res = await this.client.get(`/api/submissions/${id}`);
    return res.data;
  }

  async getTeamSubmissions(teamId: string | number) {
    const res = await this.client.get(`/api/submissions/team/${teamId}`);
    return res.data;
  }

  async analyzeSubmission(id: string | number) {
    const res = await this.client.post(`/api/submissions/${id}/analyze`);
    return res.data;
  }

  // --- Evaluations & Rankings ---
  async getEvaluation(id: string | number) {
    const res = await this.client.get(`/api/evaluations/${id}`);
    return res.data;
  }

  async getTeamEvaluations(teamId: string | number) {
    const res = await this.client.get(`/api/evaluations/team/${teamId}`);
    return res.data;
  }

  async generateEvaluation(sessionId: string | number) {
    const res = await this.client.post(`/api/evaluations/generate?session_id=${sessionId}`);
    return res.data;
  }

  async getRankings(eventId: string | number) {
    const res = await this.client.get(`/api/evaluations/rankings/${eventId}`);
    return res.data;
  }

  async shortlistTeams(eventId: string | number, topN: number) {
    const res = await this.client.post(`/api/evaluations/rankings/${eventId}/shortlist?top_n=${topN}`);
    return res.data;
  }

  // --- Reports ---
  getCSVExportUrl(eventId: string | number) {
    return `${API_URL}/api/reports/event/${eventId}/export/csv`;
  }

  getExcelExportUrl(eventId: string | number) {
    return `${API_URL}/api/reports/event/${eventId}/export/excel`;
  }

  // --- Health ---
  async checkHealth() {
    const res = await this.client.get("/api/health");
    return res.data;
  }
}

export const api = new ApiClient();
export default api;
