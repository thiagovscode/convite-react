import React, { useEffect, useState } from "react";
import type { ConfiguracaoEventoInfo } from "../../../services/api";

interface ConfigurarPrazoModalProps {
  isOpen: boolean;
  configAtual: ConfiguracaoEventoInfo | null;
  loading: boolean;
  error: string;
  sucesso: string;
  onClose: () => void;
  onSalvar: (prazoIso: string) => Promise<void>;
}

export function ConfigurarPrazoModal({
  isOpen,
  configAtual,
  loading,
  error,
  sucesso,
  onClose,
  onSalvar,
}: ConfigurarPrazoModalProps) {
  const [dataHoraInput, setDataHoraInput] = useState("");

  useEffect(() => {
    if (configAtual?.prazoRsvp) {
      const d = new Date(configAtual.prazoRsvp);
      if (!isNaN(d.getTime())) {
        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDataHoraInput(isoLocal);
      }
    } else {
      setDataHoraInput("");
    }
  }, [configAtual, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataHoraInput) return;
    const dataIso = new Date(dataHoraInput).toISOString().slice(0, 19);
    onSalvar(dataIso);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-config-prazo-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-[#FAF7F2] border border-[#D8CDC0] rounded-[12px] p-6 sm:p-8 max-w-[500px] w-full shadow-2xl space-y-5 text-[#261811]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EAE0D5] border border-[#D8CDC0] flex items-center justify-center text-[#261811] shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 id="modal-config-prazo-title" className="font-serif text-xl sm:text-2xl text-[#261811] font-light">
              Prazo Limite de Confirmação (RSVP)
            </h3>
            <p className="text-xs font-sans text-[#6B5A4D] mt-1.5 leading-relaxed">
              Defina a data e horário limite para os convidados responderem à presença no site.
            </p>
          </div>
        </div>

        {configAtual?.prazoRsvpFormatado && (
          <div className="p-3 bg-white border border-[#E8DFD5] rounded-[8px] flex items-center justify-between text-xs font-sans">
            <span className="text-[#8C7A6B]">Prazo atual cadastrado:</span>
            <span className="font-semibold text-[#261811]">
              {configAtual.prazoRsvpFormatado}
              {configAtual.expirado && (
                <span className="ml-2 text-[0.62rem] text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold uppercase">
                  Expirado
                </span>
              )}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="input-prazo-rsvp" className="block text-xs font-sans font-semibold uppercase tracking-wider text-[#543D30]">
              Nova Data e Horário Limite:
            </label>
            <input
              id="input-prazo-rsvp"
              type="datetime-local"
              required
              value={dataHoraInput}
              onChange={(e) => setDataHoraInput(e.target.value)}
              className="w-full bg-white border border-[#D8CDC0] px-3.5 py-2.5 text-xs font-sans text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
            />
            <p className="text-[0.72rem] font-serif italic text-[#8C7A6B]">
              Após este horário, o formulário público exibirá que o prazo foi encerrado e não aceitará novas respostas.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded text-xs text-rose-950 font-medium">
              {error}
            </div>
          )}

          {sucesso && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-950 font-medium">
              {sucesso}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 border border-[#D8CDC0] text-[#6B5A4D] hover:text-[#261811] text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !dataHoraInput}
              className="px-5 py-2 bg-[#261811] hover:bg-black text-[#FAF7F2] text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? "Salvando..." : "Salvar Prazo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
