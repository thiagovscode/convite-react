import React, { useEffect, useMemo, useState } from "react";
import type { ParticipanteCerimonia } from "../../../services/convites";
import { checkinParticipanteBackend } from "../../../services/convites";
import { playCheckinSuccessSound, triggerHaptic } from "../utils/sound";

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
  const [filtro, setFiltro] = useState<"TODOS" | "PRESENTES" | "AUSENTES">("TODOS");
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
      triggerHaptic();
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

  const contadores = useMemo(() => {
    const presentes = participantes.filter((p) => Boolean(p.presenteCheckin)).length;
    const ausentes = participantes.length - presentes;
    return {
      todos: participantes.length,
      presentes,
      ausentes,
    };
  }, [participantes]);

  const participantesFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase();

    return participantes.filter((p) => {
      const isPresente = Boolean(p.presenteCheckin);
      if (filtro === "PRESENTES" && !isPresente) return false;
      if (filtro === "AUSENTES" && isPresente) return false;

      if (!termo) return true;

      const campos = [p.nome, p.papel, p.par ?? ""].filter(Boolean).join(" ").toLowerCase();
      return campos.includes(termo);
    });
  }, [participantes, filtro, buscaDebounced]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E8DFD5] pb-4">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#6B5A4D] font-semibold mb-1">
            Cerimônia &amp; Entrada
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
            Controle do Cortejo de Honra
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
            ✓ {contadores.presentes} no local
          </span>
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
            ⏳ {contadores.ausentes} aguardando
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        {(error || erroCheckin) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[8px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
            <span>{erroCheckin || error}</span>
            {error && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="shrink-0 rounded-[6px] border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Tentando..." : "Tentar novamente"}
              </button>
            )}
          </div>
        )}

        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE0D5]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar integrante por nome, papel ou par..."
              aria-label="Buscar integrante do cortejo"
              className="w-full bg-[#FAF7F2] focus:bg-white border border-[#D8CDC0] pl-3.5 pr-9 py-2.5 text-xs font-sans text-[#261811] rounded-[8px] focus:outline-none focus:border-[#261811] transition-colors min-h-[40px]"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B5A4D] hover:text-[#261811] text-xs font-bold p-1 cursor-pointer"
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {(
              [
                { id: "TODOS", label: `Todos (${contadores.todos})` },
                { id: "PRESENTES", label: `No Local (${contadores.presentes})` },
                { id: "AUSENTES", label: `Aguardando (${contadores.ausentes})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`text-[0.68rem] font-sans tracking-wider uppercase px-3 py-2 rounded-[8px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  filtro === f.id
                    ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                    : "bg-[#FAF7F2] border border-[#D8CDC0] text-[#543D30] hover:border-[#261811]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Participantes do Cortejo */}
        <div className="divide-y divide-[#EAE0D5]">
          {loading && participantes.length === 0 && (
            <div className="space-y-3 py-4" aria-label="Carregando participantes do cortejo">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded bg-[#F4EFE8]" />
              ))}
            </div>
          )}

          {!loading && !error && participantesFiltrados.map((p) => {
            const isLoading = checkinEmAndamentoId === p.id;
            return (
              <div
                key={p.id || p.nome}
                className={`py-4 px-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[8px] transition-colors ${
                  p.presenteCheckin ? "bg-emerald-50/40" : "hover:bg-[#FAF7F2]/60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="font-serif text-base sm:text-lg text-[#261811] font-medium leading-tight">
                      {p.nome}
                    </strong>
                    <span className="text-[0.62rem] font-sans uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#261811] text-[#FAF7F2]">
                      {p.papel}
                    </span>
                    {p.criancaAte6Anos && (
                      <span className="text-[0.62rem] font-sans font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        Criança (0-6a)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-sans text-[#543D30] flex-wrap">
                    {p.par ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50/80 text-amber-950 border border-amber-200 px-2 py-0.5 rounded text-[0.7rem]">
                        <span>✨ Par no Cortejo:</span>
                        <strong>{p.par}</strong>
                      </span>
                    ) : (
                      <span className="text-[0.7rem] text-[#6B5A4D] italic">
                        Entrada individual (sem par vinculado)
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={checkinEmAndamentoId !== null}
                  aria-pressed={Boolean(p.presenteCheckin)}
                  onClick={() => toggleCheckin(p)}
                  className={`self-start sm:self-auto px-4 py-2.5 text-xs font-sans tracking-wider uppercase rounded-[8px] font-semibold cursor-pointer border transition-all min-h-[40px] shrink-0 ${
                    p.presenteCheckin
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800 shadow-xs"
                      : "bg-[#FAF7F2] border-[#D8CDC0] text-[#261811] hover:bg-[#261811] hover:text-white"
                  }`}
                >
                  {isLoading
                    ? "Salvando..."
                    : p.presenteCheckin
                    ? "✓ No Local (Desfazer)"
                    : "Registrar Chegada"}
                </button>
              </div>
            );
          })}

          {!loading && !error && !participantesFiltrados.length && (
            <div className="py-10 text-center space-y-2">
              <p className="font-serif text-base text-[#261811]">
                Nenhum integrante do cortejo encontrado
              </p>
              <p className="text-xs font-sans text-[#6B5A4D]">
                Verifique o filtro selecionado ou pesquise por outro nome.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

