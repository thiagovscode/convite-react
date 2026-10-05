import React from "react";
import { TYPE_STYLES, TYPE_LABELS } from "./tokens";

interface TypeBadgeProps {
  type: string;
  className?: string;
}

/**
 * Badge de tipo de participante.
 * Aceita: CONVIDADO | FORNECEDOR
 */
export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const key = type?.toUpperCase();
  const style = TYPE_STYLES[key] ?? "bg-gray-100 text-gray-700 border border-gray-200";
  const label = TYPE_LABELS[key] ?? type;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase ${style} ${className}`}
      aria-label={`Tipo: ${label}`}
    >
      {label}
    </span>
  );
}
