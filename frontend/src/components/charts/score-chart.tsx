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

// Minimalist monochromatic palette with crimson red highlight
const CATEGORY_COLORS = [
  "#dc2626", // crimson red (peak criterion)
  "#ffffff", // pure white
  "#e4e4e7", // zinc-200
  "#a1a1aa", // zinc-400
  "#71717a", // zinc-500
  "#ef4444", // secondary red
];

export function ScoreChart({ categories, title = "Category Score Breakdown (out of 100)" }: ScoreChartProps) {
  const chartData = categories.map((cat) => ({
    name: cat.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: Number(cat.score.toFixed(1)),
    weight: cat.weight ? `${cat.weight}%` : undefined,
  }));

  return (
    <div className="w-full p-5 rounded border border-white/10 bg-zinc-950 font-mono">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
          {title}
        </h4>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#71717a"
              fontSize={10}
              interval={0}
              angle={-20}
              textAnchor="end"
              fontFamily="monospace"
            />
            <YAxis stroke="#71717a" domain={[0, 100]} fontSize={10} fontFamily="monospace" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#000000",
                borderColor: "rgba(255,255,255,0.15)",
                borderRadius: "4px",
                color: "#ffffff",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
              formatter={(value: any) => [`${value}/100`, "Score"]}
            />
            <Bar dataKey="score" radius={[2, 2, 0, 0]}>
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
