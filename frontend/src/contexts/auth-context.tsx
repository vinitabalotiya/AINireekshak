"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

interface UserProfile {
  id?: number | string;
  username?: string;
  email?: string;
  team_name?: string;
  event_id?: number | string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: "admin" | "team" | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginAdmin: (username: string, password: string) => Promise<void>;
  loginTeam: (team_name: string, access_code: string, event_id?: number) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<"admin" | "team" | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage on mount
    const savedToken = localStorage.getItem("ainireekshak_token");
    const savedRole = localStorage.getItem("ainireekshak_role") as "admin" | "team" | null;
    const savedUser = localStorage.getItem("ainireekshak_user");

    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const loginAdmin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.adminLogin({ username, password });
      setToken(data.access_token);
      setRole("admin");
      const userObj = { id: data.user_id, username: data.username };
      setUser(userObj);

      localStorage.setItem("ainireekshak_token", data.access_token);
      localStorage.setItem("ainireekshak_role", "admin");
      localStorage.setItem("ainireekshak_user", JSON.stringify(userObj));

      router.push("/admin/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loginTeam = async (team_name: string, access_code: string, event_id?: number) => {
    setIsLoading(true);
    try {
      const data = await api.teamLogin({ team_name, access_code, event_id });
      setToken(data.access_token);
      setRole("team");
      const userObj = { id: data.user_id, username: data.username, team_name: data.username };
      setUser(userObj);

      localStorage.setItem("ainireekshak_token", data.access_token);
      localStorage.setItem("ainireekshak_role", "team");
      localStorage.setItem("ainireekshak_user", JSON.stringify(userObj));

      router.push("/team/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setToken(null);
    localStorage.removeItem("ainireekshak_token");
    localStorage.removeItem("ainireekshak_role");
    localStorage.removeItem("ainireekshak_user");
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        isAuthenticated: !!token,
        loginAdmin,
        loginTeam,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
