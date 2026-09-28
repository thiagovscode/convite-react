import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "neutral" | "green" | "amber" | "blue" | "rose";
}

export function StatCard({ label, value, sub, color = "neutral" }: StatCardProps) {
  const ringClasses: Record<string, string> = {
    neutral: "border-[#E8DFD5]",
    green: "border-emerald-300",
    amber: "border-amber-300",
    blue: "border-sky-300",
    rose: "border-rose-300",
  };

  const valClasses: Record<string, string> = {
    neutral: "text-[#261811]",
    green: "text-emerald-800",
    amber: "text-amber-800",
    blue: "text-sky-800",
    rose: "text-rose-800",
  };

  return (
    <div
      className={`bg-white border ${ringClasses[color]} rounded-[10px] p-4 sm:p-5 flex flex-col gap-1 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.04)]`}
    >
      <span className="text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold">
        {label}
      </span>
      <span className={`text-2xl sm:text-3xl font-serif font-light ${valClasses[color]}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[0.72rem] font-serif text-[#8C7A6B] italic leading-tight">
          {sub}
        </span>
      )}
    </div>
  );
}
