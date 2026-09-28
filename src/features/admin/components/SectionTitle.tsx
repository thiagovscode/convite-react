import React from "react";

interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-1 h-5 bg-[#261811] rounded-full inline-block" />
      <h2 className="font-serif text-xl sm:text-2xl text-[#261811] font-light tracking-[-0.01em]">
        {children}
      </h2>
    </div>
  );
}
