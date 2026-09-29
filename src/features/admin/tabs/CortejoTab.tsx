import React, { useState } from "react";
import type { ParticipanteCerimonia } from "../../../services/convites";
import { checkinParticipanteBackend } from "../../../services/convites";
import { playCheckinSuccessSound } from "../utils/sound";

interface CortejoTabProps {
  participantes: ParticipanteCerimonia[];
  onParticipantesChange: React.Dispatch<React.SetStateAction<ParticipanteCerimonia[]>>;
  onRefreshAuditoria?: () => void;
}

export function CortejoTab({
  participantes,
  onParticipantesChange,
  onRefreshAuditoria,
}: CortejoTabProps) {
  const [filtro, setFiltro] = useState<string>("TODOS");

  const toggleCheckin = async (p: ParticipanteCerimonia) => {
    if (!p.id) return;
    const res = await checkinParticipanteBackend(p.id, !p.presenteCheckin);
    if (res.success && res.participante) {
      playCheckinSuccessSound();
      onParticipantesChange((prev) =>
        prev.map((item) => (item.id === p.id ? res.participante! : item))
      );
      onRefreshAuditoria?.();
    }
  };

  const participantesFiltrados = participantes.filter((p) => {
    const isPresente = Boolean(p.presenteCheckin);
    if (filtro === "PRESENTES") return isPresente;
    if (filtro === "AUSENTES") return !isPresente;
    return true;
  });

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
        <div className="flex gap-2 pb-2 overflow-x-auto">
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

        <div className="divide-y divide-[#EAE0D5]">
          {participantesFiltrados.map((p) => (
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
                className={`px-4 py-2 text-xs font-sans tracking-wider uppercase rounded-[6px] font-semibold cursor-pointer border ${
                  p.presenteCheckin
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : "bg-[#FAF7F2] border-[#D8CDC0] text-[#543D30] hover:bg-[#261811] hover:text-white"
                }`}
              >
                {p.presenteCheckin ? "✓ No Local" : "Registrar Chegada"}
              </button>
            </div>
          ))}

          {!participantesFiltrados.length && (
            <div className="py-8 text-center text-xs font-serif italic text-[#8C7A6B]">
              Nenhum participante encontrado neste filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
