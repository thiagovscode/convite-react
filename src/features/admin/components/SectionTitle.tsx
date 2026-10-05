import React from "react";

interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#EAE6DF]">
      <h2 className="font-serif text-lg sm:text-xl text-[#1A1816] font-normal tracking-tight">
        {children}
      </h2>
    </div>
  );
}
