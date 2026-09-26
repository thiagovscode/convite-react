import React, { useState, useEffect } from "react";
import {
  enviarRsvpCasamento,
  autenticarAdmin,
  buscarRelatorioRsvpAdmin,
  cadastrarConviteAdmin,
  getApiBaseUrl
} from "../services/api";
import type {
  AcompanhanteRequest,
  AdminRsvpResponse,
  NovoMembroAdminRequest
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

  // Sub-aba do painel restrito e cadastro de novos convites no backend Java
  const [adminTab, setAdminTab] = useState<"relatorio" | "cadastrar">("relatorio");
  const [novoFamilia, setNovoFamilia] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPapel, setNovoPapel] = useState("Convidados");
  const [novoObservacao, setNovoObservacao] = useState("");
  const [novosMembros, setNovosMembros] = useState<NovoMembroAdminRequest[]>([
    { id: "1", nome: "", criancaAte6Anos: false, titular: true }
  ]);
  const [cadastrandoLoading, setCadastrandoLoading] = useState(false);
  const [cadastrandoErro, setCadastrandoErro] = useState("");
  const [cadastrandoSucesso, setCadastrandoSucesso] = useState<{ codigo: string; link: string; familia: string } | null>(null);
  const [linkCopiadoFeedback, setLinkCopiadoFeedback] = useState(false);

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

      // 3. Abre direto o formulário se tiver ?rsvp=true ou #rsvp
      if (params.get("rsvp") === "true" || window.location.hash.includes("rsvp")) {
        setIsOpen(true);
        setMode("guest");
        document.body.style.overflow = "hidden";
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

  const addMembroCadastro = () => {
    setNovosMembros(prev => [
      ...prev,
      { id: String(Date.now()), nome: "", criancaAte6Anos: false, titular: false }
    ]);
  };

  const removeMembroCadastro = (idx: number) => {
    if (novosMembros.length <= 1) return;
    setNovosMembros(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMembroCadastro = (idx: number, campo: keyof NovoMembroAdminRequest, valor: any) => {
    setNovosMembros(prev => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], [campo]: valor };
      if (campo === "titular" && valor === true) {
        clone.forEach((m, i) => {
          if (i !== idx) m.titular = false;
        });
      }
      return clone;
    });
  };

  const handleCadastrarConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadastrandoErro("");
    setCadastrandoSucesso(null);

    if (!novoFamilia.trim()) {
      setCadastrandoErro("Informe o nome da família ou convidado principal.");
      return;
    }

    const membrosValidos = novosMembros.filter(m => m.nome.trim() !== "");
    if (membrosValidos.length === 0) {
      setCadastrandoErro("Adicione pelo menos um membro com o nome preenchido.");
      return;
    }

    if (!membrosValidos.some(m => m.titular)) {
      membrosValidos[0].titular = true;
    }

    setCadastrandoLoading(true);
    try {
      const resp = await cadastrarConviteAdmin({
        familia: novoFamilia.trim(),
        telefone: novoTelefone.trim() || undefined,
        email: novoEmail.trim() || undefined,
        papel: novoPapel.trim() || undefined,
        observacao: novoObservacao.trim() || undefined,
        membros: membrosValidos
      });

      const codigoGerado = resp.codigo;
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const linkCompleto = `${origin}${pathname}?convite=${codigoGerado}`;

      setCadastrandoSucesso({
        codigo: codigoGerado,
        link: linkCompleto,
        familia: novoFamilia.trim()
      });

      setNovoFamilia("");
      setNovoTelefone("");
      setNovoEmail("");
      setNovoPapel("Convidados");
      setNovoObservacao("");
      setNovosMembros([{ id: "1", nome: "", criancaAte6Anos: false, titular: true }]);

      carregarRelatorioAdmin();
    } catch (err: any) {
      setCadastrandoErro(err.message || "Erro ao cadastrar convite no backend.");
    } finally {
      setCadastrandoLoading(false);
    }
  };

  const handleCopiarLinkConvite = (link: string) => {
    navigator.clipboard.writeText(link);
    setLinkCopiadoFeedback(true);
    setTimeout(() => setLinkCopiadoFeedback(false), 3000);
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
            {/* Header com voltar e abas */}
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#967D67] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-display text-[0.72rem] tracking-[0.2em] uppercase text-[#543D30] font-bold">
                  Painel Restrito
                </span>
                {isLoggedAdmin && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setAdminTab("relatorio")}
                      className={`font-display text-[0.68rem] tracking-wider uppercase px-2.5 py-1 border transition-all rounded-[2px] font-bold cursor-pointer ${
                        adminTab === "relatorio"
                          ? "bg-[#261811] text-[#FAF7F2] border-[#261811]"
                          : "text-[#543D30] hover:text-[#261811] border-[#967D67]/40 bg-white/40"
                      }`}
                    >
                      Relatório Presenças
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab("cadastrar")}
                      className={`font-display text-[0.68rem] tracking-wider uppercase px-2.5 py-1 border transition-all rounded-[2px] font-bold cursor-pointer ${
                        adminTab === "cadastrar"
                          ? "bg-[#261811] text-[#FAF7F2] border-[#261811]"
                          : "text-[#543D30] hover:text-[#261811] border-[#967D67]/40 bg-white/40"
                      }`}
                    >
                      + Cadastrar Convite
                    </button>
                  </div>
                )}
              </div>
              
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
            ) : adminTab === "cadastrar" ? (
              /* SE ESTIVER AUTENTICADO E NA ABA CADASTRAR: FORMULÁRIO DE NOVO CONVITE NO BACKEND JAVA */
              <div className="space-y-4">
                {cadastrandoSucesso ? (
                  /* Card de Convite Gerado com Sucesso */
                  <div className="p-6 bg-[#FAF7F2] border-2 border-[#967D67] rounded-sm text-center space-y-4 shadow-sm animate-fade-in">
                    <span className="text-3xl text-[#73563E] block">✦</span>
                    <div>
                      <span className="font-display text-[0.68rem] tracking-[0.2em] uppercase text-[#7D6B5D] font-bold block mb-1">
                        Convite Gravado no Backend com Sucesso
                      </span>
                      <h4 className="font-serif text-2xl text-[#261811] font-semibold">
                        {cadastrandoSucesso.familia}
                      </h4>
                    </div>

                    <div className="bg-[#EAE0D2] border border-[#D5C6B5] p-3.5 rounded-sm max-w-sm mx-auto">
                      <span className="block font-sans text-[0.65rem] tracking-[0.18em] uppercase text-[#543D30] font-bold">
                        Código Único do Convite
                      </span>
                      <span className="font-mono text-2xl font-bold tracking-widest text-[#261811] block mt-1 select-all">
                        {cadastrandoSucesso.codigo}
                      </span>
                    </div>

                    <div className="space-y-2 max-w-md mx-auto text-left">
                      <label className="block font-sans text-[0.66rem] tracking-[0.18em] uppercase text-[#7D6B5D] font-medium">
                        Link Direto para Enviar ao Convidado:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={cadastrandoSucesso.link}
                          className="flex-1 bg-[#FFFFFF] border border-[#D8CDC0] px-3 py-2 text-xs font-mono text-[#261811] rounded-[3px] select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopiarLinkConvite(cadastrandoSucesso.link)}
                          className="px-4 py-2 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-[0.72rem] tracking-wider uppercase font-bold rounded-[3px] transition-colors shrink-0 cursor-pointer"
                        >
                          {linkCopiadoFeedback ? "Copiado!" : "Copiar Link"}
                        </button>
                      </div>
                      {linkCopiadoFeedback && (
                        <p className="text-[0.78rem] text-emerald-800 font-medium italic text-center">
                          ✓ Link copiado com sucesso para a área de transferência!
                        </p>
                      )}
                    </div>

                    <div className="pt-3 flex flex-wrap justify-center gap-3 border-t border-[#EAE0D5]">
                      <button
                        type="button"
                        onClick={() => setCadastrandoSucesso(null)}
                        className="px-5 py-2.5 bg-[#261811] text-[#FAF7F2] font-display text-[0.72rem] tracking-wider uppercase hover:bg-[#1A100B] transition-colors font-bold rounded-[2px] cursor-pointer"
                      >
                        + Cadastrar Outro Convite
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCadastrandoSucesso(null);
                          setAdminTab("relatorio");
                        }}
                        className="px-5 py-2.5 bg-transparent border border-[#261811] text-[#261811] font-display text-[0.72rem] tracking-wider uppercase hover:bg-[#261811] hover:text-[#FAF7F2] transition-colors font-bold rounded-[2px] cursor-pointer"
                      >
                        Ver Relatório
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formulário de Cadastro de Novo Convite */
                  <form onSubmit={handleCadastrarConvite} className="p-4 sm:p-5 border-2 border-[#967D67] bg-[#EAE0D2] space-y-4 rounded-sm text-left">
                    <div className="border-b border-[#967D67]/40 pb-2">
                      <span className="font-display text-[0.66rem] tracking-[0.2em] uppercase text-[#543D30] font-bold block">
                        Cadastro de Novo Convite Oficial (Backend Java)
                      </span>
                      <h4 className="font-serif text-xl sm:text-2xl text-[#261811] font-normal mt-0.5">
                        Cadastrar Família &amp; Convidados
                      </h4>
                      <p className="font-serif italic text-xs text-[#543D30] mt-0.5">
                        O código exclusivo será gerado pelo backend de forma segura e única no banco de dados MongoDB.
                      </p>
                    </div>

                    {cadastrandoErro && (
                      <div className="bg-red-100 border border-red-500 p-2.5 text-xs text-red-950 font-semibold rounded-[2px]">
                        {cadastrandoErro}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Nome da Família / Identificação */}
                      <div>
                        <label className="block font-display text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-bold mb-1">
                          Nome da Família / Convidado Principal *
                        </label>
                        <input
                          type="text"
                          required
                          value={novoFamilia}
                          onChange={(e) => setNovoFamilia(e.target.value)}
                          placeholder="Ex: Família Silva ou Lucas &amp; Mariana"
                          className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[2px]"
                        />
                      </div>

                      {/* Telefone / WhatsApp */}
                      <div>
                        <label className="block font-display text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-bold mb-1">
                          WhatsApp / Contato
                        </label>
                        <input
                          type="tel"
                          value={novoTelefone}
                          onChange={(e) => setNovoTelefone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[2px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* E-mail */}
                      <div>
                        <label className="block font-display text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-bold mb-1">
                          E-mail (opcional)
                        </label>
                        <input
                          type="email"
                          value={novoEmail}
                          onChange={(e) => setNovoEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[2px]"
                        />
                      </div>

                      {/* Categoria / Papel */}
                      <div>
                        <label className="block font-display text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-bold mb-1">
                          Papel / Categoria no Evento
                        </label>
                        <select
                          value={novoPapel}
                          onChange={(e) => setNovoPapel(e.target.value)}
                          className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[2px]"
                        >
                          <option value="Convidados">Convidados</option>
                          <option value="Padrinhos">Padrinhos</option>
                          <option value="Padrinhos da Noiva">Padrinhos da Noiva</option>
                          <option value="Padrinhos do Noivo">Padrinhos do Noivo</option>
                          <option value="Família dos Noivos">Família dos Noivos</option>
                          <option value="Pajens &amp; Daminhas">Pajens &amp; Daminhas</option>
                          <option value="Convidados Especiais">Convidados Especiais</option>
                        </select>
                      </div>
                    </div>

                    {/* Membros da Família */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center border-b border-[#967D67]/40 pb-1.5 mb-2.5">
                        <span className="font-display text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-bold">
                          Membros Autorizados no Convite ({novosMembros.length})
                        </span>
                        <button
                          type="button"
                          onClick={addMembroCadastro}
                          className="text-[0.72rem] text-[#261811] hover:underline font-display tracking-wider uppercase font-bold cursor-pointer"
                        >
                          + Adicionar Membro
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {novosMembros.map((m, idx) => (
                          <div
                            key={m.id || idx}
                            className="p-3 bg-[#FAF7F0] border border-[#967D67]/60 rounded-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
                          >
                            <div className="flex-1 w-full sm:w-auto">
                              <input
                                type="text"
                                required
                                value={m.nome}
                                onChange={(e) => updateMembroCadastro(idx, "nome", e.target.value)}
                                placeholder={`Nome completo do membro ${idx + 1}`}
                                className="w-full bg-white border border-[#D8CDC0] px-3 py-1.5 text-sm font-serif text-[#261811] focus:outline-none focus:border-[#261811] rounded-[2px]"
                              />
                            </div>

                            <div className="flex items-center gap-4 flex-wrap text-xs">
                              {/* Seletor Adulto / Criança */}
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={m.criancaAte6Anos}
                                  onChange={(e) => updateMembroCadastro(idx, "criancaAte6Anos", e.target.checked)}
                                  className="accent-[#261811] w-4 h-4 cursor-pointer"
                                />
                                <span className="font-serif text-[#453126]">
                                  Criança (0 a 6 anos)
                                </span>
                              </label>

                              {/* Titular */}
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={m.titular || false}
                                  onChange={(e) => updateMembroCadastro(idx, "titular", e.target.checked)}
                                  className="accent-[#261811] w-4 h-4 cursor-pointer"
                                />
                                <span className="font-serif text-[#453126]">
                                  Titular
                                </span>
                              </label>

                              {novosMembros.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMembroCadastro(idx)}
                                  className="text-red-800 hover:text-red-950 text-sm font-bold px-1 cursor-pointer"
                                  title="Remover membro"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block font-display text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-bold mb-1">
                        Observações Internas (opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={novoObservacao}
                        onChange={(e) => setNovoObservacao(e.target.value)}
                        placeholder="Anotações para a equipe ou noivos..."
                        className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[2px]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={cadastrandoLoading}
                      className="w-full py-3.5 bg-[#261811] text-[#F8F4EC] font-display text-[0.78rem] tracking-[0.2em] uppercase hover:bg-[#160E0A] transition-colors disabled:opacity-50 font-bold rounded-[2px] cursor-pointer shadow-sm"
                    >
                      {cadastrandoLoading ? "Cadastrando no Backend Java..." : "Gravar Convite no Backend"}
                    </button>
                  </form>
                )}
              </div>
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
