import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "neutral" | "green" | "amber" | "blue" | "rose";
  icon?: React.ReactNode;
  badge?: string;
}

export function StatCard({ label, value, sub, color = "neutral", icon, badge }: StatCardProps) {
  const borderClasses: Record<string, string> = {
    neutral: "border-[#E8DFD5] hover:border-[#D8CDC0]",
    green: "border-emerald-200/90 hover:border-emerald-300",
    amber: "border-amber-200/90 hover:border-amber-300",
    blue: "border-[#E0D6CA] hover:border-[#C8B9A6]",
    rose: "border-rose-200/90 hover:border-rose-300",
  };

  const accentBarClasses: Record<string, string> = {
    neutral: "bg-[#8C7A6B]",
    green: "bg-emerald-600",
    amber: "bg-amber-500",
    blue: "bg-[#261811]",
    rose: "bg-rose-500",
  };

  const valClasses: Record<string, string> = {
    neutral: "text-[#261811]",
    green: "text-emerald-900",
    amber: "text-amber-900",
    blue: "text-[#261811]",
    rose: "text-rose-900",
  };

  const iconBgClasses: Record<string, string> = {
    neutral: "bg-[#FAF7F2] text-[#6B5A4D] border-[#E8DFD5]",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    amber: "bg-amber-50 text-amber-700 border-amber-200/70",
    blue: "bg-[#FAF7F2] text-[#261811] border-[#E5DCD0]",
    rose: "bg-rose-50 text-rose-700 border-rose-200/70",
  };

  return (
    <div
      className={`relative overflow-hidden bg-white border ${borderClasses[color]} rounded-[14px] p-4 sm:p-5 flex flex-col justify-between gap-2.5 shadow-[0_2px_16px_-4px_rgba(38,24,17,0.05)] transition-all duration-200`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentBarClasses[color]} opacity-80`} />

      <div className="flex items-start justify-between gap-2 pt-0.5">
        <span className="text-[0.65rem] font-sans tracking-[0.16em] uppercase text-[#6B5A4D] font-semibold leading-snug">
          {label}
        </span>
        {icon && (
          <span
            className={`w-8 h-8 rounded-[8px] border flex items-center justify-center shrink-0 ${iconBgClasses[color]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl sm:text-4xl font-serif font-normal tracking-tight leading-none ${valClasses[color]}`}>
          {value}
        </span>
        {badge && (
          <span className="text-[0.65rem] font-sans font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#6B5A4D] border border-[#E8DFD5]">
            {badge}
          </span>
        )}
      </div>

      {sub && (
        <span className="text-xs font-serif text-[#6B5A4D] italic leading-snug">
          {sub}
        </span>
      )}
    </div>
  );
}

