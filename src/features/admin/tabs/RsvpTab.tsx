import React, { useState, useMemo } from "react";

export interface RespostaConvidadoItem {
  id: string;
  codigoConvite: string;
  nome: string;
  telefone: string;
  status: "Confirmado" | "Recusado" | "Pendente";
  familia?: string;
  observacao?: string;
  criancaAte6Anos?: boolean;
  dataConfirmacao?: string;
  respondido?: boolean;
}

interface RsvpTabProps {
  respostas: RespostaConvidadoItem[];
  search: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
}

export function RsvpTab({ respostas, search, onSearchChange, loading }: RsvpTabProps) {
  const [filtroStatus, setFiltroStatus] = useState<"respondidos" | "confirmados" | "recusados" | "todos">("respondidos");

  // Métricas rápidas
  const totalConfirmados = useMemo(() => respostas.filter((r) => r.status === "Confirmado").length, [respostas]);
  const totalRecusados = useMemo(() => respostas.filter((r) => r.status === "Recusado").length, [respostas]);
  const totalRespondidos = useMemo(() => respostas.filter((r) => r.status === "Confirmado" || r.status === "Recusado").length, [respostas]);
  const totalGeral = respostas.length;

  // Filtragem combinada (termo de busca + status selecionado)
  const itensExibidos = useMemo(() => {
    return respostas.filter((item) => {
      // 1. Filtro por status
      if (filtroStatus === "respondidos" && item.status !== "Confirmado" && item.status !== "Recusado") {
        return false;
      }
      if (filtroStatus === "confirmados" && item.status !== "Confirmado") {
        return false;
      }
      if (filtroStatus === "recusados" && item.status !== "Recusado") {
        return false;
      }

      // 2. Filtro por termo de busca
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        item.nome.toLowerCase().includes(q) ||
        item.codigoConvite.toLowerCase().includes(q) ||
        (item.telefone && item.telefone.toLowerCase().includes(q)) ||
        (item.familia && item.familia.toLowerCase().includes(q))
      );
    });
  }, [respostas, filtroStatus, search]);

  const exportarCsv = () => {
    const headers = ["Código do Convite", "Convidado", "Telefone", "Status RSVP", "Família", "Observação"];
    const rows = itensExibidos.map((item) => [
      item.codigoConvite,
      item.nome,
      item.telefone || "",
      item.status,
      item.familia || "",
      item.observacao || "",
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

        <button
          type="button"
          onClick={exportarCsv}
          className="self-start sm:self-center text-xs font-sans tracking-wider uppercase px-4 py-2.5 rounded-[6px] font-semibold bg-white border border-[#D8CDC0] text-[#261811] hover:border-[#261811] transition-colors cursor-pointer shadow-xs"
          title="Exportar respostas filtradas para arquivo CSV"
        >
          Exportar CSV
        </button>
      </div>

      {/* Painel Principal */}
      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        {/* Controles: Busca e Filtro de Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#F0EAE0]">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrar por código, nome de convidado, telefone ou família..."
            className="w-full md:w-96 bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFiltroStatus("respondidos")}
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
              onClick={() => setFiltroStatus("confirmados")}
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
              onClick={() => setFiltroStatus("recusados")}
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
              onClick={() => setFiltroStatus("todos")}
              className={`text-[0.7rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[6px] font-semibold transition-all cursor-pointer ${
                filtroStatus === "todos"
                  ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                  : "bg-[#FAF7F2] border border-[#E8DFD5] text-[#6B5A4D] hover:border-[#261811]"
              }`}
            >
              Todos ({totalGeral})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#261811] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Visualização Mobile: Cards (< 640px) */}
            <div className="block sm:hidden divide-y divide-[#E8DFD5]">
              {itensExibidos.map((item) => (
                <div key={item.id} className="py-3.5 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#8C7A6B] block">
                        {item.codigoConvite}
                      </span>
                      <h3 className="font-serif text-base font-medium text-[#261811] leading-tight">
                        {item.nome}
                      </h3>
                      {item.telefone && (
                        <a
                          href={`tel:${item.telefone.replace(/\D/g, "")}`}
                          className="text-xs font-sans text-[#8C7A6B] hover:text-[#261811] block mt-0.5"
                        >
                          Tel: {item.telefone}
                        </a>
                      )}
                    </div>
                    <span
                      className={`text-[0.66rem] font-sans tracking-wider uppercase px-2.5 py-0.5 rounded-full font-semibold border ${
                        item.status === "Confirmado"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : item.status === "Recusado"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {item.familia && (
                    <p className="text-xs text-[#8C7A6B]">
                      Família: {item.familia}
                    </p>
                  )}

                  {item.observacao && (
                    <p className="text-xs italic text-[#8C7A6B] font-serif bg-[#FAF7F2]/50 p-2 rounded border-l-2 border-[#D8CDC0]">
                      "{item.observacao}"
                    </p>
                  )}
                </div>
              ))}

              {!itensExibidos.length && (
                <div className="py-8 text-center text-xs font-serif italic text-[#8C7A6B]">
                  Nenhum convidado encontrado com os filtros selecionados.
                </div>
              )}
            </div>

            {/* Visualização Desktop: Tabela Oficial (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DFD5]">
                    <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Código do Convite
                    </th>
                    <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Convidado
                    </th>
                    <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Telefone
                    </th>
                    <th className="text-center px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Status RSVP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0]">
                  {itensExibidos.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#261811]">
                        {item.codigoConvite}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <strong className="font-serif text-sm text-[#261811]">
                            {item.nome}
                          </strong>
                          {item.criancaAte6Anos && (
                            <span className="text-[0.62rem] font-sans uppercase px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E8DFD5] text-[#8C7A6B]">
                              Criança ≤ 6 anos
                            </span>
                          )}
                        </div>
                        {item.familia && (
                          <span className="text-[0.7rem] text-[#8C7A6B] block">
                            Família: {item.familia}
                          </span>
                        )}
                        {item.observacao && (
                          <p className="text-xs italic text-[#8C7A6B] font-serif mt-0.5">
                            "{item.observacao}"
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-sans text-[#6B5A4D]">
                        {item.telefone || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`text-[0.66rem] font-sans tracking-wider uppercase px-2.5 py-1 rounded-full font-semibold border ${
                            item.status === "Confirmado"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.status === "Recusado"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!itensExibidos.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-xs font-serif italic text-[#8C7A6B]">
                        Nenhum convidado encontrado com os termos digitados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
