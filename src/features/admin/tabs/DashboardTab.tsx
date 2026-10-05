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
        <p className="text-xs font-sans text-[#8C7355] font-medium mb-1">
          Visão Geral
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1A1816] font-normal tracking-tight">
          Resumo do Evento
        </h1>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total de Convidados"
          value={fmtNumber(stats.totalPessoas)}
          sub="pessoas na lista geral"
          color="neutral"
        />
        <StatCard
          label="Confirmados"
          value={fmtNumber(stats.totalConfirmados)}
          sub={
            stats.totalFornecedoresConfirmados && stats.totalFornecedoresConfirmados > 0
              ? `presenças garantidas (${stats.totalFornecedoresConfirmados} fornecedores)`
              : "presenças garantidas"
          }
          color="green"
        />
        <StatCard
          label="Não Comparecerão"
          value={fmtNumber(stats.totalRecusaram)}
          sub="recusas registradas"
          color="rose"
        />
        <StatCard
          label="Pendentes"
          value={fmtNumber(stats.totalPendentes)}
          sub="aguardando confirmação"
          color="amber"
        />
      </div>

      {/* Barra de Progresso Trissegmentada */}
      <div className="bg-white border border-[#E8E4DC] rounded-lg p-6 shadow-xs space-y-4">
        <SectionTitle>Taxa de Confirmação &amp; Presença</SectionTitle>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="font-serif text-3xl sm:text-4xl text-[#2E5A36] font-light">
                {pctConfirmados}%
              </span>
              <span className="font-serif text-sm text-[#6B645C] italic pl-2.5">
                confirmados ({stats.totalConfirmados} de {totalCadastrados} pessoas)
              </span>
            </div>
            <span className="font-sans text-xs text-[#6B645C] bg-[#F7F5F0] px-3 py-1.5 rounded-md border border-[#E6E1D8]">
              Adultos: {stats.totalAdultos} · Crianças: {stats.totalCriancasAte6Anos}
            </span>
          </div>

          <div className="h-3 bg-[#EFECE6] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#2E5A36] transition-all duration-700"
              style={{ width: `${pctConfirmados}%` }}
              title={`Confirmados: ${stats.totalConfirmados} (${pctConfirmados}%)`}
            />
            <div
              className="h-full bg-[#8C382A] transition-all duration-700"
              style={{ width: `${pctRecusaram}%` }}
              title={`Não comparecerão: ${stats.totalRecusaram} (${pctRecusaram}%)`}
            />
            <div
              className="h-full bg-[#C9A96E] transition-all duration-700"
              style={{ width: `${pctPendentes}%` }}
              title={`Pendentes: ${stats.totalPendentes} (${pctPendentes}%)`}
            />
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs font-sans text-[#6B645C] pt-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-[#2E5A36] rounded-full" />
              Confirmados: <strong className="text-[#1A1816] font-medium">{stats.totalConfirmados}</strong> ({pctConfirmados}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-[#8C382A] rounded-full" />
              Não vão: <strong className="text-[#1A1816] font-medium">{stats.totalRecusaram}</strong> ({pctRecusaram}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-[#C9A96E] rounded-full" />
              Pendentes: <strong className="text-[#1A1816] font-medium">{stats.totalPendentes}</strong> ({pctPendentes}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
