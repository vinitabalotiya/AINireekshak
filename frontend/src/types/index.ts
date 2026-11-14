// ---- Core Entities ----

export interface Event {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "completed" | "archived";
  start_date: string;
  end_date: string;
  scoring_weights: ScoringWeights;
  created_at: string;
  updated_at: string;
  team_count?: number;
  session_count?: number;
}

export interface ScoringWeights {
  pitch_technical: number;
  presentation: number;
  code_implementation: number;
  feasibility: number;
  innovation: number;
  problem_relevance: number;
}

export interface Team {
  id: string;
  name: string;
  event_id: string;
  event_name?: string;
  access_code: string;
  members: TeamMember[];
  status: "registered" | "active" | "evaluated" | "disqualified";
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Session {
  id: string;
  team_id: string;
  team_name?: string;
  event_id: string;
  event_name?: string;
  status: "scheduled" | "waiting" | "active" | "completed" | "cancelled" | "error";
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  livekit_room?: string;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  team_id: string;
  event_id: string;
  type: "presentation" | "code" | "document" | "github_url";
  filename: string;
  file_url?: string;
  github_url?: string;
  file_size?: number;
  status: "uploaded" | "processing" | "analyzed" | "error";
  analysis_result?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  session_id: string;
  team_id: string;
  team_name?: string;
  event_id: string;
  overall_score: number;
  categories: EvaluationCategory[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  transcript?: string;
  ai_feedback?: string;
  status: "pending" | "in_progress" | "completed" | "error";
  created_at: string;
  updated_at: string;
}

export interface EvaluationCategory {
  name: string;
  key: string;
  score: number;
  max_score: number;
  weight: number;
  weighted_score: number;
  feedback: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "super_admin";
  created_at: string;
}

export interface TeamUser {
  id: string;
  team_id: string;
  team_name: string;
  event_id: string;
  event_name: string;
}

// ---- Dashboard ----

export interface DashboardStats {
  total_events: number;
  total_teams: number;
  total_sessions: number;
  pending_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  recent_sessions: Session[];
  top_teams: RankingEntry[];
  score_distribution: ScoreDistributionItem[];
}

export interface ScoreDistributionItem {
  range: string;
  count: number;
}

export interface RankingEntry {
  rank: number;
  team_id: string;
  team_name: string;
  overall_score: number;
  categories: EvaluationCategory[];
  is_shortlisted: boolean;
  session_id?: string;
  evaluation_id?: string;
}

// ---- Auth ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TeamLoginRequest {
  team_name: string;
  access_code: string;
}

export interface AdminRegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AdminUser | TeamUser;
  role: "admin" | "team";
}

// ---- API Responses ----

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateEventRequest {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  scoring_weights?: ScoringWeights;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: Event["status"];
}

export interface CreateTeamRequest {
  name: string;
  event_id: string;
  members: Omit<TeamMember, "id">[];
}

export interface UpdateTeamRequest extends Partial<CreateTeamRequest> {
  status?: Team["status"];
}

export interface CreateSessionRequest {
  team_id: string;
  event_id: string;
  scheduled_at: string;
}

export interface UpdateSessionStatusRequest {
  status: Session["status"];
}

export interface ShortlistRequest {
  event_id: string;
  top_n: number;
}

export interface ImportTeamsResponse {
  imported: number;
  errors: string[];
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  ai_provider: string;
  livekit_configured: boolean;
}
