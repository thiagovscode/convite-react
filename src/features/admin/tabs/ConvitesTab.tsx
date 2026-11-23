import React, { useState, useMemo, useEffect } from "react";
import type { ConviteCadastrado, NovoConviteFormState, MembroConviteCadastrado } from "../types";
import { PAPEL_OPTIONS, PAPEL_MEMBRO_OPTIONS } from "../types";
import { SectionTitle } from "../components/SectionTitle";
import {
  getLinkConviteCompleto,
  getLinkRsvpDireto,
  abrirWhatsAppConvite,
  getLinkFornecedor,
  abrirWhatsAppFornecedor,
} from "../utils/formatters";

import type { PapelParticipante, VinculoParticipante } from "../../../services/classificacoes";
import { isPapelCortejo } from "../../../services/classificacoes";
import {
  definirParCortejoAdmin,
  obterConfiguracaoEventoAdmin,
  atualizarPrazoRsvpAdmin,
  resetarRsvpConviteAdmin,
  type ConfiguracaoEventoInfo
} from "../../../services/api";
import { ResetRsvpModal } from "../components/ResetRsvpModal";
import { ConfigurarPrazoModal } from "../components/ConfigurarPrazoModal";
interface ConvitesTabProps {
  listaConvites: ConviteCadastrado[];
  filteredConvites: ConviteCadastrado[];
  buscaConvites: string;
  onBuscaChange: (v: string) => void;
  conviteEmEdicao: ConviteCadastrado | null;
  novoConvite: NovoConviteFormState;
  onNovoConviteChange: React.Dispatch<React.SetStateAction<NovoConviteFormState>>;
  cadLoading: boolean;
  cadErro: string;
  cadSucesso: { codigo: string; link: string; familia: string } | null;
  onSalvarConvite: (e: React.FormEvent) => Promise<void>;
  onIniciarEdicao: (c: ConviteCadastrado) => void;
  onNovoConviteClick?: () => void;
  onAbrirModalExclusao: (c: ConviteCadastrado) => void;
  feedbackGeral: { tipo: "sucesso" | "erro"; msg: string } | null;
  onDismissFeedback: () => void;
  papeis?: PapelParticipante[];
  vinculos?: VinculoParticipante[];
  onRecarregarDados?: () => Promise<void>;
}

export function ConvitesTab({
  listaConvites,
  filteredConvites,
  buscaConvites,
  onBuscaChange,
  conviteEmEdicao,
  novoConvite,
  onNovoConviteChange,
  cadLoading,
  cadErro,
  cadSucesso,
  onSalvarConvite,
  onIniciarEdicao,
  onNovoConviteClick,
  onAbrirModalExclusao,
  feedbackGeral,
  onDismissFeedback,
  papeis = [],
  onRecarregarDados,
}: ConvitesTabProps) {
  const [subTab, setSubTab] = useState<"lista" | "novo">("lista");
  const [filtroStatusConvite, setFiltroStatusConvite] = useState<"TODOS" | "CONFIRMADO" | "PENDENTE" | "RECUSADO" | "FORNECEDOR">("TODOS");
  const [copiadoCode, setCopiadoCode] = useState<Record<string, string>>({});
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState(buscaConvites);

  useEffect(() => {
    setBuscaLocal(buscaConvites);
  }, [buscaConvites]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onBuscaChange(buscaLocal.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [buscaLocal, onBuscaChange]);

  // Configuração do Prazo de RSVP (Definido pelos noivos)
  const [configEvento, setConfigEvento] = useState<ConfiguracaoEventoInfo | null>(null);
  const [modalPrazoAberto, setModalPrazoAberto] = useState(false);
  const [salvandoPrazo, setSalvandoPrazo] = useState(false);
  const [erroPrazo, setErroPrazo] = useState("");
  const [sucessoPrazo, setSucessoPrazo] = useState("");

  const carregarPrazoEvento = async () => {
    try {
      const cfg = await obterConfiguracaoEventoAdmin();
      setConfigEvento(cfg);
    } catch {
      // Ignora erro
    }
  };

  React.useEffect(() => {
    carregarPrazoEvento();
  }, []);

  const handleSalvarPrazoModal = async (prazoIso: string) => {
    setSalvandoPrazo(true);
    setErroPrazo("");
    setSucessoPrazo("");

    try {
      const res = await atualizarPrazoRsvpAdmin(prazoIso);
      setConfigEvento(res);
      setSucessoPrazo("Prazo de confirmação de RSVP atualizado com sucesso!");
      setTimeout(() => {
        setModalPrazoAberto(false);
        setSucessoPrazo("");
      }, 1200);
    } catch (err: any) {
      setErroPrazo(err.message || "Erro ao salvar novo prazo.");
    } finally {
      setSalvandoPrazo(false);
    }
  };

  // Reset de RSVP do Convite com Modal Profissional
  const [conviteParaResetar, setConviteParaResetar] = useState<ConviteCadastrado | null>(null);
  const [resetandoRsvpLoading, setResetandoRsvpLoading] = useState(false);
  const [resetRsvpErro, setResetRsvpErro] = useState("");

  const handleAbrirModalReset = (c: ConviteCadastrado) => {
    setConviteParaResetar(c);
    setResetRsvpErro("");
  };

  const handleConfirmarResetRsvp = async () => {
    if (!conviteParaResetar) return;

    setResetandoRsvpLoading(true);
    setResetRsvpErro("");

    try {
      const res = await resetarRsvpConviteAdmin(conviteParaResetar.codigo);
      if (res.success) {
        setConviteParaResetar(null);
        if (onRecarregarDados) {
          await onRecarregarDados();
        }
      } else {
        setResetRsvpErro(res.message || "Erro ao resetar convite.");
      }
    } catch (err: any) {
      setResetRsvpErro(err.message || "Erro ao resetar convite.");
    } finally {
      setResetandoRsvpLoading(false);
    }
  };

  // Gerenciamento de Par do Cortejo
  const [modalParAberto, setModalParAberto] = useState<{
    codigoConvite: string;
    membroId?: string;
    nomeMembro: string;
    papel?: string;
    parAtual?: string;
  } | null>(null);
  const [parSelecionado, setParSelecionado] = useState<string>("");
  const [salvandoPar, setSalvandoPar] = useState(false);
  const [erroPar, setErroPar] = useState("");

  const outrosCandidatosPar = useMemo(() => {
    if (!modalParAberto) return [];
    const nomeAtual = modalParAberto.nomeMembro.trim().toLowerCase();
    const lista: { nome: string; papel: string; familia: string }[] = [];
    const jaAdicionados = new Set<string>();

    for (const c of listaConvites) {
      if (c.membros) {
        for (const m of c.membros) {
          if (!m.nome) continue;
          const nomeTrim = m.nome.trim();
          const nomeLimpo = nomeTrim.toLowerCase();
          if (nomeLimpo === nomeAtual) continue;

          const ehCortejo = isPapelCortejo(m.papel, papeis) || m.participaCortejo;
          if (ehCortejo && !jaAdicionados.has(nomeLimpo)) {
            jaAdicionados.add(nomeLimpo);
            lista.push({
              nome: nomeTrim,
              papel: m.papel || "Cortejo",
              familia: c.familia,
            });
          }
        }
      }
    }
    return lista;
  }, [modalParAberto, listaConvites, papeis]);

  const handleAbrirModalPar = (c: ConviteCadastrado, m: MembroConviteCadastrado) => {
    setModalParAberto({
      codigoConvite: c.codigo,
      membroId: m.id,
      nomeMembro: m.nome,
      papel: m.papel,
      parAtual: m.par || "",
    });
    setParSelecionado(m.par || "");
    setErroPar("");
  };

  const handleConfirmarDefinicaoPar = async (forcarVazio?: boolean) => {
    if (!modalParAberto) return;
    setSalvandoPar(true);
    setErroPar("");
    try {
      const nomeFinal = forcarVazio ? "" : parSelecionado.trim();

      await definirParCortejoAdmin({
        codigoConvite: modalParAberto.codigoConvite,
        membroId: modalParAberto.membroId,
        nomeMembro: modalParAberto.nomeMembro,
        nomePar: nomeFinal,
      });
      setModalParAberto(null);
      if (onRecarregarDados) {
        await onRecarregarDados();
      }
    } catch (err: any) {
      setErroPar(err.message || "Erro ao atualizar par.");
    } finally {
      setSalvandoPar(false);
    }
  };

  const listaPapeisDisponiveis = papeis.length > 0 ? papeis.map((p) => p.nome) : PAPEL_MEMBRO_OPTIONS;

  const contadoresStatus = useMemo(() => {
    let confirmados = 0;
    let pendentes = 0;
    let recusados = 0;
    let fornecedoresCount = 0;
    listaConvites.forEach((c) => {
      if (c.ehFornecedor) fornecedoresCount++;
      const st = (c.status || "PENDENTE").toUpperCase();
      if (st === "CONFIRMADO") confirmados++;
      else if (st === "RECUSADO") recusados++;
      else pendentes++;
    });
    return {
      todos: listaConvites.length,
      confirmados,
      pendentes,
      recusados,
      fornecedores: fornecedoresCount,
    };
  }, [listaConvites]);

  const convitesExibidos = useMemo(() => {
    return filteredConvites.filter((c) => {
      if (filtroStatusConvite === "TODOS") return true;
      if (filtroStatusConvite === "FORNECEDOR") return Boolean(c.ehFornecedor);
      const st = (c.status || "PENDENTE").toUpperCase();
      return st === filtroStatusConvite;
    });
  }, [filteredConvites, filtroStatusConvite]);

  const copiarTexto = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoCode((prev) => ({ ...prev, [chave]: "✓ Copiado" }));
    setTimeout(() => {
      setCopiadoCode((prev) => {
        const c = { ...prev };
        delete c[chave];
        return c;
      });
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8DFD5] pb-4">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#6B5A4D] font-semibold mb-1">
            Gestão de Convites
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
            {subTab === "lista"
              ? "Convites Oficiais & Códigos"
              : conviteEmEdicao
              ? `Editar: ${conviteEmEdicao.familia}`
              : "Cadastrar Novo Convite"}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab("lista")}
            className={`text-xs font-sans tracking-[0.12em] uppercase px-3.5 py-2.5 rounded-[8px] font-semibold transition-all cursor-pointer min-h-[38px] ${
              subTab === "lista"
                ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                : "bg-white border border-[#D8CDC0] text-[#543D30] hover:bg-[#FAF7F2]"
            }`}
          >
            Lista ({listaConvites.length})
          </button>
          <button
            type="button"
            onClick={() => setModalPrazoAberto(true)}
            className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.12em] uppercase px-3.5 py-2.5 rounded-[8px] font-semibold bg-[#FAF7F2] hover:bg-[#EFE9DD] border border-[#D8CDC0] text-[#543D30] hover:text-[#261811] transition-all cursor-pointer shadow-xs min-h-[38px]"
            title="Alterar prazo limite para confirmação de presença (RSVP)"
          >
            <span>📅 Prazo RSVP: {configEvento?.prazoRsvpFormatado || "Não definido"}</span>
            <span className="text-[0.60rem] bg-amber-100 text-amber-950 border border-amber-300 rounded px-1.5 py-0.5 font-bold">
              Alterar
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onNovoConviteClick?.();
              setSubTab("novo");
            }}
            className={`text-xs font-sans tracking-[0.12em] uppercase px-3.5 py-2.5 rounded-[8px] font-semibold transition-all cursor-pointer min-h-[38px] ${
              subTab === "novo"
                ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                : "bg-white border border-[#D8CDC0] text-[#543D30] hover:bg-[#FAF7F2]"
            }`}
          >
            + Novo Convite
          </button>
        </div>
      </div>

      {feedbackGeral && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-sans rounded-[8px] flex justify-between items-center shadow-xs"
        >
          <span className="font-medium">✓ {feedbackGeral.msg}</span>
          <button
            type="button"
            onClick={onDismissFeedback}
            className="text-emerald-800 hover:text-emerald-950 font-bold ml-3 p-1 cursor-pointer"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {subTab === "lista" ? (
        <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-5">
          {/* Controles de Busca e Filtros de Status */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#EAE0D5]">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={buscaLocal}
                onChange={(e) => setBuscaLocal(e.target.value)}
                placeholder="Buscar por família, nome do convidado, telefone ou código..."
                aria-label="Buscar convites"
                className="w-full bg-[#FAF7F2] focus:bg-white border border-[#D8CDC0] pl-3.5 pr-9 py-2.5 text-xs font-sans text-[#261811] rounded-[8px] focus:outline-none focus:border-[#261811] transition-colors min-h-[40px]"
              />
              {buscaLocal && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaLocal("");
                    onBuscaChange("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B5A4D] hover:text-[#261811] text-xs font-bold p-1 cursor-pointer"
                  aria-label="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pílulas de Filtro Rápido */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: "TODOS", label: `Todos (${contadoresStatus.todos})`, activeClass: "bg-[#261811] text-[#FAF7F2]" },
                  { id: "CONFIRMADO", label: `Confirmados (${contadoresStatus.confirmados})`, activeClass: "bg-emerald-800 text-white" },
                  { id: "PENDENTE", label: `Pendentes (${contadoresStatus.pendentes})`, activeClass: "bg-amber-800 text-white" },
                  { id: "RECUSADO", label: `Ausências (${contadoresStatus.recusados})`, activeClass: "bg-rose-800 text-white" },
                  ...(contadoresStatus.fornecedores > 0
                    ? [{ id: "FORNECEDOR" as const, label: `🏢 Fornecedores (${contadoresStatus.fornecedores})`, activeClass: "bg-[#543D30] text-white" }]
                    : []),
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFiltroStatusConvite(pill.id)}
                  className={`text-[0.68rem] font-sans tracking-wider uppercase px-3 py-1.5 rounded-[8px] font-semibold transition-all cursor-pointer ${
                    filtroStatusConvite === pill.id
                      ? `${pill.activeClass} shadow-xs`
                      : "bg-[#FAF7F2] border border-[#E8DFD5] text-[#543D30] hover:border-[#261811]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listagem de Convites */}
          {convitesExibidos.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-[#D8CDC0] rounded-[12px] bg-[#FAF7F2]/60 space-y-2">
              <p className="font-serif text-lg text-[#261811]">
                Nenhum convite encontrado para este filtro
              </p>
              <p className="font-sans text-xs text-[#6B5A4D]">
                Tente limpar o termo de pesquisa ou alternar o filtro de status acima.
              </p>
              {(buscaLocal || filtroStatusConvite !== "TODOS") && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaLocal("");
                    onBuscaChange("");
                    setFiltroStatusConvite("TODOS");
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#261811] text-[#FAF7F2] text-xs font-sans uppercase tracking-wider font-semibold rounded-[8px] cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {convitesExibidos.map((c) => {
                const statusKey = (c.status || "PENDENTE").toUpperCase();
                const linkOficial = getLinkConviteCompleto(c.codigo);
                const linkRsvp = getLinkRsvpDireto(c.codigo);
                const copiadoConvite = copiadoCode[c.codigo];
                const copiadoRsvp = copiadoCode[`${c.codigo}-rsvp`];
                const copiadoCodigo = copiadoCode[`${c.codigo}-code`];

                return (
                  <div
                    key={c.id || c.codigo}
                    className="p-4 sm:p-5 rounded-[12px] border border-[#E8DFD5] hover:border-[#D8CDC0] bg-[#FAF7F2]/30 hover:bg-[#FAF7F2]/70 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-serif text-lg sm:text-xl font-medium text-[#261811] leading-tight">
                          {c.familia}
                        </h3>
                        {c.ehFornecedor && (
                          <span className="text-[0.62rem] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-xs">
                            🏢 Fornecedor
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => copiarTexto(c.codigo, `${c.codigo}-code`)}
                          className="font-mono text-xs font-bold text-[#261811] bg-white hover:bg-[#EFE9DD] px-2.5 py-0.5 rounded-[6px] border border-[#D8CDC0] cursor-pointer transition-colors"
                          title="Clique para copiar o código do convite"
                        >
                          {copiadoCodigo || `#${c.codigo}`}
                        </button>
                        <span className="text-xs font-sans text-[#6B5A4D]">
                          · {c.membros?.length || 0} {(c.membros?.length || 0) === 1 ? "pessoa" : "pessoas"}
                        </span>
                      </div>

                      <span
                        className={`self-start sm:self-auto text-[0.66rem] font-sans tracking-wider uppercase px-3 py-1 rounded-full font-semibold border ${
                          statusKey === "CONFIRMADO"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : statusKey === "RECUSADO"
                            ? "bg-rose-50 text-rose-900 border-rose-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}
                      >
                        {statusKey === "CONFIRMADO" ? "✓ Confirmado" : statusKey === "RECUSADO" ? "✕ Não vai" : "⏳ Pendente"}
                      </span>
                    </div>

                    {c.observacao && (
                      <p className="text-xs italic text-[#543D30] font-serif bg-white px-3 py-1.5 rounded-[6px] border-l-2 border-[#8C7A6B]">
                        &ldquo;{c.observacao}&rdquo;
                      </p>
                    )}

                    {/* Lista de Membros em Pílulas Legíveis */}
                    <div className="space-y-1.5">
                      {c.telefone && (
                        <p className="text-xs font-sans text-[#543D30]">
                          <span className="text-[#6B5A4D] font-medium">Contato:</span> {c.telefone}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.membros?.map((m, idx) => {
                          const papelMembro = m.papel || "Convidado";
                          const ehCortejo = isPapelCortejo(papelMembro, papeis) || m.participaCortejo;

                          return (
                            <div
                              key={m.id || idx}
                              className={`inline-flex flex-wrap items-center gap-1.5 text-xs font-sans px-2.5 py-1 rounded-[8px] border ${
                                m.confirmadoRsvp === true
                                  ? "bg-emerald-50/70 border-emerald-200 text-[#261811]"
                                  : m.confirmadoRsvp === false
                                  ? "bg-rose-50/60 border-rose-200 text-[#6B5A4D]"
                                  : "bg-white border-[#E5DCD0] text-[#261811]"
                              }`}
                            >
                              <strong className="font-medium">{m.nome}</strong>
                              <span className="text-[0.68rem] text-[#6B5A4D]">[{papelMembro}]</span>

                              {m.criancaAte6Anos && (
                                <span className="text-[0.62rem] font-semibold px-1.5 py-0.2 bg-[#FAF7F2] text-[#6B5A4D] border border-[#E0D5C7] rounded">
                                  0-6a
                                </span>
                              )}

                              {ehCortejo && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-[0.60rem] font-sans uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded">
                                    Cortejo
                                  </span>
                                  {m.par ? (
                                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-sans bg-amber-50 text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded font-medium">
                                      <span>Par: <strong>{m.par}</strong></span>
                                      <button
                                        type="button"
                                        onClick={() => handleAbrirModalPar(c, m)}
                                        className="text-amber-800 hover:text-amber-950 font-bold ml-0.5 cursor-pointer"
                                        title="Alterar ou desvincular par deste integrante"
                                      >
                                        ✎
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirModalPar(c, m)}
                                      className="text-[0.65rem] font-sans text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors"
                                      title="Definir par no cortejo"
                                    >
                                      + Par
                                    </button>
                                  )}
                                </span>
                              )}

                              {m.confirmadoRsvp === true && (
                                <span className="text-emerald-800 font-semibold text-[0.7rem]">
                                  {c.ehFornecedor ? "🍽️ Fica até o fim" : "✓ Vai"}
                                </span>
                              )}
                              {m.confirmadoRsvp === false && (
                                <span className="text-rose-800 font-medium text-[0.7rem]">✕ Não vai</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ações do Convite */}
                    {c.ehFornecedor ? (
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2 border-t border-[#EAE0D5]">
                        <button
                          type="button"
                          onClick={() => copiarTexto(getLinkFornecedor(c.fornecedorId || c.id || ""), c.codigo)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans font-medium text-[#261811] bg-white hover:bg-[#EFE8DC] border border-[#D8CDC0] rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                          title="Copiar link da credencial da equipe"
                        >
                          <span>{copiadoConvite || "🔗 Copiar Credencial"}</span>
                        </button>
                        {c.telefone && (
                          <button
                            type="button"
                            onClick={() => abrirWhatsAppFornecedor(c.familia, c.fornecedorId || c.id || "", c.telefone)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                            title="Enviar credencial da equipe no WhatsApp"
                          >
                            <span>💬 WhatsApp</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2 border-t border-[#EAE0D5]">
                        <button
                          type="button"
                          onClick={() => copiarTexto(linkOficial, c.codigo)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans font-medium text-[#261811] bg-white hover:bg-[#EFE8DC] border border-[#D8CDC0] rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                        >
                          <span>{copiadoConvite || "🔗 Copiar Link"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppConvite(c.familia, c.codigo, c.telefone)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                        >
                          <span>💬 WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copiarTexto(linkRsvp, `${c.codigo}-rsvp`)}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-sans text-[#543D30] hover:text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#E3D8CB] rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                        >
                          <span>{copiadoRsvp || "Link RSVP Direto"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onIniciarEdicao(c);
                            setSubTab("novo");
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans font-medium text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#D8CDC0] rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                        >
                          <span>✎ Editar</span>
                        </button>
                        {(statusKey === "CONFIRMADO" || statusKey === "RECUSADO" || c.membros?.some(m => m.confirmadoRsvp !== undefined && m.confirmadoRsvp !== null)) && (
                          <button
                            type="button"
                            onClick={() => handleAbrirModalReset(c)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-sans text-[#543D30] hover:text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#D8CDC0] rounded-[8px] cursor-pointer min-h-[38px] transition-colors"
                            title="Resetar respostas deste convite e voltar para Pendente"
                          >
                            <span>↺ Resetar RSVP</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onAbrirModalExclusao(c)}
                          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans font-medium text-rose-800 hover:text-rose-950 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 rounded-[8px] cursor-pointer min-h-[38px] transition-colors sm:ml-auto"
                        >
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSalvarConvite} className="space-y-6">
          {cadErro && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-300 rounded-[8px] text-xs font-sans text-rose-950 font-medium">
              {cadErro}
            </div>
          )}

          {cadSucesso && (
            <div role="status" className="p-5 bg-emerald-50 border border-emerald-300 rounded-[12px] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <strong className="font-serif text-lg text-emerald-950 block">
                  ✓ Convite de &ldquo;{cadSucesso.familia}&rdquo; salvo com sucesso!
                </strong>
                <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded border border-emerald-300 text-emerald-950">
                  #{cadSucesso.codigo}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={cadSucesso.link}
                  aria-label="Link do convite gerado"
                  className="flex-1 bg-white border border-emerald-300 px-3 py-2.5 text-xs font-mono rounded-[8px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cadSucesso.link);
                    setCopiadoFeedback(true);
                    setTimeout(() => setCopiadoFeedback(false), 2000);
                  }}
                  className="bg-[#261811] hover:bg-[#1A100B] text-white px-5 py-2.5 text-xs font-sans uppercase tracking-wider rounded-[8px] font-semibold cursor-pointer min-h-[40px]"
                >
                  {copiadoFeedback ? "✓ Link Copiado!" : "Copiar Link"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
            <SectionTitle>Dados da Família / Convidado</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="convite-familia-input" className="block text-[0.68rem] font-sans tracking-[0.16em] uppercase text-[#543D30] font-semibold mb-1.5">
                  Nome da Família ou Convidado Principal *
                </label>
                <input
                  id="convite-familia-input"
                  type="text"
                  required
                  value={novoConvite.familia}
                  onChange={(e) => onNovoConviteChange((p) => ({ ...p, familia: e.target.value }))}
                  placeholder="Ex: Família Vasconcelos"
                  className="w-full bg-[#FAF7F2] focus:bg-white border border-[#D8CDC0] px-3.5 py-2.5 text-[#261811] font-sans text-sm rounded-[8px] focus:outline-none focus:border-[#261811] min-h-[42px]"
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="convite-telefone-input" className="block text-[0.68rem] font-sans tracking-[0.16em] uppercase text-[#543D30] font-semibold mb-1.5">
                  Telefone / WhatsApp
                </label>
                <input
                  id="convite-telefone-input"
                  type="text"
                  value={novoConvite.telefone}
                  onChange={(e) => onNovoConviteChange((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#FAF7F2] focus:bg-white border border-[#D8CDC0] px-3.5 py-2.5 text-[#261811] font-sans text-sm rounded-[8px] focus:outline-none focus:border-[#261811] min-h-[42px]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <SectionTitle>Participantes do Convite ({novoConvite.membros.length})</SectionTitle>
                <p className="text-xs font-sans text-[#6B5A4D] mt-0.5">
                  Cadastre as pessoas deste convite, definindo o papel no evento e a faixa etária.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onNovoConviteChange((p) => ({
                    ...p,
                    membros: [
                      ...p.membros,
                      { id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, nome: "", criancaAte6Anos: false, papel: "Convidado", participaCortejo: false },
                    ],
                  }))
                }
                className="text-xs font-sans tracking-[0.12em] uppercase px-3.5 py-2 border border-[#261811] text-[#261811] hover:bg-[#261811] hover:text-[#FAF7F2] transition-colors rounded-[8px] font-semibold cursor-pointer self-start sm:self-auto"
              >
                + Adicionar Participante
              </button>
            </div>

            <div className="space-y-3">
              {novoConvite.membros.map((m, idx) => {
                const papelAtual = m.papel || "Convidado";
                const ehCortejo = isPapelCortejo(papelAtual, papeis);

                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-3 p-4 rounded-[10px] border border-[#E8DFD5] bg-[#FAF7F2]/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-[#6B5A4D] w-6 shrink-0 hidden sm:inline-block">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        required
                        value={m.nome}
                        onChange={(e) =>
                          onNovoConviteChange((prev) => ({
                            ...prev,
                            membros: prev.membros.map((item, i) =>
                              i === idx ? { ...item, nome: e.target.value } : item
                            ),
                          }))
                        }
                        placeholder={novoConvite.membros.length > 1 ? `Nome completo do participante ${idx + 1} *` : "Nome completo do participante *"}
                        aria-label={`Nome do participante ${idx + 1}`}
                        className="flex-1 bg-white border border-[#D8CDC0] px-3.5 py-2.5 text-[#261811] font-sans text-sm rounded-[8px] focus:outline-none focus:border-[#261811] min-h-[42px]"
                      />

                      <select
                        value={papelAtual}
                        aria-label={`Papel do participante ${idx + 1}`}
                        onChange={(e) => {
                          const novoPapel = e.target.value;
                          const novoEhCortejo = isPapelCortejo(novoPapel, papeis);
                          onNovoConviteChange((prev) => ({
                            ...prev,
                            membros: prev.membros.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    papel: novoPapel,
                                    participaCortejo: novoEhCortejo,
                                  }
                                : item
                            ),
                          }));
                        }}
                        className="bg-white border border-[#D8CDC0] px-3.5 py-2.5 text-xs font-sans font-medium text-[#261811] rounded-[8px] focus:outline-none focus:border-[#261811] min-w-[180px] min-h-[42px]"
                        title="Papel no Evento"
                      >
                        {listaPapeisDisponiveis.map((papelOpt) => (
                          <option key={papelOpt} value={papelOpt}>
                            {papelOpt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-between pt-2 border-t border-[#EAE0D5]/70 text-xs font-sans text-[#543D30]">
                      <div className="flex flex-wrap items-center gap-3">
                        {ehCortejo && (
                          <span
                            className="inline-flex items-center gap-1.5 font-semibold text-amber-950 bg-amber-100/80 border border-amber-300 px-2.5 py-1 rounded-[6px] text-xs select-none"
                            title="Este papel já integra automaticamente o cortejo de honra da cerimônia"
                          >
                            <span>✨ Integrante do Cortejo</span>
                          </span>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-[#543D30] hover:text-[#261811] px-2.5 py-1 rounded-[6px] bg-white border border-[#E5DCD0] hover:border-[#261811] transition-colors">
                          <input
                            type="checkbox"
                            checked={m.criancaAte6Anos}
                            onChange={(e) =>
                              onNovoConviteChange((prev) => ({
                                ...prev,
                                membros: prev.membros.map((item, i) =>
                                  i === idx ? { ...item, criancaAte6Anos: e.target.checked } : item
                                ),
                              }))
                            }
                            className="accent-[#261811] w-4 h-4"
                          />
                          <span>Criança menor de 7 anos (0 a 6 anos)</span>
                        </label>
                      </div>

                      {novoConvite.membros.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onNovoConviteChange((prev) => ({
                              ...prev,
                              membros: prev.membros.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-rose-700 hover:text-rose-950 text-xs font-sans font-semibold uppercase px-2 py-1 rounded hover:bg-rose-50 cursor-pointer ml-auto transition-colors"
                        >
                          ✕ Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                onNovoConviteClick?.();
                setSubTab("lista");
              }}
              className="px-5 py-3 border border-[#D8CDC0] bg-white hover:bg-[#FAF7F2] text-[#543D30] rounded-[8px] text-xs font-sans tracking-wider uppercase font-semibold cursor-pointer min-h-[46px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cadLoading}
              className="px-6 py-3 bg-[#261811] hover:bg-[#1A100B] text-white rounded-[8px] text-xs font-sans tracking-wider uppercase font-semibold cursor-pointer disabled:opacity-50 min-h-[46px] shadow-xs"
            >
              {cadLoading ? "Salvando..." : conviteEmEdicao ? "Salvar Alterações" : "Salvar Convite"}
            </button>
          </div>
        </form>
      )}

      {/* MODAL PARA DEFINIÇÃO DE PAR NO CORTEJO */}
      {modalParAberto && (
        <div
          className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !salvandoPar && setModalParAberto(null)}
        >
          <div
            className="bg-white border border-[#D8CDC0] rounded-[12px] p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[0.66rem] font-sans tracking-widest uppercase text-[#8C7A6B] font-semibold block">
                Cortejo da Cerimônia
              </span>
              <h3 className="font-serif text-xl text-[#261811] mt-0.5">
                Definir Par para {modalParAberto.nomeMembro}
              </h3>
              <p className="text-xs font-sans text-[#6B5A4D] mt-1 leading-relaxed">
                {modalParAberto.papel && <strong className="text-[#261811]">[{modalParAberto.papel}]</strong>}{" "}
                Nem todo integrante precisa de par. Caso vá entrar desacompanhado(a), selecione a opção de entrar sozinho.
              </p>
            </div>

            {erroPar && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs font-sans">
                {erroPar}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-sans font-medium text-[#543D30]">
                Quem acompanhará este integrante na entrada?
              </label>

              <select
                value={parSelecionado}
                onChange={(e) => setParSelecionado(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2.5 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
              >
                <option value="">— Sem par (Entra sozinho) —</option>
                {outrosCandidatosPar.map((cand) => (
                  <option key={cand.nome} value={cand.nome}>
                    {cand.nome} ({cand.papel}) · {cand.familia}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#EAE0D5] text-xs font-sans">
              <button
                type="button"
                disabled={salvandoPar}
                onClick={() => setModalParAberto(null)}
                className="px-3.5 py-2 text-[#6B5A4D] hover:text-[#261811] cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {modalParAberto.parAtual && (
                  <button
                    type="button"
                    disabled={salvandoPar}
                    onClick={() => handleConfirmarDefinicaoPar(true)}
                    className="px-3 py-2 text-rose-800 hover:text-rose-950 font-medium cursor-pointer"
                  >
                    Remover Par
                  </button>
                )}

                <button
                  type="button"
                  disabled={salvandoPar}
                  onClick={() => handleConfirmarDefinicaoPar(false)}
                  className="px-4 py-2 bg-[#261811] text-[#FAF7F2] rounded-[6px] font-semibold hover:bg-black cursor-pointer transition-colors shadow-xs"
                >
                  {salvandoPar ? "Salvando..." : "Confirmar Par"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Profissional de Reset de RSVP */}
      <ResetRsvpModal
        convite={conviteParaResetar}
        loading={resetandoRsvpLoading}
        error={resetRsvpErro}
        onCancel={() => {
          setConviteParaResetar(null);
          setResetRsvpErro("");
        }}
        onConfirm={handleConfirmarResetRsvp}
      />

      {/* Modal Profissional de Configuração de Prazo de RSVP */}
      <ConfigurarPrazoModal
        isOpen={modalPrazoAberto}
        configAtual={configEvento}
        loading={salvandoPrazo}
        error={erroPrazo}
        sucesso={sucessoPrazo}
        onClose={() => {
          setModalPrazoAberto(false);
          setErroPrazo("");
          setSucessoPrazo("");
        }}
        onSalvar={handleSalvarPrazoModal}
      />
    </div>
  );
}
