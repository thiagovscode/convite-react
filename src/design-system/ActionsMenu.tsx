import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface ActionsMenuProps {
  actions: ActionItem[];
  label?: string;
}

/**
 * Menu de ações secundárias agrupadas.
 * Evita exibir 6+ botões visíveis simultaneamente no card/linha.
 */
export function ActionsMenu({ actions, label = "Mais ações" }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fecha com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg py-1"
          role="menu"
          aria-label={label}
        >
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              disabled={action.disabled}
              role="menuitem"
              className={[
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                action.variant === "danger"
                  ? "text-red-600 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-50",
                action.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              {action.icon && (
                <span className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
