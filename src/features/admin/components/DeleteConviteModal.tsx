import React, { useEffect } from "react";
import type { ConviteCadastrado } from "../types";

interface DeleteConviteModalProps {
  convite: ConviteCadastrado | null;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConviteModal({
  convite,
  loading,
  error,
  onCancel,
  onConfirm,
}: DeleteConviteModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel]);

  if (!convite) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-delete-convite-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="bg-[#FAF7F2] border border-[#D8CDC0] rounded-[12px] p-6 sm:p-8 max-w-[500px] w-full shadow-2xl space-y-5 text-[#261811]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 id="modal-delete-convite-title" className="font-serif text-xl sm:text-2xl text-[#261811] font-light">
              Excluir Convite
            </h3>
            <p className="text-xs font-sans text-[#6B5A4D] mt-1">
              Confirma a exclusão definitiva do convite da família <strong>{convite.familia}</strong> (#{convite.codigo})?
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-100 border border-rose-300 rounded text-xs text-rose-950 font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 border border-[#D8CDC0] text-[#6B5A4D] text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer disabled:opacity-50"
          >
            {loading ? "Excluindo..." : "Confirmar Exclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}
