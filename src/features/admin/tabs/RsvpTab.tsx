import React from "react";
import type { AdminRsvpItem, AcompanhanteResponse } from "../../../services/api";

interface RsvpTabProps {
  filteredRsvp: AdminRsvpItem[];
  search: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
}

export function RsvpTab({ filteredRsvp, search, onSearchChange, loading }: RsvpTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
          Confirmações
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
          Lista Oficial de Respostas
        </h1>
      </div>

      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filtrar por nome de convidado ou telefone..."
          className="w-full sm:w-80 bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
        />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#261811] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Visualização Mobile: Cards Verticais Sem Quebras (< 640px) */}
            <div className="block sm:hidden divide-y divide-[#E8DFD5]">
              {filteredRsvp.map((r) => (
                <div key={r.id} className="py-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-serif text-base font-medium text-[#261811] leading-tight">
                        {r.nome}
                      </h3>
                      {r.telefone && (
                        <a
                          href={`tel:${r.telefone.replace(/\D/g, "")}`}
                          className="text-xs font-sans text-[#8C7A6B] hover:text-[#261811] block mt-0.5"
                        >
                          📞 {r.telefone}
                        </a>
                      )}
                    </div>
                    <span
                      className={`text-[0.66rem] font-sans tracking-wider uppercase px-2.5 py-0.5 rounded-full font-semibold border ${
                        r.presenca
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {r.presenca ? "Confirmado" : "Não vai"}
                    </span>
                  </div>

                  <p className="text-xs font-sans text-[#6B5A4D]">
                    Total: <strong className="text-[#261811]">{r.totalPessoas}</strong>{" "}
                    {r.totalPessoas === 1 ? "pessoa" : "pessoas"}
                    {r.criancasAte6Anos > 0 && ` (sendo ${r.criancasAte6Anos} crianças ≤ 6 anos)`}
                  </p>

                  {r.acompanhantes && r.acompanhantes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {r.acompanhantes.map((a: AcompanhanteResponse, i: number) => (
                        <span
                          key={i}
                          className="text-[0.68rem] bg-[#FAF7F2] border border-[#E8DFD5] px-2 py-0.5 rounded text-[#543D30]"
                        >
                          {a.nome}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.observacao && (
                    <p className="text-xs italic text-[#8C7A6B] font-serif bg-[#FAF7F2]/50 p-2 rounded border-l-2 border-[#D8CDC0]">
                      "{r.observacao}"
                    </p>
                  )}
                </div>
              ))}

              {!filteredRsvp.length && (
                <div className="py-8 text-center text-xs font-serif italic text-[#8C7A6B]">
                  Nenhuma confirmação encontrada com os termos digitados.
                </div>
              )}
            </div>

            {/* Visualização Desktop: Tabela Elegante (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DFD5]">
                    <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Convidado
                    </th>
                    <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Telefone
                    </th>
                    <th className="text-center px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Pessoas
                    </th>
                    <th className="text-center px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0]">
                  {filteredRsvp.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="px-5 py-4">
                        <strong className="font-serif text-base text-[#261811] block">{r.nome}</strong>
                        {r.acompanhantes && r.acompanhantes.length > 0 && (
                          <span className="text-xs text-[#8C7A6B]">
                            +{r.acompanhantes.map((a: AcompanhanteResponse) => a.nome).join(", ")}
                          </span>
                        )}
                        {r.observacao && (
                          <p className="text-xs italic text-[#8C7A6B] font-serif mt-0.5">
                            "{r.observacao}"
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-sans text-[#6B5A4D]">{r.telefone}</td>
                      <td className="px-5 py-4 text-center font-serif text-base font-medium text-[#261811]">
                        {r.totalPessoas}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`text-[0.66rem] font-sans tracking-wider uppercase px-2.5 py-1 rounded-full font-semibold border ${
                            r.presenca
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {r.presenca ? "Confirmado" : "Não vai"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!filteredRsvp.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-xs font-serif italic text-[#8C7A6B]">
                        Nenhuma resposta encontrada.
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
