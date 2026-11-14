"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CategoryScoreItem {
  name: string;
  score: number;
  weight?: number;
}

interface ScoreChartProps {
  categories: CategoryScoreItem[];
  title?: string;
}

const CATEGORY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
];

export function ScoreChart({ categories, title = "Category Score Breakdown (out of 100)" }: ScoreChartProps) {
  const chartData = categories.map((cat) => ({
    name: cat.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: Number(cat.score.toFixed(1)),
    weight: cat.weight ? `${cat.weight}%` : undefined,
  }));

  return (
    <div className="w-full p-4 rounded-xl border border-slate-800 bg-slate-900/40">
      {title && <h4 className="text-sm font-semibold text-slate-200 mb-4">{title}</h4>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
              formatter={(value: any) => [`${value}/100`, "Score"]}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
