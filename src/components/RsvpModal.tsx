import React, { useState, useEffect } from "react";
import {
  enviarRsvpCasamento,
  autenticarAdmin,
  buscarRelatorioRsvpAdmin,
  getApiBaseUrl
} from "../services/api";
import type {
  AcompanhanteRequest,
  AdminRsvpResponse
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
  const [mode, setMode] = useState<"guest" | "admin" | "success">("guest");

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

  // Admin State
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminData, setAdminData] = useState<AdminRsvpResponse | null>(null);
  const [isLoggedAdmin, setIsLoggedAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
        setIsOpen(true);
        setMode("admin");
        document.body.style.overflow = "hidden";
        
        const token = localStorage.getItem("CONVITE_ADMIN_TOKEN");
        if (token) {
          setIsLoggedAdmin(true);
          carregarRelatorioAdmin(token);
        }
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
    };

    checkUrlParams();
    window.addEventListener("popstate", checkUrlParams);

    const handleOpen = () => {
      setIsOpen(true);
      setMode("guest");
      setErrorMsg("");
      document.body.style.overflow = "hidden";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    window.addEventListener("open-rsvp-modal", handleOpen);
    document.addEventListener("keydown", handleKeyDown);

    const token = localStorage.getItem("CONVITE_ADMIN_TOKEN");
    if (token) {
      setIsLoggedAdmin(true);
    }

    return () => {
      window.removeEventListener("open-rsvp-modal", handleOpen);
      window.removeEventListener("popstate", checkUrlParams);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";

    // Remove ?admin=true da URL ao fechar o painel
    const url = new URL(window.location.href);
    if (url.searchParams.has("admin")) {
      url.searchParams.delete("admin");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }

    setTimeout(() => {
      setMode("guest");
      setErrorMsg("");
      setAdminError("");
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

  // Funções do Admin
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    try {
      const token = await autenticarAdmin(adminUsername.trim(), adminPassword);
      setIsLoggedAdmin(true);
      await carregarRelatorioAdmin(token);
    } catch (err: any) {
      setAdminError(err.message || "Usuário ou senha inválidos.");
    } finally {
      setAdminLoading(false);
    }
  };

  const carregarRelatorioAdmin = async (token?: string) => {
    setAdminLoading(true);
    setAdminError("");
    try {
      const data = await buscarRelatorioRsvpAdmin(token);
      setAdminData(data);
    } catch (err: any) {
      setAdminError(err.message || "Erro ao carregar relatório.");
      if (err.message.includes("expirada") || err.message.includes("Autenticação")) {
        setIsLoggedAdmin(false);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("CONVITE_ADMIN_TOKEN");
    setIsLoggedAdmin(false);
    setAdminData(null);
  };

  if (!isOpen) return null;

  // Cálculos dinâmicos
  const totalAcompanhantesAdultos = acompanhantes.filter(a => !a.criancaAte6Anos).length;
  const totalAcompanhantesCriancas = acompanhantes.filter(a => a.criancaAte6Anos).length;
  const totalGeralPessoas = 1 + acompanhantes.length;
  const totalGeralAdultos = 1 + totalAcompanhantesAdultos;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rsvp-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#160E0A]/80 backdrop-blur-sm transition-opacity"
        onClick={close}
      ></div>

      {/* Modal Container — Papelaria editorial premium */}
      <div className="relative w-full max-w-[530px] my-auto bg-[#FAF7F2] border border-[#D8CDC0] shadow-[0_20px_50px_-15px_rgba(22,14,10,0.25)] p-6 sm:p-8 z-10 text-[#261811] animate-fade-in rounded-[4px] max-h-[calc(100dvh-2.5rem)] overflow-y-auto overflow-x-hidden custom-rsvp-scroll">
        
        {/* Header com Botão Fechar */}
        <div className="flex justify-between items-start mb-6 border-b border-[#EAE0D5] pb-4 shrink-0">
          <div className="flex flex-col">
            <span className="font-sans tracking-[0.2em] uppercase text-[0.66rem] text-[#8C7A6B] font-medium">
              {mode === "admin" ? "Área Administrativa" : "R.S.V.P."}
            </span>
            <h2 id="rsvp-modal-title" className="font-serif text-2xl sm:text-[1.85rem] text-[#261811] font-light mt-0.5 tracking-[-0.01em]">
              {mode === "admin" ? "Relatório de Presenças" : "Confirmação de Presença"}
            </h2>
          </div>
          <button
            onClick={close}
            className="text-[#8C7A6B] hover:text-[#261811] transition-colors p-1.5 focus:outline-none -mr-1 rounded-[3px]"
            aria-label="Fechar janela"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setPresenca(true)}
                      className={`min-h-[46px] py-2.5 px-3 border text-center transition-all duration-200 text-[0.88rem] sm:text-[0.92rem] font-serif rounded-[3px] shadow-none ${
                        presenca
                          ? "border-[#261811] bg-[#261811] text-[#FAF7F2]"
                          : "border-[#D8CDC0] bg-transparent text-[#6B5A4D] hover:border-[#8C7A6B] hover:text-[#261811]"
                      }`}
                    >
                      Sim, confirmamos presença
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresenca(false)}
                      className={`min-h-[46px] py-2.5 px-3 border text-center transition-all duration-200 text-[0.88rem] sm:text-[0.92rem] font-serif rounded-[3px] shadow-none ${
                        !presenca
                          ? "border-[#261811] bg-[#261811] text-[#FAF7F2]"
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

                    <div className="divide-y divide-[#EAE0D5] border-y border-[#EAE0D5]">
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
                              className={`py-3.5 px-2.5 -mx-2.5 rounded-[3px] transition-colors cursor-pointer select-none ${
                                vai ? "hover:bg-[#F3EDE4]/50" : "opacity-65 hover:opacity-85 hover:bg-[#F3EDE4]/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 group">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <WeddingCheckbox
                                    size="md"
                                    checked={vai}
                                    onChange={(checked) => setMembrosPresenca(prev => ({ ...prev, [m.id]: checked }))}
                                    ariaLabel={`Presença de ${m.nome}`}
                                  />
                                  <p className="font-serif text-[1.05rem] text-[#261811] font-medium group-hover:text-[#543D30] transition-colors truncate">
                                    {m.nome}
                                  </p>
                                </div>
                                
                                <span className={`text-[0.74rem] font-sans shrink-0 transition-colors ${
                                  vai
                                    ? "text-[#52634C] font-medium tracking-wide"
                                    : "text-[#A8988B]"
                                }`}>
                                  {vai ? "✓ Confirmado" : "Não irá"}
                                </span>
                              </div>

                              {/* Marcação de faixa etária (Menor de 7 anos) */}
                              {vai && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMembrosCrianca(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                  }}
                                  className="pl-8 pt-2.5 pb-0.5 flex items-center gap-2.5 cursor-pointer select-none group/crianca"
                                >
                                  <WeddingCheckbox
                                    size="sm"
                                    checked={isMenor7}
                                    onChange={(checked) => setMembrosCrianca(prev => ({ ...prev, [m.id]: checked }))}
                                    ariaLabel={`Menor de 7 anos: ${m.nome}`}
                                  />
                                  <span className="text-[0.82rem] font-serif text-[#786455] group-hover/crianca:text-[#261811] transition-colors">
                                    Menor de 7 anos (0 a 6 anos)
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
                        <div className="py-2.5 px-3.5 bg-[#F7F2EC] border-l-2 border-[#A8988B] flex flex-wrap items-center justify-between gap-2 text-[#261811] rounded-[3px]">
                          <span className="font-serif text-[0.88rem] text-[#261811]">
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
                    className="w-full min-h-[48px] py-3.5 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-[0.78rem] tracking-[0.18em] uppercase transition-all duration-200 disabled:opacity-50 font-medium rounded-[3px] shadow-none hover:shadow-sm cursor-pointer"
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

        {/* ========================================================================= */}
        {/* MODO ADMIN: ACESSADO EXCLUSIVAMENTE VIA ?admin=true NO LINK               */}
        {/* ========================================================================= */}
        {mode === "admin" && (
          <div className="overflow-y-auto overscroll-contain pr-1 flex-1 space-y-4 animate-fade-in">
            {/* Header com voltar */}
            <div className="flex justify-between items-center border-b border-[#967D67] pb-2.5">
              <span className="font-display text-[0.72rem] tracking-[0.2em] uppercase text-[#543D30] font-bold">
                Painel Restrito
              </span>
              
              {isLoggedAdmin && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      window.dispatchEvent(new CustomEvent("open-recepcao-modal"));
                    }}
                    className="font-display text-[0.72rem] tracking-wider uppercase text-[#543D30] hover:text-[#261811] underline underline-offset-2 transition-colors font-bold"
                  >
                    Portaria / Recepção
                  </button>
                  <span className="text-[#967D67]">|</span>
                  <button
                    type="button"
                    onClick={() => carregarRelatorioAdmin()}
                    disabled={adminLoading}
                    className="font-display text-[0.72rem] tracking-wider uppercase text-[#261811] hover:text-[#543D30] transition-colors font-bold"
                  >
                    Atualizar Dados
                  </button>
                  <span className="text-[#967D67]">|</span>
                  <button
                    type="button"
                    onClick={handleAdminLogout}
                    className="font-display text-[0.72rem] tracking-wider uppercase text-red-900 hover:opacity-80 transition-colors font-bold"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>

            {/* SE NÃO ESTIVER AUTENTICADO: LOGIN */}
            {!isLoggedAdmin ? (
              <form onSubmit={handleAdminLogin} className="p-5 border-2 border-[#967D67] bg-[#EAE0D2] space-y-4 max-w-[420px] mx-auto my-3 rounded-sm">
                <div className="text-center pb-1">
                  <h4 className="font-serif text-xl text-[#261811] font-semibold">Acesso Restrito dos Noivos</h4>
                  <p className="font-serif italic text-xs text-[#453126] mt-0.5">
                    Faça login com seu usuário administrativo do backend.
                  </p>
                </div>

                {adminError && (
                  <div className="bg-red-100 border border-red-500 p-2.5 text-xs text-red-950 font-semibold">
                    {adminError}
                  </div>
                )}

                <div>
                  <label className="block font-display text-[0.7rem] tracking-[0.2em] uppercase text-[#543D30] font-bold mb-1">
                    Usuário
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
                  />
                </div>

                <div>
                  <label className="block font-display text-[0.7rem] tracking-[0.2em] uppercase text-[#543D30] font-bold mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3 bg-[#261811] text-[#F8F4EC] font-display text-[0.78rem] tracking-[0.2em] uppercase hover:bg-[#160E0A] transition-colors disabled:opacity-50 font-bold"
                >
                  {adminLoading ? "Autenticando..." : "Entrar no Painel"}
                </button>

                <div className="text-center pt-3 border-t border-[#967D67]/30">
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      window.dispatchEvent(new CustomEvent("open-recepcao-modal"));
                    }}
                    className="inline-flex items-center gap-1.5 text-[0.75rem] text-[#543D30] hover:text-[#261811] underline underline-offset-4 font-sans tracking-wide font-medium cursor-pointer transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Acessar Tela de Recepção / Portaria
                  </button>
                </div>
              </form>
            ) : (
              /* SE ESTIVER AUTENTICADO: RELATÓRIO COMPLETO COM ALTO CONTRASTE */
              <div className="space-y-4">
                {adminLoading && !adminData && (
                  <p className="font-serif italic text-center py-8 text-[#453126]">
                    Carregando dados das confirmações...
                  </p>
                )}

                {adminError && (
                  <div className="bg-red-100 border border-red-500 p-3 text-xs text-red-950 font-semibold">
                    {adminError}
                  </div>
                )}

                {adminData?.resumoGeral && (
                  <>
                    {/* Cards de Métricas Principais com Alto Contraste */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Total Geral de Pessoas Confirmadas */}
                      <div className="p-3 bg-[#EAE0D2] border-2 border-[#967D67] text-center rounded-sm">
                        <span className="block font-display text-[0.65rem] tracking-[0.18em] uppercase text-[#543D30] font-bold">
                          Total Pessoas
                        </span>
                        <span className="font-serif text-3xl text-[#261811] font-bold block my-0.5">
                          {adminData.resumoGeral.totalAdultos + adminData.resumoGeral.totalCriancasAte6Anos}
                        </span>
                        <span className="block text-[0.72rem] text-[#453126] italic font-serif">
                          confirmadas
                        </span>
                      </div>

                      {/* Adultos e Crianças com 7 anos ou mais */}
                      <div className="p-3 bg-[#EAE0D2] border-2 border-[#967D67] text-center rounded-sm">
                        <span className="block font-display text-[0.65rem] tracking-[0.18em] uppercase text-[#543D30] font-bold">
                          Adultos / ≥ 7 anos
                        </span>
                        <span className="font-serif text-3xl text-[#261811] font-bold block my-0.5">
                          {adminData.resumoGeral.totalAdultos}
                        </span>
                        <span className="block text-[0.72rem] text-[#453126] italic font-serif">
                          pagantes buffet
                        </span>
                      </div>

                      {/* Crianças menores de 7 anos */}
                      <div className="p-3 bg-[#EAE0D2] border-2 border-[#967D67] text-center rounded-sm">
                        <span className="block font-display text-[0.65rem] tracking-[0.18em] uppercase text-[#543D30] font-bold">
                          Menores 7 anos
                        </span>
                        <span className="font-serif text-3xl text-[#261811] font-bold block my-0.5">
                          {adminData.resumoGeral.totalCriancasAte6Anos}
                        </span>
                        <span className="block text-[0.72rem] text-[#453126] italic font-serif">
                          0 a 6 anos (cortesia)
                        </span>
                      </div>

                      {/* Recusaram */}
                      <div className="p-3 bg-[#EAE0D2] border-2 border-[#967D67] text-center rounded-sm">
                        <span className="block font-display text-[0.65rem] tracking-[0.18em] uppercase text-[#543D30] font-bold">
                          Não vão
                        </span>
                        <span className="font-serif text-3xl text-[#453126] font-bold block my-0.5">
                          {adminData.resumoGeral.totalRecusaram}
                        </span>
                        <span className="block text-[0.72rem] text-[#453126] italic font-serif">
                          respostas
                        </span>
                      </div>
                    </div>

                    {/* Barra de Pesquisa */}
                    <div>
                      <input
                        type="text"
                        placeholder="Buscar por nome do convidado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3.5 py-2 text-sm text-[#261811] font-serif focus:outline-none focus:border-[#261811]"
                      />
                    </div>

                    {/* Lista Detalhada de Convidados */}
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto overscroll-contain pr-1">
                      {adminData.data
                        .filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 border-2 rounded-sm ${
                              item.presenca
                                ? "border-[#967D67] bg-[#FAF7F0]"
                                : "border-[#967D67]/70 bg-[#EAE0D2]/60 opacity-80"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <strong className="text-base text-[#261811] block font-serif">
                                  {item.nome}
                                </strong>
                                <div className="text-[#453126] text-[0.88rem] flex items-center gap-3 mt-1 font-serif">
                                  <span>{item.telefone}</span>
                                  {item.telefone && (
                                    <a
                                      href={`https://wa.me/55${item.telefone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-900 font-bold hover:underline"
                                    >
                                      WhatsApp &rarr;
                                    </a>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-1 text-[0.7rem] uppercase font-display tracking-wider font-bold ${
                                  item.presenca
                                    ? "bg-[#261811] text-[#F8F4EC]"
                                    : "bg-[#967D67] text-[#FAF7F0]"
                                }`}
                              >
                                {item.presenca ? `Confirmado (${item.totalPessoas})` : "Não vai"}
                              </span>
                            </div>

                            {/* Acompanhantes do Convidado */}
                            {item.presenca && item.acompanhantes && item.acompanhantes.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[#967D67]/70">
                                <span className="font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] block mb-1 font-bold">
                                  Acompanhantes ({item.acompanhantes.length}):
                                </span>
                                <ul className="space-y-1 pl-2 font-serif text-[0.95rem]">
                                  {item.acompanhantes.map((ac, idx) => (
                                    <li key={idx} className="flex justify-between text-[#261811]">
                                      <span>• {ac.nome}</span>
                                      <span className="text-[0.82rem] italic text-[#453126] font-semibold">
                                        {ac.criancaAte6Anos ? "Criança (< 7 anos)" : "Adulto / ≥ 7 anos"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Observação / Mensagem */}
                            {item.observacao && (
                              <div className="mt-2 text-[0.9rem] text-[#453126] italic border-t border-[#967D67]/40 pt-1 font-serif">
                                &ldquo;{item.observacao}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}

                      {adminData.data.length === 0 && (
                        <p className="text-center text-[#453126] py-4 italic font-serif">
                          Nenhuma confirmação registrada ainda.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
