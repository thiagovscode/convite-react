import React, { useState } from "react";
import type { RelatorioAuditoria } from "../../../services/convites";

interface AuditoriaTabProps {
  relatorio: RelatorioAuditoria | null;
  loading: boolean;
}

export function AuditoriaTab({ relatorio }: AuditoriaTabProps) {
  const [copiado, setCopiado] = useState(false);

  const handleExportarWhatsApp = () => {
    const msg = `*RELATÓRIO OFICIAL DE AUDITORIA - BUFFET*\nCasamento Tainara & Thiago · 24.01.2027\n\n- Adultos Presentes: ${
      relatorio?.totalAdultosPresentes ?? 0
    }\n- Crianças (0-6 anos): ${relatorio?.totalCriancasPresentes ?? 0}\n- Total no Salão: ${
      relatorio?.totalPresentesReais ?? 0
    } pessoas\n\nEmitido em: ${new Date().toLocaleTimeString("pt-BR")}`;

    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
          Auditoria em Tempo Real
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
          Contagem Oficial para o Buffet
        </h1>
      </div>

      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-[#FAF7F2] rounded-[8px] border border-[#E8DFD5]">
            <span className="text-[0.65rem] font-sans uppercase tracking-wider text-[#8C7A6B] block">
              Total Presentes
            </span>
            <strong className="font-serif text-3xl text-[#261811] block mt-1">
              {relatorio?.totalPresentesReais ?? 0}
            </strong>
          </div>

          <div className="p-4 bg-emerald-50 rounded-[8px] border border-emerald-200">
            <span className="text-[0.65rem] font-sans uppercase tracking-wider text-emerald-800 block">
              Adultos Presentes
            </span>
            <strong className="font-serif text-3xl text-emerald-950 block mt-1">
              {relatorio?.totalAdultosPresentes ?? 0}
            </strong>
          </div>

          <div className="p-4 bg-amber-50 rounded-[8px] border border-amber-200">
            <span className="text-[0.65rem] font-sans uppercase tracking-wider text-amber-800 block">
              Crianças (≤ 6 anos)
            </span>
            <strong className="font-serif text-3xl text-amber-950 block mt-1">
              {relatorio?.totalCriancasPresentes ?? 0}
            </strong>
          </div>
        </div>

        <div className="p-4 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[8px] space-y-3">
          <strong className="font-serif text-base text-[#261811] block">
            Exportar Relatório para o Buffet
          </strong>
          <p className="font-serif italic text-xs text-[#6B5A4D]">
            Envie os números consolidados de convidados presentes direto para o maitre do buffet via
            WhatsApp:
          </p>
          <button
            type="button"
            onClick={handleExportarWhatsApp}
            className="px-5 py-3 bg-[#1E6B37] hover:bg-[#16532A] text-white text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer"
          >
            {copiado ? "✓ Relatório Copiado e Aberto no WhatsApp" : "Enviar Relatório via WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}
