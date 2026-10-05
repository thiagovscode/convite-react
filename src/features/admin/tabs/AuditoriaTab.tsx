import React, { useState, useMemo, useEffect } from "react";
import type { RelatorioAuditoria, FornecedorCasamento } from "../../../services/convites";

interface AuditoriaTabProps {
  relatorio: RelatorioAuditoria | null;
  fornecedores?: FornecedorCasamento[];
  loading: boolean;
  onRefresh?: () => void;
}

interface ConvidadoBuffet {
  id: string;
  nome: string;
  familia: string;
  codigoConvite: string;
  criancaAte6Anos: boolean;
  papel?: string;
  vinculo?: string;
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  dataHoraCheckin?: string;
  recepcionista?: string;
  isFornecedor?: boolean;
}

export function AuditoriaTab({ relatorio, fornecedores, loading, onRefresh }: AuditoriaTabProps) {
  const [copiado, setCopiado] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [filtroPresenca, setFiltroPresenca] = useState<"TODOS" | "PRESENTES" | "AUSENTES">("TODOS");
  const [filtroIdade, setFiltroIdade] = useState<"TODOS" | "ADULTOS" | "CRIANCAS">("TODOS");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setBuscaDebounced(busca.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [busca]);

  const handleExportarWhatsApp = () => {
    const msg = `*RELATÓRIO OFICIAL DE AUDITORIA - BUFFET*\nCasamento Tainara & Thiago · 24.01.2027\n\n- Adultos Presentes: ${
      relatorio?.totalAdultosPresentes ?? 0
    }\n- Crianças (0-6 anos): ${relatorio?.totalCriancasPresentes ?? 0}\n- Total no Salão: ${
      relatorio?.totalPresentesReais ?? 0
    } pessoas\n\nEmitido em: ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Mapeia todas as pessoas das famílias retornadas pela API da portaria/auditoria
  // E também inclui membros de fornecedores com permaneceAteFim = true (que almoçam/jantam no buffet)
  const listaConvidados = useMemo<ConvidadoBuffet[]>(() => {
    const list: ConvidadoBuffet[] = [];

    if (relatorio?.familias) {
      for (const fam of relatorio.familias) {
        if (fam.membros && fam.membros.length > 0) {
          for (const m of fam.membros) {
            list.push({
              id: m.id || `${fam.codigo}-${m.nome}`,
              nome: m.nome,
              familia: fam.familia,
              codigoConvite: fam.codigo,
              criancaAte6Anos: Boolean(m.criancaAte6Anos),
              papel: m.papel || fam.papel,
              vinculo: m.vinculo || fam.vinculo,
              confirmadoRsvp: m.confirmadoRsvp,
              presenteCheckin: m.presenteCheckin,
              dataHoraCheckin: m.dataHoraCheckin,
              recepcionista: m.recepcionista,
              isFornecedor: false,
            });
          }
        }
      }
    }

    if (Array.isArray(fornecedores)) {
      for (const f of fornecedores) {
        if (f.equipe && Array.isArray(f.equipe)) {
          for (const m of f.equipe) {
            // Apenas membros de fornecedores que permanecem até o fim contam no buffet
            if (m.permaneceAteFim) {
              list.push({
                id: `forn-${f.id || f.empresa}-${m.id}`,
                nome: m.nome,
                familia: f.empresa || "Fornecedor",
                codigoConvite: `FORN-${(f.id ? f.id.slice(-6) : (f.empresa || "STAFF").slice(0, 6)).toUpperCase()}`,
                criancaAte6Anos: false,
                papel: m.funcao ? `Staff (${m.funcao})` : "Staff / Fornecedor",
                vinculo: "Fornecedor (Buffet)",
                confirmadoRsvp: true,
                presenteCheckin: Boolean(m.presente),
                dataHoraCheckin: m.dataHoraEntrada,
                recepcionista: "Portaria",
                isFornecedor: true,
              });
            }
          }
        }
      }
    }

    return list;
  }, [relatorio, fornecedores]);

  // Aplica filtros operacionais de presença, idade e busca por termo
  const convidadosFiltrados = useMemo(() => {
    return listaConvidados.filter((c) => {
      // Filtro de presença
      if (filtroPresenca === "PRESENTES" && !c.presenteCheckin) return false;
      if (filtroPresenca === "AUSENTES" && c.presenteCheckin) return false;

      // Filtro de categoria de buffet (adulto vs criança)
      if (filtroIdade === "ADULTOS" && c.criancaAte6Anos) return false;
      if (filtroIdade === "CRIANCAS" && !c.criancaAte6Anos) return false;

      // Busca textual
      if (buscaDebounced) {
        const termo = buscaDebounced.toLowerCase();
        return (
          c.nome.toLowerCase().includes(termo) ||
          c.familia.toLowerCase().includes(termo) ||
          c.codigoConvite.toLowerCase().includes(termo)
        );
      }

      return true;
    });
  }, [listaConvidados, filtroPresenca, filtroIdade, buscaDebounced]);

  const formatarHora = (dataIso?: string) => {
    if (!dataIso) return "";
    try {
      // Se vier formato ISO local sem fuso (ex: "2026-10-05T19:30:00" ou com millis)
      // Extrair diretamente as horas e minutos gravados pelo servidor brasileiro
      const match = dataIso.match(/[T ](\d{2}):(\d{2})/);
      if (match && !dataIso.endsWith("Z")) {
        return `${match[1]}:${match[2]}`;
      }
      const d = new Date(dataIso);
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
            Recepção &amp; Operação
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
            Contagem Oficial para o Buffet
          </h1>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#F2ECE3] border border-[#D8CDC0] hover:border-[#8C7A6B] text-[#261811] rounded-[6px] text-xs font-sans tracking-wider uppercase font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 text-[#8C7A6B] ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? "Atualizando..." : "Atualizar Presenças"}</span>
          </button>
        )}
      </div>

      {/* Cards de Resumo Consolidado para o Buffet */}
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

        {/* Exportação para o Buffet */}
        <div className="p-4 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[8px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <strong className="font-serif text-sm sm:text-base text-[#261811] block">
              Exportar Relatório para o Buffet
            </strong>
            <p className="font-serif italic text-xs text-[#6B5A4D]">
              Envie a contagem oficial consolidada direto para o buffet via WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportarWhatsApp}
            className="self-start sm:self-auto px-4 py-2.5 bg-[#1E6B37] hover:bg-[#16532A] text-white text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] transition-colors cursor-pointer shrink-0"
          >
            {copiado ? "Relatório Copiado" : "Enviar via WhatsApp"}
          </button>
        </div>
      </div>

      {/* Lista Operacional de Convidados para o Buffet */}
      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-[#E8DFD5]">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-[#261811] font-light">
              Lista de Convidados do Buffet
            </h2>
            <p className="font-serif italic text-xs text-[#786455]">
              Sincronizada em tempo real com as entradas registradas pela portaria.
            </p>
          </div>

          <span className="text-xs font-serif text-[#8C7A6B]">
            Exibindo <strong>{convidadosFiltrados.length}</strong> de{" "}
            <strong>{listaConvidados.length}</strong> convidados
          </span>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Input de Busca */}
            <div className="relative flex-1">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome do convidado ou família..."
                className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-[#261811] font-serif text-sm rounded-[6px] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#261811]"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8C7A6B] hover:text-[#261811] font-bold cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Filtro de Presença */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "TODOS", label: "Todos" },
                  { id: "PRESENTES", label: "Presentes" },
                  { id: "AUSENTES", label: "Não Chegaram" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroPresenca(f.id)}
                  className={`text-[0.68rem] font-sans tracking-wider uppercase px-3 py-2 rounded-[6px] font-semibold transition-colors cursor-pointer shrink-0 ${
                    filtroPresenca === f.id
                      ? "bg-[#261811] text-[#FAF7F2]"
                      : "bg-[#FAF7F2] border border-[#D8CDC0] text-[#6B5A4D] hover:bg-[#F2ECE3]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filtro de Categoria de Idade */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "TODOS", label: "Todas Idades" },
                  { id: "ADULTOS", label: "Adultos" },
                  { id: "CRIANCAS", label: "Crianças" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroIdade(f.id)}
                  className={`text-[0.68rem] font-sans tracking-wider uppercase px-3 py-2 rounded-[6px] font-semibold transition-colors cursor-pointer shrink-0 ${
                    filtroIdade === f.id
                      ? "bg-[#8A6A4E] text-white"
                      : "bg-[#FAF7F2] border border-[#D8CDC0] text-[#6B5A4D] hover:bg-[#F2ECE3]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Convidados */}
        {loading ? (
          <div className="py-12 text-center text-[#8C7A6B] font-serif text-sm">
            Carregando lista de convidados do buffet...
          </div>
        ) : convidadosFiltrados.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#D8CDC0] rounded-[8px] bg-[#FAF7F2]">
            <p className="font-serif text-base text-[#261811]">
              Nenhum convidado encontrado
            </p>
            <p className="font-serif italic text-xs text-[#8C7A6B] mt-1">
              Verifique os filtros aplicados ou digite outro termo na busca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm font-serif">
              <thead>
                <tr className="border-b border-[#E8DFD5] text-[#8C7A6B] text-[0.66rem] font-sans uppercase tracking-[0.14em]">
                  <th className="py-3 px-3">Convidado</th>
                  <th className="py-3 px-3">Família</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Papel</th>
                  <th className="py-3 px-3 text-right">Status de Presença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {convidadosFiltrados.map((c) => {
                  const isPresente = Boolean(c.presenteCheckin);
                  const horaCheckin = formatarHora(c.dataHoraCheckin);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-[#FAF7F2] transition-colors ${
                        isPresente ? "bg-[#F9FCFA]" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-medium text-[#261811]">
                        <span>{c.nome}</span>
                      </td>

                      <td className="py-3 px-3 text-[#6B5A4D]">
                        <span className="truncate max-w-[180px] block" title={c.familia}>
                          {c.familia}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {c.criancaAte6Anos ? (
                          <span className="inline-block text-[0.62rem] font-sans tracking-wider uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                            Criança (≤ 6 anos)
                          </span>
                        ) : (
                          <span className="inline-block text-[0.62rem] font-sans tracking-wider uppercase px-2 py-0.5 rounded bg-[#FAF7F2] text-[#6B5A4D] border border-[#E0D5C7]">
                            Adulto
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[#786455] text-xs">
                        {c.isFornecedor ? (
                          <span className="inline-block text-[0.62rem] font-sans tracking-wider uppercase px-2 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200 font-semibold">
                            {c.papel}
                          </span>
                        ) : (
                          c.papel || "Convidado"
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isPresente ? (
                          <span className="inline-flex items-center gap-1 text-[0.66rem] font-sans uppercase tracking-wider px-2.5 py-1 rounded-[4px] bg-[#EBF5EE] text-[#1E6B37] border border-[#C2DFCE] font-semibold">
                            <span>No Salão</span>
                            {horaCheckin && (
                              <span className="font-normal text-[#1E6B37]/80">({horaCheckin})</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-block text-[0.66rem] font-sans uppercase tracking-wider px-2.5 py-1 rounded-[4px] bg-[#F5EFE6] text-[#8C7A6B] border border-[#E5DACD]">
                            Aguardando
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
