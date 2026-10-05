import React, { useState, useMemo } from "react";
import { StatusBadge } from "../../../design-system/StatusBadge";
import { RoleBadge } from "../../../design-system/RoleBadge";

export interface RespostaConvidadoItem {
  id: string;
  codigoConvite: string;
  nome: string;
  papel: string;
  participaCortejo: "Sim" | "Não";
  faixaEtaria: string;
  telefone: string;
  status: "CONFIRMADO" | "RECUSADO" | "PENDENTE";
  familia?: string;
  observacao?: string;
  criancaAte6Anos?: boolean;
  dataConfirmacao?: string;
  respondido?: boolean;
}

type FiltroStatusRsvp = "todos" | "respondidos" | "confirmados" | "recusados" | "pendentes";

interface RsvpTabProps {
  respostas: RespostaConvidadoItem[];
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter?: FiltroStatusRsvp;
  onStatusFilterChange?: (status: FiltroStatusRsvp) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading: boolean;
}

export function RsvpTab({
  respostas,
  search,
  onSearchChange,
  statusFilter = "todos",
  onStatusFilterChange,
  page = 0,
  pageSize = 30,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  loading,
}: RsvpTabProps) {
  const filtroStatus = statusFilter;
  const [copiado, setCopiado] = useState(false);

  const totalConfirmados = useMemo(
    () => respostas.filter((r) => r.status === "CONFIRMADO").length,
    [respostas]
  );
  const totalRecusados = useMemo(
    () => respostas.filter((r) => r.status === "RECUSADO").length,
    [respostas]
  );
  const totalPendentes = useMemo(
    () => respostas.filter((r) => r.status === "PENDENTE").length,
    [respostas]
  );
  const totalRespondidos = useMemo(
    () => respostas.filter((r) => r.status === "CONFIRMADO" || r.status === "RECUSADO").length,
    [respostas]
  );
  const totalGeral = total ?? respostas.length;
  const totalRegistros = total ?? respostas.length;
  const totalPaginas = totalPages ?? Math.max(1, Math.ceil(totalRegistros / Math.max(pageSize, 1)));
  const paginaAtual = page + 1;

  const itensDaPagina = respostas;

  const exportarCsv = () => {
    const headers = ["Código", "Nome", "Papel", "Participa do Cortejo", "Faixa Etária", "Telefone", "Status RSVP"];
    const rows = itensDaPagina.map((item) => [
      item.codigoConvite,
      item.nome,
      item.papel,
      item.participaCortejo,
      item.faixaEtaria,
      item.telefone || "",
      item.status,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";"))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista_oficial_respostas_${filtroStatus}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copiarTabela = () => {
    const headers = ["Código", "Nome", "Papel", "Participa do Cortejo", "Faixa Etária", "Telefone", "Status RSVP"];
    const rows = itensDaPagina.map((item) => [
      item.codigoConvite,
      item.nome,
      item.papel,
      item.participaCortejo,
      item.faixaEtaria,
      item.telefone || "",
      item.status,
    ]);

    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
            Confirmações &amp; Respostas Individuais
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
            Lista Oficial de Respostas
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={copiarTabela}
            className="text-xs font-sans tracking-wider uppercase px-3.5 py-2.5 rounded-[6px] font-semibold bg-white border border-[#D8CDC0] text-[#261811] hover:border-[#261811] transition-colors cursor-pointer shadow-xs"
            title="Copiar dados formatados para colar no Excel ou Google Sheets"
          >
            {copiado ? "Copiado!" : "Copiar Tabela"}
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            className="text-xs font-sans tracking-wider uppercase px-4 py-2.5 rounded-[6px] font-semibold bg-[#261811] text-[#FAF7F2] hover:bg-[#3d271c] transition-colors cursor-pointer shadow-xs"
            title="Exportar respostas filtradas para arquivo CSV"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Painel Principal */}
      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        {/* Controles: Busca e Filtro de Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#F0EAE0]">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrar por código, nome, papel, faixa etária, telefone..."
            className="w-full md:w-96 bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onStatusFilterChange?.("todos")}
              className={`text-[0.7rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold transition-all cursor-pointer ${
                filtroStatus === "todos"
                  ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                  : "bg-[#FAF7F2] border border-[#E8DFD5] text-[#6B5A4D] hover:border-[#261811]"
              }`}
            >
              Todos ({totalGeral})
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange?.("respondidos")}
              className={`text-[0.7rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold transition-all cursor-pointer ${
                filtroStatus === "respondidos"
                  ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                  : "bg-[#FAF7F2] border border-[#E8DFD5] text-[#6B5A4D] hover:border-[#261811]"
              }`}
            >
              Respondidos ({totalRespondidos})
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange?.("confirmados")}
              className={`text-[0.7rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold transition-all cursor-pointer ${
                filtroStatus === "confirmados"
                  ? "bg-emerald-900 text-white shadow-xs"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-900 hover:border-emerald-700"
              }`}
            >
              Confirmados ({totalConfirmados})
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange?.("recusados")}
              className={`text-[0.7rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold transition-all cursor-pointer ${
                filtroStatus === "recusados"
                  ? "bg-rose-900 text-white shadow-xs"
                  : "bg-rose-50 border border-rose-200 text-rose-900 hover:border-rose-700"
              }`}
            >
              Recusados ({totalRecusados})
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange?.("pendentes")}
              className={`text-[0.7rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold transition-all cursor-pointer ${
                filtroStatus === "pendentes"
                  ? "bg-amber-900 text-white shadow-xs"
                  : "bg-amber-50 border border-amber-200 text-amber-900 hover:border-amber-700"
              }`}
            >
              Pendentes ({totalPendentes})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#261811] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="block sm:hidden divide-y divide-[#E8DFD5]">
              {itensDaPagina.map((item) => (
                <div key={item.id} className="py-3.5 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#705E51] block">
                        {item.codigoConvite}
                      </span>
                      <h3 className="font-serif text-base font-medium text-[#261811] leading-tight">
                        {item.nome}
                      </h3>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs text-[#6B5A4D]">
                    <div>
                      <span className="text-[0.64rem] uppercase tracking-wider text-[#705E51] block mb-1">Papel:</span>
                      <RoleBadge papel={item.papel} />
                    </div>
                    <div>
                      <span className="text-[0.64rem] uppercase tracking-wider text-[#705E51] block mb-1">Cortejo:</span>
                      <span
                        className={`font-medium ${
                          item.participaCortejo === "Sim"
                            ? "text-emerald-800 font-semibold"
                            : "text-[#8C7A6B]"
                        }`}
                      >
                        {item.participaCortejo === "Sim" ? "✓" : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[0.64rem] uppercase tracking-wider text-[#705E51] block">Faixa Etária:</span>
                      <span>{item.faixaEtaria}</span>
                    </div>
                    <div>
                      <span className="text-[0.64rem] uppercase tracking-wider text-[#705E51] block">Telefone:</span>
                      <span>{item.telefone || "—"}</span>
                    </div>
                  </div>

                  {item.observacao && (
                    <p className="text-xs italic text-[#705E51] font-serif bg-[#FAF7F2]/50 p-2 rounded border-l-2 border-[#D8CDC0]">
                      "{item.observacao}"
                    </p>
                  )}
                </div>
              ))}

              {!itensDaPagina.length && (
                <div className="py-8 text-center text-xs font-serif italic text-[#705E51]">
                  Nenhum convidado encontrado com os filtros selecionados.
                </div>
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DFD5]">
                    <th className="text-left px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Código
                    </th>
                    <th className="text-left px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Nome
                    </th>
                    <th className="text-left px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Papel
                    </th>
                    <th className="text-center px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Cortejo
                    </th>
                    <th className="text-left px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Faixa Etária
                    </th>
                    <th className="text-left px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Telefone
                    </th>
                    <th className="text-center px-4 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Status RSVP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0]">
                  {itensDaPagina.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#261811] whitespace-nowrap">
                        {item.codigoConvite}
                      </td>
                      <td className="px-4 py-3.5">
                        <strong className="font-serif text-sm text-[#261811] block">
                          {item.nome}
                        </strong>
                        {item.observacao && (
                          <p className="text-xs italic text-[#705E51] font-serif mt-0.5 line-clamp-1" title={item.observacao}>
                            {item.observacao}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        <RoleBadge papel={item.papel} />
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {item.participaCortejo === "Sim" ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 text-sm font-bold"
                            title="Participa do cortejo"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="text-stone-400 text-sm font-sans select-none"
                            title="Não participa do cortejo"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-sans text-[#6B5A4D] whitespace-nowrap">
                        {item.faixaEtaria}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-sans text-[#6B5A4D] whitespace-nowrap">
                        {item.telefone || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}

                  {!itensDaPagina.length && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs font-serif italic text-[#705E51]">
                        Nenhum convidado encontrado com os termos digitados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {itensDaPagina.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#F0EAE0] text-xs font-sans text-[#6B5A4D]">
                <div className="flex items-center gap-3">
                  <span>
                    Mostrando <strong>{Math.min(page * pageSize + 1, totalRegistros)}</strong>–<strong>{Math.min((page + 1) * pageSize, totalRegistros)}</strong> de{" "}
                    <strong>{totalRegistros}</strong> convidados
                  </span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <label htmlFor="itens-por-pagina-select" className="text-[0.68rem] uppercase tracking-wider text-[#705E51]">
                      Por pág:
                    </label>
                    <select
                      id="itens-por-pagina-select"
                      value={pageSize}
                      onChange={(e) => {
                        const nextSize = Number(e.target.value);
                        onPageSizeChange?.(nextSize);
                        onPageChange?.(0);
                      }}
                      className="bg-[#FAF7F2] border border-[#D8CDC0] rounded px-2 py-1 text-xs text-[#261811] focus:outline-none focus:border-[#261811]"
                    >
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={9999}>Todos</option>
                    </select>
                  </div>
                </div>

                {totalPaginas > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 0}
                      onClick={() => onPageChange?.(0)}
                      className="px-2.5 py-1.5 rounded border border-[#D8CDC0] bg-white text-[#261811] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors cursor-pointer text-xs"
                      title="Primeira Página"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      disabled={page <= 0}
                      onClick={() => onPageChange?.(Math.max(0, page - 1))}
                      className="px-3 py-1.5 rounded border border-[#D8CDC0] bg-white text-[#261811] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors cursor-pointer text-xs"
                      title="Página Anterior"
                    >
                      ‹
                    </button>
                    <span className="px-3 py-1 text-xs font-medium text-[#261811]">
                      Página {paginaAtual} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPaginas - 1}
                      onClick={() => onPageChange?.(Math.min(totalPaginas - 1, page + 1))}
                      className="px-3 py-1.5 rounded border border-[#D8CDC0] bg-white text-[#261811] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors cursor-pointer text-xs"
                      title="Próxima Página"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPaginas - 1}
                      onClick={() => onPageChange?.(totalPaginas - 1)}
                      className="px-2.5 py-1.5 rounded border border-[#D8CDC0] bg-white text-[#261811] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors cursor-pointer text-xs"
                      title="Última Página"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
