import React, { useEffect } from "react";
import type { ConviteCadastrado } from "../types";

interface ResetRsvpModalProps {
  convite: ConviteCadastrado | null;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ResetRsvpModal({
  convite,
  loading,
  error,
  onCancel,
  onConfirm,
}: ResetRsvpModalProps) {
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
      aria-labelledby="modal-reset-rsvp-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="bg-[#FAF7F2] border border-[#D8CDC0] rounded-[12px] p-6 sm:p-8 max-w-[500px] w-full shadow-2xl space-y-5 text-[#261811]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 id="modal-reset-rsvp-title" className="font-serif text-xl sm:text-2xl text-[#261811] font-light">
              Resetar RSVP do Convite
            </h3>
            <p className="text-xs font-sans text-[#6B5A4D] mt-1.5 leading-relaxed">
              Deseja resetar o status de resposta da família <strong>{convite.familia}</strong> (#{convite.codigo})?
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E8DFD5] rounded-[8px] space-y-1.5 text-xs font-sans text-[#6B5A4D]">
          <p className="font-semibold text-[#261811] flex items-center gap-1.5">
            <span className="text-amber-800">✦</span> O que acontecerá ao confirmar:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[0.76rem] pl-1">
            <li>O status do convite voltará para <strong>PENDENTE</strong> como um convite novo.</li>
            <li>As presenças individuais de todos os membros serão desmarcadas.</li>
            <li>O registro anterior de RSVP será removido da base de dados.</li>
            <li>O convidado poderá acessar o link e responder novamente.</li>
          </ul>
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
            className="px-4 py-2 border border-[#D8CDC0] text-[#6B5A4D] hover:text-[#261811] text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? "Resetando..." : "Confirmar Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
