import React from "react";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Estado de loading da tabela — skeleton profissional.
 * Evita exibir tabela vazia enquanto os dados carregam.
 */
export function TableSkeleton({ rows = 8, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse" role="status" aria-label="Carregando dados...">
      {/* Cabeçalho skeleton */}
      <div className="flex gap-3 mb-1 px-4 py-3 border-b border-gray-200 bg-gray-50">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-gray-200 rounded flex-1"
            style={{ maxWidth: i === 0 ? 70 : undefined }}
          />
        ))}
      </div>
      {/* Linhas skeleton */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-3 px-4 py-3 border-b border-gray-100 last:border-0"
          style={{ opacity: Math.max(0.3, 1 - rowIdx * 0.1) }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={`h-4 rounded flex-1 ${colIdx === 0 ? "bg-gray-200 max-w-[70px]" : "bg-gray-100"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
