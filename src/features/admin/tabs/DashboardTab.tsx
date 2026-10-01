import React from "react";
import { StatCard } from "../components/StatCard";
import { SectionTitle } from "../components/SectionTitle";
import { fmtNumber } from "../utils/formatters";

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
}

export function DashboardTab({ stats }: DashboardTabProps) {
  const totalCadastrados = stats.totalPessoas;
  const pctConfirmados =
    totalCadastrados > 0 ? Math.round((stats.totalConfirmados / totalCadastrados) * 100) : 0;
  const pctRecusaram =
    totalCadastrados > 0 ? Math.round((stats.totalRecusaram / totalCadastrados) * 100) : 0;
  const pctPendentes =
    totalCadastrados > 0 ? Math.max(0, 100 - pctConfirmados - pctRecusaram) : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
          Visão Geral
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
          Resumo Consolidado do Evento
        </h1>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Pessoas"
          value={fmtNumber(stats.totalPessoas)}
          sub="pessoas no evento"
          color="blue"
        />
        <StatCard
          label="Total Confirmados"
          value={fmtNumber(stats.totalConfirmados)}
          sub={
            stats.totalFornecedoresConfirmados && stats.totalFornecedoresConfirmados > 0
              ? `presenças confirmadas (incl. ${stats.totalFornecedoresConfirmados} equipe/fornecedores)`
              : "presenças confirmadas"
          }
          color="green"
        />
        <StatCard
          label="Não Comparecerão"
          value={fmtNumber(stats.totalRecusaram)}
          sub="pessoas recusaram"
          color="rose"
        />
        <StatCard
          label="Pendentes"
          value={fmtNumber(stats.totalPendentes)}
          sub="aguardando resposta"
          color="amber"
        />
      </div>

      {/* Barra de Progresso Trissegmentada */}
      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-6 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        <SectionTitle>Taxa de Confirmação &amp; Presença do Evento</SectionTitle>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="font-serif text-4xl text-emerald-800 font-light">
                {pctConfirmados}%
              </span>
              <span className="font-serif text-sm text-[#8C7A6B] italic pl-2">
                confirmados ({stats.totalConfirmados} de {totalCadastrados} pessoas
                {stats.totalFornecedoresConfirmados && stats.totalFornecedoresConfirmados > 0
                  ? ` · incl. ${stats.totalFornecedoresConfirmados} fornecedores até o fim`
                  : ""}
                )
              </span>
            </div>
            <span className="font-serif text-xs text-[#6B5A4D] bg-[#FAF7F2] px-3 py-1.5 rounded-full border border-[#E8DFD5]">
              Adultos: {stats.totalAdultos} · Crianças (≤ 6 anos): {stats.totalCriancasAte6Anos}
            </span>
          </div>

          <div className="h-3.5 bg-[#EAE0D2] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-600 transition-all duration-700"
              style={{ width: `${pctConfirmados}%` }}
              title={`Confirmados: ${stats.totalConfirmados} (${pctConfirmados}%)`}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-700"
              style={{ width: `${pctRecusaram}%` }}
              title={`Não comparecerão: ${stats.totalRecusaram} (${pctRecusaram}%)`}
            />
            <div
              className="h-full bg-amber-400/60 transition-all duration-700"
              style={{ width: `${pctPendentes}%` }}
              title={`Pendentes: ${stats.totalPendentes} (${pctPendentes}%)`}
            />
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs font-sans text-[#8C7A6B] pt-1">
            <span>
              <span className="inline-block w-2.5 h-2.5 bg-emerald-600 rounded-full mr-1.5 align-middle" />
              Confirmados: <strong className="text-[#261811]">{stats.totalConfirmados}</strong> ({pctConfirmados}%)
            </span>
            <span>
              <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full mr-1.5 align-middle" />
              Não vão: <strong className="text-[#261811]">{stats.totalRecusaram}</strong> ({pctRecusaram}%)
            </span>
            <span>
              <span className="inline-block w-2.5 h-2.5 bg-amber-400/60 rounded-full mr-1.5 align-middle" />
              Pendentes: <strong className="text-[#261811]">{stats.totalPendentes}</strong> ({pctPendentes}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
