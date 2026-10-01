import React, { useState, useMemo } from "react";
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
  onNavegarParaFornecedores?: (fornecedorId?: string) => void;
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
  onNavegarParaFornecedores,
}: ConvitesTabProps) {
  const [subTab, setSubTab] = useState<"lista" | "novo">("lista");
  const [copiadoCode, setCopiadoCode] = useState<Record<string, string>>({});
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);

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



  const copiarTexto = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoCode((prev) => ({ ...prev, [chave]: "Copiado" }));
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
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
            Gestão de Convites
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
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
            className={`text-[0.72rem] font-sans tracking-[0.14em] uppercase px-3.5 py-2 rounded-[6px] font-semibold transition-all cursor-pointer ${
              subTab === "lista"
                ? "bg-[#261811] text-[#FAF7F2] shadow-sm"
                : "bg-white border border-[#D8CDC0] text-[#6B5A4D]"
            }`}
          >
            Lista ({listaConvites.length})
          </button>
          <button
            type="button"
            onClick={() => setModalPrazoAberto(true)}
            className="inline-flex items-center gap-1.5 text-[0.72rem] font-sans tracking-[0.14em] uppercase px-3.5 py-2 rounded-[6px] font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE3] border border-[#D8CDC0] hover:border-[#8C7A6B] text-[#543D30] hover:text-[#261811] transition-all cursor-pointer shadow-xs"
            title="Alterar prazo limite para confirmação de presença (RSVP)"
          >
            <span>📅 Prazo RSVP: {configEvento?.prazoRsvpFormatado || "Não definido"}</span>
            <span className="text-[0.60rem] bg-amber-100 text-amber-900 border border-amber-300 rounded px-1.5 py-0.5 font-bold">
              Alterar
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onNovoConviteClick?.();
              setSubTab("novo");
            }}
            className={`text-[0.72rem] font-sans tracking-[0.14em] uppercase px-3.5 py-2 rounded-[6px] font-semibold transition-all cursor-pointer ${
              subTab === "novo"
                ? "bg-[#261811] text-[#FAF7F2] shadow-sm"
                : "bg-white border border-[#D8CDC0] text-[#6B5A4D]"
            }`}
          >
            + Novo Convite
          </button>
        </div>
      </div>

      {feedbackGeral && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-sans rounded-[6px] flex justify-between items-center">
          <span>{feedbackGeral.msg}</span>
          <button type="button" onClick={onDismissFeedback} className="underline ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {subTab === "lista" ? (
        <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#EAE0D5]">
            <input
              type="text"
              value={buscaConvites}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Buscar família, membro ou código..."
              className="w-full sm:w-80 bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
            />
            <span className="text-xs font-sans text-[#8C7A6B]">
              {filteredConvites.length} {filteredConvites.length === 1 ? "convite" : "convites"} encontrados
            </span>
          </div>

          <div className="divide-y divide-[#EAE0D5]">
            {filteredConvites.map((c) => {
              const statusKey = (c.status || "PENDENTE").toUpperCase();
              const linkOficial = getLinkConviteCompleto(c.codigo);
              const linkRsvp = getLinkRsvpDireto(c.codigo);
              const copiadoConvite = copiadoCode[c.codigo];
              const copiadoRsvp = copiadoCode[`${c.codigo}-rsvp`];
              const copiadoCodigo = copiadoCode[`${c.codigo}-code`];

              return (
                <div key={c.id || c.codigo} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-serif text-lg font-medium text-[#261811] leading-tight">
                        {c.familia}
                      </h3>
                      {c.ehFornecedor && (
                        <span className="text-[0.62rem] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-xs">
                          🏢 Fornecedor
                        </span>
                      )}
                      <span
                        onClick={() => copiarTexto(c.codigo, `${c.codigo}-code`)}
                        className="font-mono text-xs font-bold text-[#261811] bg-[#FAF7F2] hover:bg-[#EAE0D5] px-2 py-0.5 rounded border border-[#D8CDC0] cursor-pointer"
                        title="Copiar código"
                      >
                        {copiadoCodigo || c.codigo}
                      </span>
                    </div>

                    <span
                      className={`self-start sm:self-auto text-[0.66rem] font-sans tracking-wider uppercase px-2.5 py-0.5 rounded-full font-semibold border ${
                        statusKey === "CONFIRMADO"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : statusKey === "RECUSADO"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {statusKey === "CONFIRMADO" ? "Confirmado" : statusKey === "RECUSADO" ? "Não vai" : "Pendente"}
                    </span>
                  </div>

                  {c.observacao && (
                    <p className="text-xs italic text-[#8C7A6B] font-serif bg-[#FAF7F2] px-2.5 py-1 rounded border-l-2 border-[#8C7A6B]">
                      "{c.observacao}"
                    </p>
                  )}

                  <p className="text-xs font-sans text-[#6B5A4D] leading-relaxed">
                    {c.telefone && <span>{c.telefone} · </span>}
                    <span className="text-[#8C7A6B]">Membros: </span>
                    {c.membros?.map((m, idx) => {
                      const papelMembro = m.papel || "Convidado";
                      return (
                        <span key={m.id || idx}>
                          {idx > 0 && ", "}
                          <strong className="text-[#261811] font-medium">{m.nome}</strong>
                          <span className="text-[#8C7A6B] font-semibold"> [{papelMembro}]</span>
                          {(isPapelCortejo(papelMembro, papeis) || m.participaCortejo) && (
                          <span className="inline-flex items-center gap-1 ml-1 align-baseline">
                            <span className="text-[0.60rem] font-sans uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">Cortejo</span>
                            {m.par ? (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-sans bg-amber-50 text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded font-medium shadow-xs">
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
                                className="text-[0.65rem] font-sans text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 px-1.5 py-0.5 rounded font-medium cursor-pointer transition-colors"
                                title="Definir par no cortejo (opcional - entra sozinho se não tiver par)"
                              >
                                + Definir Par
                              </button>
                            )}
                          </span>
                        )}
                        {m.confirmadoRsvp === true && (
                          <span className="text-emerald-800 font-semibold">
                            {c.ehFornecedor ? " (Fica até o fim 🍽️)" : " (Vai)"}
                          </span>
                        )}
                        {m.confirmadoRsvp === false && <span className="text-rose-800"> (Não vai)</span>}
                      </span>
                    );
                  })}
                  </p>

                  {/* Ações do Convite */}
                  {c.ehFornecedor ? (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 border-t border-[#F5EFE6]">
                      <button
                        type="button"
                        onClick={() => copiarTexto(getLinkFornecedor(c.fornecedorId || c.id || ""), c.codigo)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans text-[#543D30] hover:text-[#261811] bg-[#FAF7F2] hover:bg-[#EFE8DC] border border-[#D8CDC0] rounded-[6px] cursor-pointer min-h-[38px]"
                        title="Copiar link da credencial da equipe"
                      >
                        <span>{copiadoConvite || "🔗 Copiar Credencial"}</span>
                      </button>
                      {c.telefone && (
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppFornecedor(c.familia, c.fornecedorId || c.id || "", c.telefone)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[6px] cursor-pointer min-h-[38px]"
                          title="Enviar credencial da equipe no WhatsApp"
                        >
                          <span>💬 WhatsApp</span>
                        </button>
                      )}
                      {onNavegarParaFornecedores && (
                        <button
                          type="button"
                          onClick={() => onNavegarParaFornecedores(c.fornecedorId)}
                          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans text-[#261811] font-semibold bg-white hover:bg-[#FAF7F2] border border-[#D8CDC0] rounded-[6px] cursor-pointer min-h-[38px] transition-colors"
                          title="Gerenciar equipe, horários e membros na aba Fornecedores"
                        >
                          <span>🏢 Gerenciar na aba Fornecedores →</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 border-t border-[#F5EFE6]">
                      <button
                        type="button"
                        onClick={() => copiarTexto(linkOficial, c.codigo)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans text-[#543D30] hover:text-[#261811] bg-[#FAF7F2] hover:bg-[#EFE8DC] border border-[#D8CDC0] rounded-[6px] cursor-pointer min-h-[38px]"
                      >
                        <span>{copiadoConvite || "Copiar Link"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirWhatsAppConvite(c.familia, c.codigo, c.telefone)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-sans text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[6px] cursor-pointer min-h-[38px]"
                      >
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copiarTexto(linkRsvp, `${c.codigo}-rsvp`)}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-sans text-[#7D6B5D] hover:text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#E3D8CB] rounded-[6px] cursor-pointer min-h-[38px]"
                      >
                        <span>{copiadoRsvp || "Link RSVP"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onIniciarEdicao(c);
                          setSubTab("novo");
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-sans text-[#543D30] hover:text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#D8CDC0] rounded-[6px] cursor-pointer min-h-[38px]"
                      >
                        <span>Editar</span>
                      </button>
                      {(statusKey === "CONFIRMADO" || statusKey === "RECUSADO" || c.membros?.some(m => m.confirmadoRsvp !== undefined && m.confirmadoRsvp !== null)) && (
                        <button
                          type="button"
                          onClick={() => handleAbrirModalReset(c)}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-sans text-[#6B5A4D] hover:text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#D8CDC0] rounded-[6px] cursor-pointer min-h-[38px] transition-colors"
                          title="Resetar respostas deste convite e voltar para Pendente"
                        >
                          <span>↺ Resetar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onAbrirModalExclusao(c)}
                        className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-sans text-rose-700 hover:text-rose-900 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 rounded-[6px] cursor-pointer min-h-[38px]"
                      >
                        <span>Excluir</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={onSalvarConvite} className="space-y-6">
          {cadErro && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-[6px] text-xs font-sans text-rose-950">
              {cadErro}
            </div>
          )}

          {cadSucesso && (
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-[10px] space-y-3">
              <strong className="font-serif text-lg text-emerald-950 block">Convite salvo com sucesso!</strong>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={cadSucesso.link}
                  className="flex-1 bg-white border border-emerald-300 p-2 text-xs rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cadSucesso.link);
                    setCopiadoFeedback(true);
                    setTimeout(() => setCopiadoFeedback(false), 2000);
                  }}
                  className="bg-[#261811] text-white px-4 text-xs font-sans uppercase rounded font-semibold cursor-pointer"
                >
                  {copiadoFeedback ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
            <SectionTitle>Dados da Família / Convidado</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold mb-1">
                  Nome da Família ou Convidado Principal *
                </label>
                <input
                  type="text"
                  required
                  value={novoConvite.familia}
                  onChange={(e) => onNovoConviteChange((p) => ({ ...p, familia: e.target.value }))}
                  placeholder="Ex: Família Vasconcelos"
                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-[#261811] font-serif text-sm rounded-[6px] focus:outline-none focus:border-[#261811]"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={novoConvite.telefone}
                  onChange={(e) => onNovoConviteChange((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-[#261811] font-serif text-sm rounded-[6px] focus:outline-none focus:border-[#261811]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <SectionTitle>Participantes do Convite</SectionTitle>
                <p className="text-[0.72rem] font-sans text-[#8C7A6B] mt-0.5">
                  Cadastre as pessoas deste convite, definindo o papel no evento e a participação no cortejo.
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
                className="text-[0.68rem] font-sans tracking-[0.14em] uppercase px-3 py-1.5 border border-[#261811] text-[#261811] rounded-[6px] font-semibold cursor-pointer self-start sm:self-auto"
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
                    className="flex flex-col gap-2.5 p-3.5 rounded-[8px] border border-[#E8DFD5] bg-[#FAF7F2]/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
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
                        placeholder={novoConvite.membros.length > 1 ? `Nome do participante ${idx + 1} *` : "Nome do participante *"}
                        className="flex-1 bg-white border border-[#D8CDC0] px-3.5 py-2 text-[#261811] font-serif text-sm rounded-[6px] focus:outline-none focus:border-[#261811]"
                      />

                      <select
                        value={papelAtual}
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
                        className="bg-white border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811] min-w-[170px]"
                        title="Papel no Evento"
                      >
                        {listaPapeisDisponiveis.map((papelOpt) => (
                          <option key={papelOpt} value={papelOpt}>
                            {papelOpt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-start pt-1.5 border-t border-[#EAE0D5]/60 text-xs font-sans text-[#6B5A4D]">
                      <div className="flex flex-wrap items-center gap-3.5">
                        {ehCortejo && (
                          <span
                            className="inline-flex items-center gap-1.5 font-medium text-amber-900 bg-amber-50 border border-amber-300/80 px-2.5 py-1 rounded text-xs select-none shadow-xs"
                            title="Este papel já integra automaticamente o cortejo de honra da cerimônia"
                          >
                            <span>Integrante do Cortejo</span>
                          </span>
                        )}

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium text-[#543D30] hover:text-[#261811] px-2 py-1 rounded border border-transparent hover:border-[#D8CDC0] transition-colors">
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
                            className="accent-[#261811]"
                          />
                          <span>Criança (0 a 6 anos)</span>
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
                        className="text-rose-600 hover:text-rose-900 text-xs font-sans uppercase p-1 cursor-pointer ml-auto"
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
              className="px-5 py-3 border border-[#D8CDC0] text-[#6B5A4D] rounded-[6px] text-xs font-sans tracking-wider uppercase font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cadLoading}
              className="px-6 py-3 bg-[#261811] hover:bg-[#1A100B] text-white rounded-[6px] text-xs font-sans tracking-wider uppercase font-semibold cursor-pointer disabled:opacity-50 min-h-[46px]"
            >
              {cadLoading ? "Salvando..." : "Salvar Convite"}
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
