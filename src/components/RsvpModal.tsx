import React, { useState, useEffect } from "react";
import {
  enviarRsvpCasamento
} from "../services/api";
import type {
  AcompanhanteRequest
} from "../services/api";
import { buscarConvitePorCodigo } from "../services/convites";
import type { ConvitePreDefinido } from "../services/convites";
import QrCodePass from "./QrCodePass";

function WeddingCheckbox({
  checked,
  onChange,
  size = "md",
  ariaLabel
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const isSm = size === "sm";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="relative p-1 -m-1 flex items-center justify-center cursor-pointer focus:outline-none shrink-0"
    >
      <span
        className={`flex items-center justify-center transition-all duration-150 rounded-[4px] border ${
          isSm ? "w-[18px] h-[18px]" : "w-[22px] h-[22px]"
        } ${
          checked
            ? "bg-[#261811] border-[#261811] text-[#FAF7F2] shadow-xs"
            : "bg-[#FFFFFF] border-[#B8A89A] hover:border-[#261811]"
        }`}
      >
        {checked && (
          <svg
            className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2.5 6.5 5 9 9.5 3.5" />
          </svg>
        )}
      </span>
    </button>
  );
}

export default function RsvpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"guest" | "success">("guest");

  // Estado de Presença Geral (Sim = true / Não = false)
  const [presenca, setPresenca] = useState<boolean>(true);

  // Convite Pré-Definido (Nominal com lista oficial de membros)
  const [convitePreDefinido, setConvitePreDefinido] = useState<ConvitePreDefinido | null>(null);
  const [editandoResposta, setEditandoResposta] = useState(false);

  // Mapeamento de presença de cada membro: { [membroId]: boolean }
  const [membrosPresenca, setMembrosPresenca] = useState<Record<string, boolean>>({});

  // Dados de Contato e Mensagem
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacao, setObservacao] = useState("");

  // Feedback, Loading e Passe
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [passeInfo, setPasseInfo] = useState<any>(null);

  // Busca manual de convite (quando acessado sem ?convite= na URL)
  const [termoBuscaConvite, setTermoBuscaConvite] = useState("");
  const [buscandoConvite, setBuscandoConvite] = useState(false);
  const [erroConviteNaoEncontrado, setErroConviteNaoEncontrado] = useState("");

  const aplicarDadosDoConvite = (c: ConvitePreDefinido) => {
    // Garante que cada membro tenha identificador consistente
    const membrosSanitizados = (c.membros || []).map((m, idx) => ({
      ...m,
      id: m.id || `m_${idx}_${(m.nome || "").replace(/\s+/g, "_")}`
    }));
    const conviteFormatado: ConvitePreDefinido = { ...c, membros: membrosSanitizados };

    setConvitePreDefinido(conviteFormatado);
    setErroConviteNaoEncontrado("");
    setEditandoResposta(false);

    if (conviteFormatado.telefone) {
      // Aplica máscara se já vier telefone cadastrado
      let v = conviteFormatado.telefone.replace(/\D/g, "");
      if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      } else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
      }
      setTelefone(v || conviteFormatado.telefone);
    }

    // Inicializa todos os membros como confirmados (ou respeita se já vier com status individual)
    const mapP: Record<string, boolean> = {};
    membrosSanitizados.forEach(m => {
      mapP[m.id] = m.confirmadoRsvp !== false;
    });
    setMembrosPresenca(mapP);

    // Se já estava recusado no banco, sincroniza opção inicial
    if (conviteFormatado.status === "RECUSADO") {
      setPresenca(false);
    } else {
      setPresenca(true);
    }
  };

  const handleBuscarConviteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const termo = termoBuscaConvite.trim();
    if (!termo) return;

    setBuscandoConvite(true);
    setErroConviteNaoEncontrado("");

    const c = await buscarConvitePorCodigo(termo);
    setBuscandoConvite(false);

    if (c) {
      aplicarDadosDoConvite(c);
      setTermoBuscaConvite("");
    } else {
      setErroConviteNaoEncontrado(
        `Não encontramos convite com o código ou nome "${termo}". O RSVP deste casamento é restrito aos convidados da lista oficial. Por favor, verifique com os noivos.`
      );
    }
  };

  const handleAlterarConvite = () => {
    setConvitePreDefinido(null);
    setEditandoResposta(false);
    setErrorMsg("");
    setErroConviteNaoEncontrado("");
    // Limpa parâmetro de convite da URL mantendo #rsvp
    const url = new URL(window.location.href);
    url.searchParams.delete("convite");
    url.searchParams.delete("c");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash ? url.hash : ""));
  };

  // Listener de abertura de modal e parâmetros de URL
  useEffect(() => {
    const checkUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const isParamAdmin = params.get("admin") === "true";
      const isHashAdmin = window.location.hash.includes("admin=true");

      if (isParamAdmin || isHashAdmin) {
        setIsOpen(false);
        return;
      }

      // Verifica se há convite nominal pré-definido via ?convite=codigo ou ?c=codigo
      const cod = params.get("convite") || params.get("c");
      if (cod) {
        buscarConvitePorCodigo(cod).then((c) => {
          if (c) {
            aplicarDadosDoConvite(c);
          }
        });
      }

      // Abre direto o formulário se tiver ?rsvp=true ou #rsvp
      const hasRsvp = params.get("rsvp") === "true" || window.location.hash.includes("rsvp");
      if (hasRsvp) {
        setIsOpen(true);
        setMode("guest");
        document.body.style.overflow = "hidden";
      } else if (!isParamAdmin && !isHashAdmin) {
        setIsOpen(false);
        document.body.style.overflow = "";
      }
    };

    checkUrlParams();
    window.addEventListener("popstate", checkUrlParams);

    const handleOpen = () => {
      setIsOpen(true);
      setMode("guest");
      setErrorMsg("");
      document.body.style.overflow = "hidden";
      if (!window.location.hash.includes("rsvp")) {
        window.history.pushState({ rsvp: true }, "", "#rsvp");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    window.addEventListener("open-rsvp-modal", handleOpen);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-rsvp-modal", handleOpen);
      window.removeEventListener("popstate", checkUrlParams);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";

    if (window.location.hash.includes("rsvp")) {
      if (window.history.state && window.history.state.rsvp) {
        window.history.back();
      } else {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }

    const url = new URL(window.location.href);
    if (url.searchParams.has("admin") || url.searchParams.has("rsvp")) {
      url.searchParams.delete("admin");
      url.searchParams.delete("rsvp");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }

    setTimeout(() => {
      setMode("guest");
      setErrorMsg("");
      setEditandoResposta(false);
    }, 300);
  };

  // Máscara de telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (v.length > 0) {
      v = v.replace(/^(\d{0,2})/, "($1");
    }
    setTelefone(v);
  };

  // Abre visualização do passe digital já existente
  const abrirPasseDigitalExistente = () => {
    if (!convitePreDefinido) return;
    const titular = convitePreDefinido.membros.find(m => m.titular) || convitePreDefinido.membros[0];
    const confirmados = convitePreDefinido.membros.filter(m => m.confirmadoRsvp !== false);
    const nomes = confirmados.map(m => m.nome);
    const crCount = confirmados.filter(m => !!m.criancaAte6Anos).length;
    const adCount = (nomes.length || 1) - crCount;

    setPasseInfo({
      convidado: convitePreDefinido.familia || titular?.nome || "Convidado",
      telefone: convitePreDefinido.telefone || telefone,
      totalPessoas: nomes.length > 0 ? nomes.length : 1,
      adultos: adCount > 0 ? adCount : 1,
      criancasAte6Anos: crCount,
      membrosConfirmados: nomes.length > 0 ? nomes : [convitePreDefinido.familia],
      tokenOuId: convitePreDefinido.codigo
    });
    setMode("success");
  };

  // Submissão da confirmação de presença
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!convitePreDefinido) {
      setErrorMsg("Nenhum convite selecionado. Por favor, localize seu convite primeiro.");
      return;
    }

    if (!telefone.trim() || telefone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Por favor, informe um WhatsApp / celular válido com DDD.");
      return;
    }

    const membrosConfirmados = convitePreDefinido.membros.filter(m => !!membrosPresenca[m.id]);

    if (presenca && membrosConfirmados.length === 0) {
      setErrorMsg("Por favor, selecione ao menos uma pessoa da família que estará presente.");
      return;
    }

    setLoading(true);

    try {
      const titularPadrao = convitePreDefinido.membros.find(m => m.titular) || convitePreDefinido.membros[0];
      const titularEscolhido = presenca
        ? (convitePreDefinido.membros.find(m => m.titular && !!membrosPresenca[m.id]) || membrosConfirmados[0])
        : titularPadrao;

      const acompanhantesEnvio: AcompanhanteRequest[] = presenca
        ? membrosConfirmados
            .filter(m => m.id !== titularEscolhido.id && m.nome.trim().toLowerCase() !== titularEscolhido.nome.trim().toLowerCase())
            .map(m => ({
              nome: m.nome.trim(),
              criancaAte6Anos: Boolean(m.criancaAte6Anos)
            }))
        : convitePreDefinido.membros
            .filter(m => m.id !== titularEscolhido.id && m.nome.trim().toLowerCase() !== titularEscolhido.nome.trim().toLowerCase())
            .map(m => ({
              nome: m.nome.trim(),
              criancaAte6Anos: Boolean(m.criancaAte6Anos)
            }));

      const payload = {
        nome: titularEscolhido.nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || undefined,
        presenca,
        acompanhantes: acompanhantesEnvio,
        observacao: observacao.trim() || undefined,
        codigoConvite: convitePreDefinido.codigo
      };

      const response = await enviarRsvpCasamento(payload);
      setSuccessData(response);

      if (presenca) {
        const nomesConfirmadosPasse = [titularEscolhido.nome, ...acompanhantesEnvio.map(a => a.nome)];
        const criancasTotal = membrosConfirmados.filter(m => !!m.criancaAte6Anos).length;
        const adultosTotal = membrosConfirmados.length - criancasTotal;

        setPasseInfo({
          convidado: convitePreDefinido.familia,
          telefone: telefone.trim(),
          totalPessoas: response.resumo?.totalPessoas || membrosConfirmados.length,
          adultos: response.resumo?.adultos || adultosTotal,
          criancasAte6Anos: response.resumo?.criancasAte6Anos || criancasTotal,
          membrosConfirmados: nomesConfirmadosPasse,
          tokenOuId: convitePreDefinido.codigo
        });
      } else {
        setPasseInfo(null);
      }

      // Atualiza o status local do convite para refletir a nova confirmação
      setConvitePreDefinido(prev => prev ? {
        ...prev,
        status: presenca ? "CONFIRMADO" : "RECUSADO",
        telefone: telefone.trim(),
        membros: prev.membros.map(m => ({
          ...m,
          confirmadoRsvp: presenca ? !!membrosPresenca[m.id] : false
        }))
      } : null);

      setEditandoResposta(false);
      setMode("success");
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("servidor") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("status 5") ||
        msg.includes("fetch")
      ) {
        setErrorMsg("Não foi possível carregar algumas informações. Tente novamente em instantes.");
      } else {
        setErrorMsg(msg || "Não foi possível registrar sua confirmação no momento. Por favor, tente novamente em instantes.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Cálculos dinâmicos da seleção atual de membros
  const membrosConfirmadosAtualmente = convitePreDefinido
    ? convitePreDefinido.membros.filter(m => !!membrosPresenca[m.id])
    : [];
  const totalConfirmados = membrosConfirmadosAtualmente.length;
  const criancasConfirmadas = membrosConfirmadosAtualmente.filter(m => !!m.criancaAte6Anos).length;
  const adultosConfirmados = totalConfirmados - criancasConfirmadas;

  // Identificação do titular oficial (informativo)
  const titularOficial = convitePreDefinido?.membros.find(m => m.titular) || convitePreDefinido?.membros[0];

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden bg-[#FAF7F2] text-[#261811] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmação de Presença"
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BARRA SUPERIOR FIXA (Header de Navegação)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFD5] px-4 sm:px-8 py-3.5 transition-all shadow-xs">
        <div className="max-w-[680px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center gap-2 text-xs font-sans tracking-[0.14em] uppercase text-[#6B5A4D] hover:text-[#261811] transition-colors py-1.5 px-2.5 rounded-[6px] hover:bg-[#EFE9DD] cursor-pointer font-medium"
          >
            <span className="text-base leading-none">←</span>
            <span>Voltar ao Convite</span>
          </button>

          <span className="font-serif italic text-sm text-[#8C7A6B] hidden sm:block">
            Tainara &amp; Thiago · 24.01.2027
          </span>

          <button
            type="button"
            onClick={close}
            className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.12em] uppercase text-[#8C7A6B] hover:text-[#261811] p-1.5 rounded-[6px] hover:bg-[#EFE9DD] transition-colors cursor-pointer"
            aria-label="Fechar confirmação de presença"
          >
            <span className="hidden sm:inline text-[0.72rem]">Fechar</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONTEÚDO PRINCIPAL (Mobile-First, Elegante e Espaçoso)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="max-w-[680px] mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
        <div className="bg-[#FFFFFF] border border-[#E8DFD5] shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] p-5 sm:p-9 md:p-10 rounded-[12px] text-[#261811] w-full">

          {/* 1. CABEÇALHO */}
          <div className="text-center sm:text-left border-b border-[#EAE0D5] pb-5 mb-6">
            <span className="font-sans text-[0.68rem] tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold block mb-1">
              R.S.V.P.
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light tracking-[-0.01em]">
              Confirmação de presença
            </h1>
            <p className="font-serif italic text-xs sm:text-sm text-[#6B5A4D] leading-relaxed mt-1.5 max-w-[540px]">
              Será uma alegria celebrar este momento com vocês. Por favor, confirme a presença da sua família.
            </p>
          </div>

          {/* ========================================================= */}
          {/* MODO GUEST: FLUXO DE CONFIRMAÇÃO OU CONSULTA              */}
          {/* ========================================================= */}
          {mode === "guest" && (
            <div>
              {/* CASO A: CONVITE NÃO LOCALIZADO (Busca de Convite) */}
              {!convitePreDefinido ? (
                <div className="space-y-4 py-2">
                  <div className="bg-[#FAF7F2] border border-[#E8DFD5] p-5 sm:p-6 text-left rounded-[10px] space-y-3">
                    <span className="font-sans text-[0.65rem] tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold block">
                      Lista Oficial
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-light text-[#261811]">
                      Localize o seu Convite
                    </h3>
                    <p className="font-serif italic text-xs sm:text-sm text-[#6B5A4D] leading-relaxed">
                      A confirmação de presença é restrita aos convidados da lista oficial dos noivos.
                      Por favor, informe o código do seu convite ou o sobrenome da sua família:
                    </p>

                    <form onSubmit={handleBuscarConviteManual} className="pt-1.5 space-y-2.5">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          required
                          value={termoBuscaConvite}
                          onChange={(e) => setTermoBuscaConvite(e.target.value)}
                          placeholder="Ex: fulana, silva, vasconcelos"
                          className="flex-1 bg-[#FFFFFF] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-base placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#261811] rounded-[8px] transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={buscandoConvite}
                          className="bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] px-6 py-3 font-sans text-xs tracking-[0.16em] uppercase font-semibold transition-all rounded-[8px] cursor-pointer disabled:opacity-50 min-h-[48px]"
                        >
                          {buscandoConvite ? "Buscando..." : "Localizar"}
                        </button>
                      </div>
                    </form>

                    {erroConviteNaoEncontrado && (
                      <div className="p-3.5 bg-[#FFFFFF] border border-[#D8CDC0] text-xs sm:text-sm text-[#543D30] font-serif rounded-[8px] leading-relaxed mt-2">
                        {erroConviteNaoEncontrado}
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <p className="font-serif italic text-xs text-[#8C7A6B]">
                      Dúvidas ou não localizou seu convite? Entre em contato diretamente com os noivos.
                    </p>
                  </div>
                </div>
              ) : (
                /* CASO B: CONVITE CARREGADO */
                <div className="space-y-6 sm:space-y-7">

                  {/* 2. IDENTIFICAÇÃO DO CONVITE (Somente informativo - NÃO é editável) */}
                  <div className="bg-[#FAF7F2] border border-[#E8DFD5] rounded-[10px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <span className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold">
                        Convite de
                      </span>
                      <h2 className="font-serif text-xl sm:text-2xl text-[#261811] font-light tracking-[-0.01em]">
                        {convitePreDefinido.familia}
                      </h2>
                      {titularOficial && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="font-sans text-[0.65rem] tracking-[0.14em] uppercase text-[#8C7A6B] font-medium">
                            Titular:
                          </span>
                          <span className="font-serif text-sm sm:text-[0.92rem] text-[#453126] font-medium">
                            {titularOficial.nome}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAlterarConvite}
                      className="inline-flex items-center gap-1.5 self-start sm:self-center text-xs font-sans tracking-[0.12em] uppercase text-[#6B5A4D] hover:text-[#261811] font-medium transition-colors border border-[#D8CDC0] hover:border-[#8C7A6B] px-3 py-1.5 rounded-[6px] bg-[#FFFFFF] hover:bg-[#F5EFE6] cursor-pointer"
                      title="Trocar para outro convite da lista"
                    >
                      <svg className="w-3.5 h-3.5 text-[#8C7A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>Alterar convite</span>
                    </button>
                  </div>

                  {/* 11. ESTADO DE PRESENÇA CONFIRMADA */}
                  {/* Quando confirmado e não estiver editando, NÃO exibe a pergunta "Vocês irão?" para evitar conflito */}
                  {convitePreDefinido.status === "CONFIRMADO" && !editandoResposta ? (
                    <div className="space-y-5 text-left">
                      {/* Card de Presença Confirmada */}
                      <div className="p-5 sm:p-6 bg-[#F4F9F5] border border-[#C2DFCE] rounded-[10px] space-y-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-[#1E6B37] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                            ✓
                          </span>
                          <h3 className="font-serif text-xl sm:text-2xl text-[#1E6B37] font-medium">
                            Presença confirmada ✓
                          </h3>
                        </div>

                        <p className="font-serif text-sm sm:text-base text-[#264A31] leading-relaxed">
                          Este convite já está confirmado na lista oficial do casamento.
                        </p>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={abrirPasseDigitalExistente}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1E6B37] hover:bg-[#16532A] text-white rounded-[8px] text-xs sm:text-sm font-sans tracking-[0.14em] uppercase font-semibold transition-all shadow-xs cursor-pointer min-h-[48px]"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            <span>Ver Passe Digital (QR Code)</span>
                          </button>
                        </div>
                      </div>

                      {/* Ações Elegantes e Claras: Alterar Resposta vs Alterar Convite */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-4 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[8px] space-y-2">
                          <span className="block font-sans text-[0.66rem] tracking-[0.16em] uppercase text-[#8C7A6B] font-semibold">
                            Modificar confirmação
                          </span>
                          <p className="font-serif italic text-xs text-[#786455]">
                            Deseja atualizar quais membros da família irão ao casamento?
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditandoResposta(true)}
                            className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#FFFFFF] hover:bg-[#F2ECE3] border border-[#D8CDC0] hover:border-[#8C7A6B] text-[#261811] text-xs font-sans tracking-[0.12em] uppercase font-semibold rounded-[6px] transition-colors cursor-pointer min-h-[42px]"
                          >
                            <span>Alterar resposta</span>
                          </button>
                        </div>

                        <div className="p-4 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[8px] space-y-2">
                          <span className="block font-sans text-[0.66rem] tracking-[0.16em] uppercase text-[#8C7A6B] font-semibold">
                            Outro convite
                          </span>
                          <p className="font-serif italic text-xs text-[#786455]">
                            Deseja acessar ou localizar o convite de outra pessoa?
                          </p>
                          <button
                            type="button"
                            onClick={handleAlterarConvite}
                            className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#FFFFFF] hover:bg-[#F2ECE3] border border-[#D8CDC0] hover:border-[#8C7A6B] text-[#6B5A4D] hover:text-[#261811] text-xs font-sans tracking-[0.12em] uppercase font-medium rounded-[6px] transition-colors cursor-pointer min-h-[42px]"
                          >
                            <span>Alterar convite</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* FORMULÁRIO COMPLETO DE CONFIRMAÇÃO / EDIÇÃO */
                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">

                      {/* Banner Informativo quando em modo de edição de resposta */}
                      {editandoResposta && (
                        <div className="p-3.5 bg-[#FAF7F2] border border-[#D8CDC0] rounded-[8px] flex items-center justify-between gap-3 text-left">
                          <span className="font-serif text-xs sm:text-sm text-[#6B5A4D]">
                            Modificando resposta de presença deste convite.
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditandoResposta(false)}
                            className="text-xs font-sans tracking-wider uppercase text-[#8C7A6B] hover:text-[#261811] underline cursor-pointer shrink-0 font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="bg-[#FAF7F2] border-l-2 border-[#A85848] py-3 px-4 text-xs sm:text-sm text-[#543D30] font-serif flex items-start gap-2.5 rounded-[6px] text-left">
                          <span className="text-[#A85848] text-base leading-none select-none">✦</span>
                          <span className="leading-snug">{errorMsg}</span>
                        </div>
                      )}

                      {/* 3. PERGUNTA PRINCIPAL (Duas opções visualmente equivalentes e refinadas) */}
                      <div className="space-y-2.5 text-left">
                        <label className="block font-serif text-lg sm:text-xl text-[#261811] font-normal">
                          Vocês irão ao casamento?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPresenca(true)}
                            className={`min-h-[52px] py-3.5 px-4 text-center transition-all duration-200 text-sm sm:text-base font-serif rounded-[8px] cursor-pointer flex items-center justify-center gap-2.5 ${
                              presenca
                                ? "border-2 border-[#261811] bg-[#261811] text-[#FAF7F2] shadow-xs font-medium"
                                : "border border-[#D8CDC0] bg-[#FFFFFF] text-[#6B5A4D] hover:border-[#8C7A6B] hover:text-[#261811] hover:bg-[#FAF7F2]"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              presenca ? "border-[#FAF7F2] bg-[#FAF7F2]" : "border-[#8C7A6B]"
                            }`}>
                              {presenca && <span className="w-2 h-2 rounded-full bg-[#261811]" />}
                            </span>
                            <span>Sim, estaremos presentes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPresenca(false)}
                            className={`min-h-[52px] py-3.5 px-4 text-center transition-all duration-200 text-sm sm:text-base font-serif rounded-[8px] cursor-pointer flex items-center justify-center gap-2.5 ${
                              !presenca
                                ? "border-2 border-[#261811] bg-[#261811] text-[#FAF7F2] shadow-xs font-medium"
                                : "border border-[#D8CDC0] bg-[#FFFFFF] text-[#6B5A4D] hover:border-[#8C7A6B] hover:text-[#261811] hover:bg-[#FAF7F2]"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              !presenca ? "border-[#FAF7F2] bg-[#FAF7F2]" : "border-[#8C7A6B]"
                            }`}>
                              {!presenca && <span className="w-2 h-2 rounded-full bg-[#261811]" />}
                            </span>
                            <span>Não poderemos comparecer</span>
                          </button>
                        </div>
                      </div>

                      {/* 4. LISTA DE CONVIDADOS (Aparece somente quando "Sim, estaremos presentes") */}
                      {presenca && (
                        <div className="space-y-3.5 text-left pt-1">
                          <div>
                            <h4 className="font-serif text-lg sm:text-xl text-[#261811] font-normal">
                              Quem estará presente?
                            </h4>
                            <p className="font-serif italic text-xs sm:text-sm text-[#786455] mt-0.5">
                              Selecione cada pessoa da família que participará da cerimônia:
                            </p>
                          </div>

                          <div className="space-y-2.5">
                            {convitePreDefinido.membros.map((m) => {
                              const isSelected = !!membrosPresenca[m.id];

                              return (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    setMembrosPresenca(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                  }}
                                  className={`p-4 rounded-[8px] border transition-all duration-150 cursor-pointer select-none text-left flex items-start justify-between gap-3.5 ${
                                    isSelected
                                      ? "bg-[#FAF7F2] border-[#261811]/40 shadow-xs ring-1 ring-[#261811]/10"
                                      : "bg-[#FFFFFF] border-[#E8DFD5] opacity-75 hover:opacity-100 hover:border-[#D8CDC0]"
                                  }`}
                                >
                                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                    {/* ÚNICO controle de seleção por pessoa */}
                                    <div className="pt-0.5 shrink-0">
                                      <WeddingCheckbox
                                        checked={isSelected}
                                        onChange={(checked) => setMembrosPresenca(prev => ({ ...prev, [m.id]: checked }))}
                                        ariaLabel={`Confirmar presença de ${m.nome}`}
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="font-serif text-[1.02rem] sm:text-[1.08rem] text-[#261811] font-medium leading-snug break-words">
                                        {m.nome}
                                      </p>

                                      {m.titular && (
                                        <span className="inline-block text-[0.62rem] font-sans tracking-[0.14em] uppercase font-semibold text-[#8C7A6B] bg-[#F0EAE1] px-1.5 py-0.5 rounded-[3px] border border-[#E0D5C7] mt-0.5">
                                          Titular
                                        </span>
                                      )}

                                      {/* 5. REGRA OBRIGATÓRIA PARA CRIANÇAS */}
                                      {/* Identificação informativa discreta - Não editável e com os textos exatos solicitados */}
                                      {m.criancaAte6Anos && (
                                        <div className="mt-2 space-y-0.5">
                                          <span className="inline-block text-[0.62rem] font-sans tracking-[0.16em] uppercase font-semibold text-[#8A6A4E] bg-[#F4EDE4] px-2 py-0.5 rounded-[4px] border border-[#E5DACD]">
                                            CRIANÇA INDICADA
                                          </span>
                                          <p className="text-[0.76rem] sm:text-[0.8rem] font-serif text-[#786455] italic">
                                            Criança menor de 7 anos (0 a 6 anos)
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Badge discreta de feedback */}
                                  <span
                                    className={`text-[0.68rem] sm:text-[0.72rem] font-sans shrink-0 uppercase tracking-wider px-2.5 py-1 rounded-[6px] font-medium transition-colors ${
                                      isSelected
                                        ? "bg-[#EBF5EE] text-[#1E6B37] border border-[#C2DFCE]"
                                        : "bg-[#F3EFE9] text-[#8C7A6B] border border-[#E5DACD]"
                                    }`}
                                  >
                                    {isSelected ? "Confirmado" : "Não irá"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* 6. RESUMO DOS CONVIDADOS (Feedback imediato com singular e plural) */}
                          <div className="p-3.5 sm:p-4 bg-[#F8F5F0] border border-[#E2D7CB] rounded-[8px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-left">
                            <div>
                              <span className="font-serif text-base sm:text-[1.02rem] text-[#261811] font-medium block">
                                {totalConfirmados === 0
                                  ? "Nenhum convidado selecionado"
                                  : totalConfirmados === 1
                                  ? "1 pessoa confirmada"
                                  : `${totalConfirmados} pessoas confirmadas`}
                              </span>
                              {totalConfirmados === 0 && (
                                <span className="text-xs font-serif italic text-[#8C7A6B]">
                                  Selecione ao menos um membro para confirmar presença.
                                </span>
                              )}
                            </div>

                            {totalConfirmados > 0 && (
                              <div className="font-serif italic text-xs sm:text-[0.88rem] text-[#786455]">
                                <span>
                                  {adultosConfirmados === 1 ? "1 adulto" : `${adultosConfirmados} adultos`}
                                </span>
                                {criancasConfirmadas > 0 && (
                                  <span>
                                    {" · "}
                                    {criancasConfirmadas === 1 ? "1 criança" : `${criancasConfirmadas} crianças`}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mensagem afetuosa quando "Não poderemos comparecer" */}
                      {!presenca && (
                        <div className="p-5 sm:p-6 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[10px] text-left space-y-2.5">
                          <span className="font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold block">
                            Sentiremos muito a falta de vocês
                          </span>
                          <p className="font-serif text-sm sm:text-base text-[#453126] leading-relaxed">
                            Ficamos com o coração apertado por não podermos celebrar este momento tão sonhado juntos. A presença da sua família com certeza fará muita falta na celebração.
                          </p>
                          <p className="font-serif italic text-xs sm:text-sm text-[#786455] leading-relaxed">
                            Agradecemos de coração por nos avisar com antecedência. Caso algo mude e vocês consigam comparecer, saibam que poderão retornar a este mesmo link e atualizar sua resposta a qualquer momento até o fechamento da lista!
                          </p>
                        </div>
                      )}

                      {/* 7. CONTATO (WhatsApp em destaque + E-mail opcional) */}
                      <div className="space-y-3.5 text-left pt-1">
                        <div className="border-b border-[#EAE0D5] pb-1.5">
                          <h4 className="font-serif text-lg sm:text-xl text-[#261811] font-normal">
                            Contato
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {/* WhatsApp / celular com maior destaque visual */}
                          <div>
                            <label htmlFor="rsvp-telefone" className="block font-sans text-[0.68rem] tracking-[0.16em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                              WhatsApp / celular *
                            </label>
                            <input
                              id="rsvp-telefone"
                              type="tel"
                              required
                              value={telefone}
                              onChange={handleTelefoneChange}
                              placeholder="(11) 98888-7777"
                              className="w-full bg-[#FFFFFF] border-2 border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-[1rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#261811] focus:bg-[#FFFFFF] transition-all rounded-[8px] shadow-xs"
                            />
                            <span className="block text-[0.74rem] sm:text-[0.78rem] font-serif italic text-[#786455] mt-1.5">
                              Usaremos este número apenas para comunicações sobre o casamento.
                            </span>
                          </div>

                          {/* E-mail discretamente indicado como opcional */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <label htmlFor="rsvp-email" className="font-sans text-[0.66rem] tracking-[0.14em] uppercase text-[#8C7A6B] font-medium">
                                E-mail
                              </label>
                              <span className="font-serif italic text-[0.76rem] text-[#8C7A6B]">
                                (opcional)
                              </span>
                            </div>
                            <input
                              id="rsvp-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="exemplo@email.com"
                              className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-2.5 text-[#261811] font-serif text-[0.94rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] transition-all rounded-[8px]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 8. MENSAGEM PARA OS NOIVOS (Secundária e discreta) */}
                      <div className="space-y-2 text-left pt-1">
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="rsvp-obs" className="font-serif text-base sm:text-lg text-[#261811] font-normal">
                            Mensagem para os noivos
                          </label>
                          <span className="font-serif italic text-xs sm:text-sm text-[#8C7A6B]">
                            (opcional)
                          </span>
                        </div>
                        <textarea
                          id="rsvp-obs"
                          rows={2}
                          maxLength={500}
                          value={observacao}
                          onChange={(e) => setObservacao(e.target.value)}
                          placeholder="Gostaria de deixar uma mensagem para os noivos..."
                          className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-2.5 text-[#261811] font-serif text-[0.94rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] transition-all resize-none rounded-[8px]"
                        />
                      </div>

                      {/* 9. BOTÃO PRINCIPAL (Dinâmico, refinado e confortável para toque no celular) */}
                      <div className="pt-2 pb-1">
                        <button
                          type="submit"
                          disabled={loading || (presenca && totalConfirmados === 0)}
                          className="w-full min-h-[52px] py-4 px-6 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-xs sm:text-[0.82rem] tracking-[0.2em] uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-[8px] shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <span>Enviando confirmação...</span>
                          ) : presenca ? (
                            totalConfirmados === 0 ? (
                              <span>SELECIONE OS CONVIDADOS</span>
                            ) : (
                              <span>
                                CONFIRMAR {totalConfirmados} {totalConfirmados === 1 ? "PRESENÇA" : "PRESENÇAS"}
                              </span>
                            )
                          ) : (
                            <span>CONFIRMAR AUSÊNCIA</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODO SUCCESS: PASSE DIGITAL COM QR CODE OU AGRADECIMENTO  */}
          {/* ========================================================= */}
          {mode === "success" && (
            <div className="py-2 text-center space-y-4 animate-fade-in overflow-y-auto max-h-[82dvh] pr-1">
              {passeInfo ? (
                <QrCodePass
                  convidado={passeInfo.convidado}
                  telefone={passeInfo.telefone}
                  totalPessoas={passeInfo.totalPessoas}
                  adultos={passeInfo.adultos}
                  criancasAte6Anos={passeInfo.criancasAte6Anos}
                  membrosConfirmados={passeInfo.membrosConfirmados}
                  tokenOuId={passeInfo.tokenOuId}
                  onClose={close}
                />
              ) : (
                <div className="py-8 sm:py-10 px-4 text-center space-y-5 max-w-[480px] mx-auto animate-fade-in">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF7F2] border border-[#E8DFD5] flex items-center justify-center text-[#8C7A6B] text-xl shadow-xs">
                    ✦
                  </div>

                  <div className="space-y-2">
                    <span className="font-sans text-[0.66rem] tracking-[0.2em] uppercase text-[#8C7A6B] font-semibold block">
                      Resposta Registrada
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
                      Sentiremos muito a falta de vocês
                    </h3>
                  </div>

                  <div className="space-y-3 font-serif text-sm sm:text-base text-[#453126] leading-relaxed">
                    <p>
                      Ficamos tristes por não podermos contar com a presença de vocês neste dia tão importante e especial das nossas vidas. A presença da sua família com certeza fará muita falta na celebração.
                    </p>
                    <p className="italic text-[#786455] text-xs sm:text-sm">
                      Sabemos que, mesmo à distância, o carinho e as boas energias de vocês estarão com a gente no altar.
                    </p>
                    <p className="text-xs text-[#8C7A6B] pt-2">
                      Caso seus planos mudem e vocês consigam comparecer, saibam que poderão atualizar sua resposta a qualquer momento por este mesmo link antes do fechamento da lista oficial!
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("guest");
                        setPresenca(true);
                        setEditandoResposta(true);
                      }}
                      className="w-full sm:w-auto py-3 px-6 bg-[#FFFFFF] hover:bg-[#F5EFE6] border border-[#D8CDC0] hover:border-[#8C7A6B] text-[#261811] font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[8px] transition-colors min-h-[46px] cursor-pointer"
                    >
                      Alterar Resposta
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="w-full sm:w-auto py-3 px-8 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-xs tracking-[0.18em] uppercase font-semibold rounded-[8px] transition-colors min-h-[46px] cursor-pointer"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé Interno com Identificação */}
          <div className="mt-8 pt-6 border-t border-[#EAE0D5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-serif text-[#8C7A6B]">
            <span>Tainara &amp; Thiago · Espaço Balboa</span>
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.14em] uppercase font-semibold text-[#261811] hover:text-[#543D30] underline cursor-pointer"
            >
              <span>← Voltar para a página anterior</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
