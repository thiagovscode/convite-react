import React, { useEffect, useMemo, useState } from "react";
import type { ParticipanteCerimonia } from "../../../services/convites";
import { checkinParticipanteBackend } from "../../../services/convites";
import { playCheckinSuccessSound } from "../utils/sound";

interface CortejoTabProps {
  participantes: ParticipanteCerimonia[];
  loading?: boolean;
  error?: string;
  onParticipantesChange: React.Dispatch<React.SetStateAction<ParticipanteCerimonia[]>>;
  onRefreshAuditoria?: () => void;
  onRetry?: () => void;
}

export function CortejoTab({
  participantes,
  loading = false,
  error = "",
  onParticipantesChange,
  onRefreshAuditoria,
  onRetry,
}: CortejoTabProps) {
  const [filtro, setFiltro] = useState<string>("TODOS");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [checkinEmAndamentoId, setCheckinEmAndamentoId] = useState<string | null>(null);
  const [erroCheckin, setErroCheckin] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setBuscaDebounced(busca.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [busca]);

  const toggleCheckin = async (p: ParticipanteCerimonia) => {
    if (!p.id || checkinEmAndamentoId) return;
    setCheckinEmAndamentoId(p.id);
    setErroCheckin("");
    try {
      const res = await checkinParticipanteBackend(p.id, !p.presenteCheckin);
      if (!res.success || !res.participante) {
        setErroCheckin(res.message || "Não foi possível atualizar a chegada. Tente novamente.");
        return;
      }

      playCheckinSuccessSound();
      onParticipantesChange((prev) =>
        prev.map((item) => (item.id === p.id ? res.participante! : item))
      );
      onRefreshAuditoria?.();
    } catch {
      setErroCheckin("Não foi possível atualizar a chegada. Verifique a conexão e tente novamente.");
    } finally {
      setCheckinEmAndamentoId(null);
    }
  };

  const participantesFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase();

    return participantes.filter((p) => {
      const isPresente = Boolean(p.presenteCheckin);
      const atendeFiltro =
        filtro === "TODOS" ? true : filtro === "PRESENTES" ? isPresente : !isPresente;

      if (!atendeFiltro) return false;

      if (!termo) return true;

      const campos = [p.nome, p.papel, p.par ?? ""].filter(Boolean).join(" ").toLowerCase();
      return campos.includes(termo);
    });
  }, [participantes, filtro, buscaDebounced]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
          Cerimônia
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
          Cortejo
        </h1>
      </div>

      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        {(error || erroCheckin) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[8px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
            <span>{erroCheckin || error}</span>
            {error && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="shrink-0 rounded-[6px] border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-60"
              >
                {loading ? "Tentando..." : "Tentar novamente"}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F0EAE0]">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, papel ou par..."
            className="w-full md:max-w-sm bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
          />

          <div className="flex gap-2 overflow-x-auto">
            {["TODOS", "PRESENTES", "AUSENTES"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`text-[0.68rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold cursor-pointer ${
                  filtro === f
                    ? "bg-[#261811] text-[#FAF7F2]"
                    : "bg-[#FAF7F2] border border-[#D8CDC0] text-[#6B5A4D]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#EAE0D5]">
        {loading && participantes.length === 0 && (
          <div className="space-y-3 py-4" aria-label="Carregando participantes do cortejo">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded bg-[#F4EFE8]" />
            ))}
          </div>
        )}

        {!loading && !error && participantesFiltrados.map((p) => (
          <div key={p.id || p.nome} className="py-4 flex items-center justify-between gap-3">
              <div>
                <strong className="font-serif text-base text-[#261811] block leading-tight">
                  {p.nome}
                </strong>
                <span className="text-xs font-sans text-[#8C7A6B]">
                  {p.papel} {p.par ? `· Par: ${p.par}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleCheckin(p)}
                disabled={checkinEmAndamentoId !== null}
                aria-pressed={Boolean(p.presenteCheckin)}
                className={`px-4 py-2 text-xs font-sans tracking-wider uppercase rounded-[6px] font-semibold cursor-pointer border ${
                  p.presenteCheckin
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : "bg-[#FAF7F2] border-[#D8CDC0] text-[#543D30] hover:bg-[#261811] hover:text-white"
                }`}
              >
                {checkinEmAndamentoId === p.id
                  ? "Salvando..."
                  : p.presenteCheckin ? "No Local" : "Registrar Chegada"}
              </button>
            </div>
          ))}

          {!loading && !error && !participantesFiltrados.length && (
            <div className="py-8 text-center text-xs font-serif italic text-[#8C7A6B]">
              Nenhum participante encontrado neste filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
