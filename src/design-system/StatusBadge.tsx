import React from "react";
import { STATUS_STYLES, STATUS_LABELS } from "./tokens";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Badge semântico de status de participante.
 * Aceita: CONFIRMADO | RECUSADO | PENDENTE | PRESENTE | AUSENTE
 */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = status?.toUpperCase();
  const style = STATUS_STYLES[key] ?? "bg-gray-50 text-gray-500 border border-gray-200";
  const label = STATUS_LABELS[key] ?? status;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style} ${className}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
