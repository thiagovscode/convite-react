import React, { useState, useEffect } from "react";
import {
  enviarRsvpCasamento,
  getApiBaseUrl
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
      className="relative p-1.5 -m-1.5 flex items-center justify-center cursor-pointer focus:outline-none shrink-0"
    >
      <span
        className={`flex items-center justify-center transition-all duration-150 rounded-[3px] border ${
          isSm ? "w-[18px] h-[18px]" : "w-[20px] h-[20px]"
        } ${
          checked
            ? "bg-[#261811] border-[#261811] text-[#FAF7F2]"
            : "bg-[#FAF7F2] border-[#8C7A6B] hover:border-[#261811]"
        }`}
      >
        {checked && (
          <svg
            className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
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

  // Form State
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [presenca, setPresenca] = useState<boolean>(true);
  const [acompanhantes, setAcompanhantes] = useState<AcompanhanteRequest[]>([]);
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<any>(null);

  // Convite Pré-Definido (Nominal com lista de membros autorizados)
  const [codigoConviteUrl, setCodigoConviteUrl] = useState("");
  const [convitePreDefinido, setConvitePreDefinido] = useState<ConvitePreDefinido | null>(null);
  const [membrosPresenca, setMembrosPresenca] = useState<Record<string, boolean>>({});
  const [membrosCrianca, setMembrosCrianca] = useState<Record<string, boolean>>({});
  const [passeInfo, setPasseInfo] = useState<any>(null);

  // Localização manual de convite caso acesse sem o parâmetro na URL
  const [termoBuscaConvite, setTermoBuscaConvite] = useState("");
  const [buscandoConvite, setBuscandoConvite] = useState(false);
  const [erroConviteNaoEncontrado, setErroConviteNaoEncontrado] = useState("");

  const aplicarDadosDoConvite = (c: ConvitePreDefinido) => {
    setConvitePreDefinido(c);
    setCodigoConviteUrl(c.codigo);
    setErroConviteNaoEncontrado("");

    const titular = c.membros.find(m => m.titular) || c.membros[0];
    if (titular) setNome(titular.nome);
    if (c.telefone) setTelefone(c.telefone);

    const mapP: Record<string, boolean> = {};
    const mapC: Record<string, boolean> = {};

    c.membros.forEach(m => {
      mapP[m.id] = true;
      mapC[m.id] = !!m.criancaAte6Anos;
    });

    setMembrosPresenca(mapP);
    setMembrosCrianca(mapC);

    const outros = c.membros.filter(m => m.id !== titular?.id);
    setAcompanhantes(outros.map(m => ({
      nome: m.nome,
      criancaAte6Anos: Boolean(m.criancaAte6Anos)
    })));
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
      setErroConviteNaoEncontrado(`Não encontramos convite com o código ou nome "${termo}". O RSVP deste casamento é restrito aos convidados da lista oficial. Por favor, verifique com os noivos.`);
    }
  };

  // Acesso exclusivo do noivo via URL com ?admin=true ou #admin=true
  useEffect(() => {
    const checkUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const isParamAdmin = params.get("admin") === "true";
      const isHashAdmin = window.location.hash.includes("admin=true");

      if (isParamAdmin || isHashAdmin) {
        setIsOpen(false);
        return;
      }

      // 2. Verifica se há convite nominal pré-definido via ?convite=codigo ou ?c=codigo
      const cod = params.get("convite") || params.get("c");
      if (cod) {
        setCodigoConviteUrl(cod);
        buscarConvitePorCodigo(cod).then((c) => {
          if (c) {
            aplicarDadosDoConvite(c);
          }
        });
      }

      // 3. Abre direto o formulário se tiver ?rsvp=true ou #rsvp
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

    // Se estiver com #rsvp no histórico, volta no navegador
    if (window.location.hash.includes("rsvp")) {
      if (window.history.state && window.history.state.rsvp) {
        window.history.back();
      } else {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }

    // Remove ?admin=true ou ?rsvp=true da URL
    const url = new URL(window.location.href);
    if (url.searchParams.has("admin") || url.searchParams.has("rsvp")) {
      url.searchParams.delete("admin");
      url.searchParams.delete("rsvp");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }

    setTimeout(() => {
      setMode("guest");
      setErrorMsg("");
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

  const addAcompanhante = () => {
    setAcompanhantes([...acompanhantes, { nome: "", criancaAte6Anos: false }]);
  };

  const removeAcompanhante = (index: number) => {
    setAcompanhantes(acompanhantes.filter((_, i) => i !== index));
  };

  const updateAcompanhante = (index: number, field: keyof AcompanhanteRequest, value: any) => {
    const updated = [...acompanhantes];
    updated[index] = { ...updated[index], [field]: value };
    setAcompanhantes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nome.trim()) {
      setErrorMsg("Por favor, preencha o seu nome completo.");
      return;
    }
    if (!telefone.trim() || telefone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Por favor, informe um telefone válido com DDD.");
      return;
    }

    if (presenca) {
      for (let i = 0; i < acompanhantes.length; i++) {
        if (!acompanhantes[i].nome.trim()) {
          setErrorMsg(`Por favor, preencha o nome do acompanhante ${i + 1}.`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Se for convite pré-definido, filtra apenas os membros com presença marcada
      let listaAcompanhantesEnvio: AcompanhanteRequest[] = [];
      let nomesConfirmadosParaPasse: string[] = [nome.trim()];

      if (convitePreDefinido) {
        const outros = convitePreDefinido.membros.filter(m => !m.titular && m.nome !== nome);
        listaAcompanhantesEnvio = outros
          .filter(m => !!membrosPresenca[m.id])
          .map(m => ({
            nome: m.nome,
            criancaAte6Anos: Boolean(membrosCrianca[m.id])
          }));
        
        listaAcompanhantesEnvio.forEach(a => nomesConfirmadosParaPasse.push(a.nome));
      } else {
        listaAcompanhantesEnvio = acompanhantes.map(a => ({
          nome: a.nome.trim(),
          criancaAte6Anos: Boolean(a.criancaAte6Anos)
        }));
        listaAcompanhantesEnvio.forEach(a => nomesConfirmadosParaPasse.push(a.nome));
      }

      const payload = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || undefined,
        presenca,
        acompanhantes: presenca ? listaAcompanhantesEnvio : [],
        observacao: observacao.trim() || undefined,
        codigoConvite: convitePreDefinido?.codigo || codigoConviteUrl || undefined
      };

      const response = await enviarRsvpCasamento(payload);
      setSuccessData(response);

      if (presenca) {
        const adultosTotal = 1 + listaAcompanhantesEnvio.filter(a => !a.criancaAte6Anos).length;
        const criancasTotal = listaAcompanhantesEnvio.filter(a => a.criancaAte6Anos).length;

        setPasseInfo({
          convidado: convitePreDefinido ? convitePreDefinido.familia : nome.trim(),
          telefone: telefone.trim(),
          totalPessoas: response.resumo?.totalPessoas || (adultosTotal + criancasTotal),
          adultos: response.resumo?.adultos || adultosTotal,
          criancasAte6Anos: response.resumo?.criancasAte6Anos || criancasTotal,
          membrosConfirmados: nomesConfirmadosParaPasse,
          tokenOuId: convitePreDefinido?.codigo || ("TT-" + telefone.replace(/\D/g, "").slice(-4))
        });
      }

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

  // Cálculos dinâmicos
  const totalAcompanhantesAdultos = acompanhantes.filter(a => !a.criancaAte6Anos).length;
  const totalAcompanhantesCriancas = acompanhantes.filter(a => a.criancaAte6Anos).length;
  const totalGeralPessoas = 1 + acompanhantes.length;
  const totalGeralAdultos = 1 + totalAcompanhantesAdultos;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden bg-[#FAF7F2] text-[#261811] animate-fade-in"
      role="region"
      aria-label="Página de Confirmação de Presença"
    >
      {/* Barra de Navegação Superior (Header Fixo de Página com Botão de Voltar) */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DEC8] px-3 sm:px-8 py-3 sm:py-4 transition-all shadow-xs">
        <div className="max-w-[760px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-sans tracking-[0.14em] uppercase text-[#6B5A4D] hover:text-[#261811] transition-colors py-1.5 px-2.5 rounded-[6px] hover:bg-[#EFE9DD] cursor-pointer font-medium"
          >
            <span className="text-base leading-none">←</span>
            <span>Voltar ao Convite</span>
          </button>

          <div className="text-center hidden sm:block">
            <span className="font-serif italic text-sm text-[#8C7A6B]">
              Tainara &amp; Thiago · 24.01.2027
            </span>
          </div>

          <button
            type="button"
            onClick={close}
            className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.12em] uppercase text-[#8C7A6B] hover:text-[#261811] p-1.5 rounded-[3px] hover:bg-[#EFE9DD] transition-colors cursor-pointer"
            aria-label="Fechar e voltar ao convite"
          >
            <span className="hidden sm:inline text-[0.7rem]">Fechar</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Conteúdo Central da Página com Largura Confortável e Generosa */}
      <main className="max-w-[760px] mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-8 md:py-10 w-full">
        <div className="bg-[#FFFFFF] border border-[#E3D8CB] shadow-[0_4px_24px_-8px_rgba(38,24,17,0.06)] p-4 sm:p-8 md:p-10 rounded-[10px] text-[#261811] w-full">
          
          {/* Header com Identificação */}
          <div className="flex justify-between items-start mb-6 border-b border-[#EAE0D5] pb-5 shrink-0">
            <div className="flex flex-col space-y-1">
              <span className="font-sans tracking-[0.2em] uppercase text-[0.66rem] text-[#8C7A6B] font-medium">
                R.S.V.P.
              </span>
              <h1 id="rsvp-modal-title" className="font-serif text-2xl sm:text-3xl text-[#261811] font-light mt-0.5 tracking-[-0.01em]">
                Confirmação de Presença
              </h1>
              <p className="font-serif italic text-sm text-[#6B5A4D]">
                Por favor, confirme se você e sua família poderão celebrar conosco este momento especial.
              </p>
            </div>
          </div>

        {/* ========================================================================= */}
        {/* MODO GUEST: EXIGE CONVITE OFICIAL E SELETOR DE IDADE PARA CRIANÇAS        */}
        {/* ========================================================================= */}
        {mode === "guest" && (
          <div className="overflow-x-hidden">
            {!convitePreDefinido ? (
              <div className="space-y-4 py-2">
                <div className="bg-[#F7F2EC] border border-[#E3D8CB] p-5 text-left rounded-[3px] space-y-3">
                  <span className="font-sans text-[0.65rem] tracking-[0.18em] uppercase text-[#8C7A6B] font-medium block">
                    Lista Exclusiva
                  </span>
                  <h3 className="font-serif text-xl font-normal text-[#261811]">
                    Localize o seu Convite
                  </h3>
                  <p className="font-serif italic text-[0.82rem] text-[#6B5A4D] leading-relaxed">
                    A confirmação de presença é restrita aos convidados da lista oficial dos noivos.
                    Por favor, informe o código do seu convite ou o sobrenome da sua família:
                  </p>

                  <form onSubmit={handleBuscarConviteManual} className="pt-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={termoBuscaConvite}
                        onChange={(e) => setTermoBuscaConvite(e.target.value)}
                        placeholder="Ex: fulana, silva, vasconcelos"
                        className="flex-1 bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-2.5 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] rounded-[3px] transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={buscandoConvite}
                        className="bg-[#261811] hover:bg-[#1C110B] text-[#FAF7F2] px-5 py-2.5 font-sans text-xs tracking-[0.14em] uppercase font-medium transition-all rounded-[3px] cursor-pointer disabled:opacity-50"
                      >
                        {buscandoConvite ? "Buscando..." : "Localizar"}
                      </button>
                    </div>
                  </form>

                  {erroConviteNaoEncontrado && (
                    <div className="p-3.5 bg-[#F7F2EC] border-l-2 border-[#A8988B] text-[0.82rem] text-[#543D30] font-serif rounded-[3px] leading-relaxed mt-2">
                      {erroConviteNaoEncontrado}
                    </div>
                  )}
                </div>

                <div className="text-center pt-1">
                  <p className="font-serif italic text-xs text-[#8C7A6B]">
                    Dúvidas ou não localizou seu convite? Entre em contato diretamente com os noivos.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
                {/* Banner de Boas-vindas à Família - Estilo Editorial */}
                <div className="border-b border-[#EAE0D5] pb-4 text-left">
                  <div className="flex justify-between items-baseline">
                    <span className="font-sans text-[0.64rem] tracking-[0.18em] uppercase text-[#8C7A6B] font-medium">
                      Convite Nominal
                    </span>
                    <button
                      type="button"
                      onClick={() => setConvitePreDefinido(null)}
                      className="text-[0.72rem] text-[#8C7A6B] hover:text-[#261811] font-serif underline underline-offset-2 transition-colors"
                    >
                      Alterar convite
                    </button>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-light text-[#261811] mt-1">
                    {convitePreDefinido.familia}
                  </h3>
                  <p className="font-serif italic text-xs sm:text-[0.82rem] text-[#736052] mt-1">
                    Será uma alegria celebrar este momento com vocês. Por favor, confirme a presença da sua família:
                  </p>
                </div>

                {convitePreDefinido.status === "CONFIRMADO" && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-[8px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <span className="text-[0.66rem] font-sans uppercase tracking-wider font-semibold text-emerald-800 block">
                        Presença Já Confirmada
                      </span>
                      <p className="font-serif text-sm text-emerald-950 font-medium">
                        Este convite já está confirmado na lista oficial do casamento.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const titular = convitePreDefinido.membros.find(m => m.titular) || convitePreDefinido.membros[0];
                        const nomes = convitePreDefinido.membros
                          .filter(m => m.confirmadoRsvp !== false)
                          .map(m => m.nome);
                        const crCount = convitePreDefinido.membros
                          .filter(m => m.confirmadoRsvp !== false && !!m.criancaAte6Anos).length;
                        const adCount = (nomes.length || 1) - crCount;

                        setPasseInfo({
                          convidado: convitePreDefinido.familia || titular?.nome || nome,
                          telefone: convitePreDefinido.telefone || telefone,
                          totalPessoas: nomes.length || 1,
                          adultos: adCount > 0 ? adCount : 1,
                          criancasAte6Anos: crCount,
                          membrosConfirmados: nomes.length ? nomes : [nome],
                          tokenOuId: convitePreDefinido.codigo
                        });
                        setMode("success");
                      }}
                      className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-[6px] text-xs font-sans tracking-wider uppercase font-semibold transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      Ver Passe Digital (QR Code)
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-[#F7F2EC] border-l-2 border-[#A8988B] py-3 px-4 text-[0.84rem] text-[#543D30] font-serif flex items-start gap-2.5 rounded-[3px]">
                    <span className="text-[#8C7A6B] text-base leading-none select-none">✦</span>
                    <span className="leading-snug">{errorMsg}</span>
                  </div>
                )}

                {/* Alternador de Presença Geral */}
                <div>
                  <label className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#7D6B5D] font-medium mb-2.5">
                    Vocês comparecerão ao casamento?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setPresenca(true)}
                      className={`min-h-[48px] py-3 px-4 border text-center transition-all duration-200 text-sm font-serif rounded-[6px] cursor-pointer ${
                        presenca
                          ? "border-[#261811] bg-[#261811] text-[#FAF7F2] shadow-xs"
                          : "border-[#D8CDC0] bg-transparent text-[#6B5A4D] hover:border-[#8C7A6B] hover:text-[#261811]"
                      }`}
                    >
                      Sim, confirmamos presença
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresenca(false)}
                      className={`min-h-[48px] py-3 px-4 border text-center transition-all duration-200 text-sm font-serif rounded-[6px] cursor-pointer ${
                        !presenca
                          ? "border-[#261811] bg-[#261811] text-[#FAF7F2] shadow-xs"
                          : "border-[#D8CDC0] bg-transparent text-[#6B5A4D] hover:border-[#8C7A6B] hover:text-[#261811]"
                      }`}
                    >
                      Infelizmente não poderemos ir
                    </button>
                  </div>
                </div>

                {/* Nome do Titular */}
                <div>
                  <label htmlFor="rsvp-nome" className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#7D6B5D] font-medium mb-1.5">
                    Nome do Titular do Convite *
                  </label>
                  <input
                    id="rsvp-nome"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-[0.98rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] transition-all rounded-[3px] shadow-none"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label htmlFor="rsvp-telefone" className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#7D6B5D] font-medium mb-1.5">
                      WhatsApp / Celular *
                    </label>
                    <input
                      id="rsvp-telefone"
                      type="tel"
                      required
                      value={telefone}
                      onChange={handleTelefoneChange}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-[0.98rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] transition-all rounded-[3px] shadow-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="rsvp-email" className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#7D6B5D] font-medium mb-1.5">
                      E-mail <span className="font-serif italic lowercase opacity-80 text-[#8C7A6B]">(opcional)</span>
                    </label>
                    <input
                      id="rsvp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-[0.98rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] transition-all rounded-[3px] shadow-none"
                    />
                  </div>
                </div>

                {/* Seção de Membros da Família */}
                {presenca && (
                  <div className="pt-1 space-y-4">
                    <div className="border-b border-[#EAE0D5] pb-2.5">
                      <span className="block font-sans text-[0.68rem] tracking-[0.16em] uppercase text-[#7D6B5D] font-medium">
                        MEMBROS DA FAMÍLIA AUTORIZADOS
                      </span>
                      <span className="text-[0.78rem] text-[#8C7A6B] font-serif italic">
                        Para crianças, informe a idade.
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {convitePreDefinido.membros
                        .filter(m => !m.titular && m.nome !== nome)
                        .map((m) => {
                          const vai = !!membrosPresenca[m.id];
                          const isMenor7 = !!membrosCrianca[m.id];
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setMembrosPresenca(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                              }}
                              className={`p-3.5 sm:p-4 rounded-[8px] border transition-all cursor-pointer select-none ${
                                vai 
                                  ? "bg-[#FAF7F2] border-[#D8CDC0] shadow-xs" 
                                  : "bg-[#FDFBF7] border-[#E8DEC8]/70 opacity-70 hover:opacity-90"
                              }`}
                            >
                              <div className="flex items-start sm:items-center justify-between gap-3">
                                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                  <div className="pt-0.5 sm:pt-0 shrink-0">
                                    <WeddingCheckbox
                                      size="md"
                                      checked={vai}
                                      onChange={(checked) => setMembrosPresenca(prev => ({ ...prev, [m.id]: checked }))}
                                      ariaLabel={`Presença de ${m.nome}`}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-serif text-[1rem] sm:text-[1.05rem] text-[#261811] font-medium leading-snug break-words">
                                      {m.nome}
                                    </p>
                                    {m.criancaAte6Anos && (
                                      <span className="text-[0.68rem] font-sans text-amber-800 uppercase tracking-wider font-semibold block mt-0.5">
                                        Criança indicada
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <span className={`text-[0.68rem] sm:text-[0.72rem] font-sans shrink-0 uppercase tracking-wider px-2.5 py-1 rounded-full font-semibold transition-colors ${
                                  vai
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-[#EAE0D5] text-[#7D6B5D]"
                                }`}>
                                  {vai ? "Confirmado" : "Não irá"}
                                </span>
                              </div>

                              {/* Marcação de faixa etária (Menor de 7 anos) */}
                              {vai && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMembrosCrianca(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                  }}
                                  className="mt-3 pt-2.5 border-t border-[#EAE0D5] pl-7 flex items-center gap-2.5 cursor-pointer select-none group/crianca"
                                >
                                  <WeddingCheckbox
                                    size="sm"
                                    checked={isMenor7}
                                    onChange={(checked) => setMembrosCrianca(prev => ({ ...prev, [m.id]: checked }))}
                                    ariaLabel={`Menor de 7 anos: ${m.nome}`}
                                  />
                                  <span className="text-xs sm:text-[0.82rem] font-serif text-[#786455] group-hover/crianca:text-[#261811] transition-colors leading-tight">
                                    Criança menor de 7 anos (0 a 6 anos)
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Resumo dinâmico da presença */}
                    {(() => {
                      const outrosConfirmados = convitePreDefinido.membros
                        .filter(m => !m.titular && m.nome !== nome && !!membrosPresenca[m.id]);
                      const criancasQtd = outrosConfirmados.filter(m => !!membrosCrianca[m.id]).length;
                      const adultosQtd = 1 + outrosConfirmados.filter(m => !membrosCrianca[m.id]).length;
                      const totalQtd = adultosQtd + criancasQtd;

                      return (
                        <div className="py-3 px-4 bg-[#F7F2EC] border-l-2 border-[#A8988B] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[#261811] rounded-[6px]">
                          <span className="font-serif text-[0.88rem] text-[#261811] font-medium">
                            {totalQtd} {totalQtd === 1 ? "convidado confirmado" : "convidados confirmados"}
                          </span>
                          <span className="text-[0.82rem] font-serif italic text-[#786455]">
                            {adultosQtd} {adultosQtd === 1 ? "adulto" : "adultos"}
                            {criancasQtd > 0 && ` · ${criancasQtd} ${criancasQtd === 1 ? "criança" : "crianças"}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Observações / Mensagem */}
                <div>
                  <label htmlFor="rsvp-obs" className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#7D6B5D] font-medium mb-1.5">
                    Mensagem para os noivos ou observações <span className="font-serif italic lowercase opacity-80 text-[#8C7A6B]">(opcional)</span>
                  </label>
                  <textarea
                    id="rsvp-obs"
                    rows={2}
                    maxLength={500}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Restrição alimentar ou uma mensagem aos noivos…"
                    className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-[0.96rem] placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#8C7A6B] focus:bg-[#FFFFFF] transition-all resize-none rounded-[3px] shadow-none"
                  />
                </div>

                {/* Botão de Envio */}
                <div className="pt-2 pb-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[48px] py-3.5 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-xs tracking-[0.18em] uppercase transition-all duration-200 disabled:opacity-50 font-semibold rounded-[6px] shadow-sm hover:shadow cursor-pointer"
                  >
                    {loading ? "Confirmando..." : "CONFIRMAR PRESENÇA"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODO SUCCESS: PASSE DIGITAL COM QR CODE OU MENSAGEM DE AGRADECIMENTO     */}
        {/* ========================================================================= */}
        {mode === "success" && (
          <div className="py-2 text-center space-y-4 animate-fade-in overflow-y-auto max-h-[80dvh] pr-1">
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
              <div className="py-6 space-y-4">
                <span className="text-3xl text-[#73563E] block">✦</span>
                <h3 className="font-serif text-2xl text-[#261811] font-normal">
                  {successData?.message || "Resposta Registrada com Sucesso!"}
                </h3>
                <p className="font-serif italic text-[#453126] text-[1.02rem] max-w-[420px] mx-auto">
                  Agradecemos imensamente por nos avisar. Mesmo à distância, seu carinho é muito importante para nós!
                </p>
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={close}
                    className="py-3 px-8 bg-[#261811] text-[#F8F4EC] font-display text-[0.78rem] tracking-[0.22em] uppercase hover:bg-[#160E0A] transition-colors font-bold"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Rodapé Interno com Botão de Retorno */}
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
