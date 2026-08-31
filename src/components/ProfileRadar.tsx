"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export function ProfileRadar({
  calc,
  insight,
  proof,
}: {
  calc: number;
  insight: number;
  proof: number;
}) {
  const data = [
    { axis: "計算力", value: calc },
    { axis: "発想力", value: insight },
    { axis: "論証力", value: proof },
  ];
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#d1d5db", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="#A855F7"
            fill="#CCFF00"
            fillOpacity={0.28}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
