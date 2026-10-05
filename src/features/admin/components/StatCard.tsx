import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "neutral" | "green" | "amber" | "blue" | "rose";
}

export function StatCard({ label, value, sub, color = "neutral" }: StatCardProps) {
  const valColors: Record<string, string> = {
    neutral: "text-[#1A1816]",
    green: "text-[#2E5A36]",
    amber: "text-[#8A6820]",
    blue: "text-[#1A1816]",
    rose: "text-[#8C382A]",
  };

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-lg p-4 sm:p-5 flex flex-col justify-between gap-2 shadow-xs transition-colors hover:border-[#D0C9BD]">
      <div>
        <span className="text-xs font-sans text-[#6B645C] font-medium block">
          {label}
        </span>
        <span className={`text-2xl sm:text-3xl font-serif font-light tracking-tight ${valColors[color]} block mt-1`}>
          {value}
        </span>
      </div>
      {sub && (
        <span className="text-xs font-serif text-[#8C7355] italic leading-relaxed pt-1 border-t border-[#F3F0EB]">
          {sub}
        </span>
      )}
    </div>
  );
}
