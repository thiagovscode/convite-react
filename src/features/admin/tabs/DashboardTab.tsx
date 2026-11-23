import React from "react";
import { StatCard } from "../components/StatCard";
import { SectionTitle } from "../components/SectionTitle";
import { fmtNumber } from "../utils/formatters";
import type { Tab } from "../types";

interface DashboardStats {
  totalConvites: number;
  totalPessoas: number;
  totalConfirmados: number;
  totalRecusaram: number;
  totalPendentes: number;
  totalAdultos: number;
  totalCriancasAte6Anos: number;
  totalFornecedoresConfirmados?: number;
}

interface DashboardTabProps {
  stats: DashboardStats;
  onNavigateTab?: (tab: Tab) => void;
}

export function DashboardTab({ stats, onNavigateTab }: DashboardTabProps) {
  const totalCadastrados = stats.totalPessoas;
  const pctConfirmados =
    totalCadastrados > 0 ? Math.round((stats.totalConfirmados / totalCadastrados) * 100) : 0;
  const pctRecusaram =
    totalCadastrados > 0 ? Math.round((stats.totalRecusaram / totalCadastrados) * 100) : 0;
  const pctPendentes =
    totalCadastrados > 0 ? Math.max(0, 100 - pctConfirmados - pctRecusaram) : 0;

  const totalRespondidos = stats.totalConfirmados + stats.totalRecusaram;
  const pctRespondidos =
    totalCadastrados > 0 ? Math.round((totalRespondidos / totalCadastrados) * 100) : 0;

  return (
    <div className="space-y-7">
      {/* Cabeçalho com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E8DFD5] pb-4">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#6B5A4D] font-semibold mb-1">
            Visão Geral · Noivos &amp; Cerimonial
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
            Resumo Consolidado do Evento
          </h1>
        </div>

        {onNavigateTab && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab("convites")}
              className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.12em] uppercase px-3.5 py-2 rounded-[8px] font-semibold bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] transition-colors cursor-pointer shadow-xs"
            >
              <span>Gerenciar Convites</span>
              <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("rsvp")}
              className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.12em] uppercase px-3.5 py-2 rounded-[8px] font-semibold bg-white hover:bg-[#FAF7F2] border border-[#D8CDC0] text-[#261811] transition-colors cursor-pointer"
            >
              <span>Ver Respostas ({fmtNumber(totalRespondidos)})</span>
            </button>
          </div>
        )}
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Total de Convidados"
          value={fmtNumber(stats.totalPessoas)}
          badge={`${fmtNumber(stats.totalConvites)} convites`}
          sub="pessoas previstas no evento"
          color="blue"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Confirmados"
          value={fmtNumber(stats.totalConfirmados)}
          badge={`${pctConfirmados}%`}
          sub={
            stats.totalFornecedoresConfirmados && stats.totalFornecedoresConfirmados > 0
              ? `presenças confirmadas (incl. ${stats.totalFornecedoresConfirmados} staff)`
              : "presenças confirmadas para o dia"
          }
          color="green"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          label="Não Comparecerão"
          value={fmtNumber(stats.totalRecusaram)}
          badge={`${pctRecusaram}%`}
          sub="pessoas informaram ausência"
          color="rose"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        />
        <StatCard
          label="Pendentes"
          value={fmtNumber(stats.totalPendentes)}
          badge={`${pctPendentes}%`}
          sub="aguardando confirmação no site"
          color="amber"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Painel Analítico: Taxa de Confirmação e Perfil do Buffet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Barra de Progresso Trissegmentada (2 colunas no desktop) */}
        <div className="lg:col-span-2 bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Taxa de Confirmação &amp; Presença</SectionTitle>
            <span className="text-xs font-sans font-medium text-[#6B5A4D] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E8DFD5]">
              {pctRespondidos}% já responderam ({totalRespondidos}/{totalCadastrados})
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2.5">
                <span className="font-serif text-4xl sm:text-5xl text-emerald-800 font-normal leading-none">
                  {pctConfirmados}%
                </span>
                <span className="font-serif text-sm sm:text-base text-[#543D30] italic">
                  de presença confirmada ({stats.totalConfirmados} de {totalCadastrados} pessoas)
                </span>
              </div>
            </div>

            {/* Barra Trissegmentada com Acessibilidade */}
            <div
              className="h-4 bg-[#EAE0D2] rounded-full overflow-hidden flex p-0.5 gap-0.5"
              role="img"
              aria-label={`Progresso de confirmações: ${pctConfirmados}% confirmados, ${pctRecusaram}% não comparecerão, ${pctPendentes}% pendentes`}
            >
              {pctConfirmados > 0 && (
                <div
                  className="h-full bg-emerald-600 first:rounded-l-full last:rounded-r-full transition-all duration-700"
                  style={{ width: `${pctConfirmados}%` }}
                  title={`Confirmados: ${stats.totalConfirmados} (${pctConfirmados}%)`}
                />
              )}
              {pctRecusaram > 0 && (
                <div
                  className="h-full bg-rose-500 first:rounded-l-full last:rounded-r-full transition-all duration-700"
                  style={{ width: `${pctRecusaram}%` }}
                  title={`Não comparecerão: ${stats.totalRecusaram} (${pctRecusaram}%)`}
                />
              )}
              {pctPendentes > 0 && (
                <div
                  className="h-full bg-amber-400/80 first:rounded-l-full last:rounded-r-full transition-all duration-700"
                  style={{ width: `${pctPendentes}%` }}
                  title={`Pendentes: ${stats.totalPendentes} (${pctPendentes}%)`}
                />
              )}
            </div>

            {/* Legenda Clara com Contraste AA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-[8px] bg-emerald-50/60 border border-emerald-200/70 text-xs font-sans">
                <span className="flex items-center gap-1.5 text-emerald-950 font-medium">
                  <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full shrink-0" />
                  Confirmados
                </span>
                <span className="font-semibold text-emerald-950 sm:ml-auto">
                  {stats.totalConfirmados} ({pctConfirmados}%)
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-[8px] bg-rose-50/60 border border-rose-200/70 text-xs font-sans">
                <span className="flex items-center gap-1.5 text-rose-950 font-medium">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0" />
                  Ausências
                </span>
                <span className="font-semibold text-rose-950 sm:ml-auto">
                  {stats.totalRecusaram} ({pctRecusaram}%)
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-[8px] bg-amber-50/60 border border-amber-200/70 text-xs font-sans">
                <span className="flex items-center gap-1.5 text-amber-950 font-medium">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0" />
                  Pendentes
                </span>
                <span className="font-semibold text-amber-950 sm:ml-auto">
                  {stats.totalPendentes} ({pctPendentes}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Composição para o Buffet (Adultos vs Crianças vs Staff) */}
        <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] flex flex-col justify-between space-y-4">
          <SectionTitle>Composição Confirmada</SectionTitle>

          <div className="space-y-3">
            <div className="p-3.5 rounded-[10px] bg-[#FAF7F2] border border-[#E8DFD5] flex items-center justify-between">
              <div>
                <span className="text-[0.65rem] font-sans uppercase tracking-[0.14em] text-[#6B5A4D] font-semibold block">
                  Adultos (≥ 7 anos)
                </span>
                <span className="text-xs font-serif italic text-[#6B5A4D]">
                  Convidados e equipe que permanece
                </span>
              </div>
              <strong className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
                {fmtNumber(stats.totalAdultos)}
              </strong>
            </div>

            <div className="p-3.5 rounded-[10px] bg-[#FAF7F2] border border-[#E8DFD5] flex items-center justify-between">
              <div>
                <span className="text-[0.65rem] font-sans uppercase tracking-[0.14em] text-[#6B5A4D] font-semibold block">
                  Crianças (0 a 6 anos)
                </span>
                <span className="text-xs font-serif italic text-[#6B5A4D]">
                  Isentas ou faixa infantil do buffet
                </span>
              </div>
              <strong className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
                {fmtNumber(stats.totalCriancasAte6Anos)}
              </strong>
            </div>

            {stats.totalFornecedoresConfirmados !== undefined && stats.totalFornecedoresConfirmados > 0 && (
              <div className="p-3 rounded-[10px] bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs font-sans text-amber-950">
                <span>🍽️ Staff / Fornecedores até o fim:</span>
                <strong>{stats.totalFornecedoresConfirmados} incluídos</strong>
              </div>
            )}
          </div>

          <p className="text-[0.72rem] font-serif italic text-[#6B5A4D] border-t border-[#F0EAE0] pt-2.5">
            Valores calculados automaticamente em tempo real conforme as respostas de RSVP.
          </p>
        </div>
      </div>
    </div>
  );
}

