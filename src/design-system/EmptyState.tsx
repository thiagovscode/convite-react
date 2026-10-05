import React from "react";
import { Users } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  hasFilter?: boolean;
  onClearFilters?: () => void;
}

/**
 * Estado vazio da tabela.
 * Diferencia "sem dados" de "sem resultados para o filtro atual".
 */
export function EmptyState({
  title = "Nenhum participante encontrado",
  description,
  hasFilter = false,
  onClearFilters,
}: EmptyStateProps) {
  const desc =
    description ??
    (hasFilter
      ? "Nenhum resultado corresponde aos filtros selecionados."
      : "Nenhum participante cadastrado ainda.");

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="status"
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Users className="w-6 h-6 text-gray-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-500 mb-4">{desc}</p>
      {hasFilter && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-violet-700 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 rounded"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
