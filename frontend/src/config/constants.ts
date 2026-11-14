export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
export const APP_NAME = "AiNireekshak";
export const DEFAULT_SCORING_WEIGHTS = {
  pitch_technical: 60,
  presentation: 15,
  code_implementation: 8,
  feasibility: 7,
  innovation: 5,
  problem_relevance: 5,
};
