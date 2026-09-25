import React, { useState, useEffect } from "react";
import {
  enviarRsvpCasamento,
  autenticarAdmin,
  buscarRelatorioRsvpAdmin,
  getApiBaseUrl,
  setCustomApiUrl
} from "../services/api";
import type {
  AcompanhanteRequest,
  AdminRsvpResponse
} from "../services/api";
import { buscarConvitePorCodigo } from "../services/convites";
import type { ConvitePreDefinido } from "../services/convites";
import QrCodePass from "./QrCodePass";

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
  const [showConfigApi, setShowConfigApi] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(getApiBaseUrl());

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
      setErrorMsg(err.message || "Não foi possível conectar ao servidor. Verifique se o backend está em execução.");
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

  const handleSaveApiUrl = () => {
    setCustomApiUrl(tempApiUrl.trim());
    setShowConfigApi(false);
    if (isLoggedAdmin) {
      carregarRelatorioAdmin();
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
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rsvp-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#160E0A] bg-opacity-80 backdrop-blur-sm transition-opacity"
        onClick={close}
      ></div>

      {/* Modal Container — 100% responsivo para mobile e desktop */}
      <div className="relative w-full max-w-[560px] my-auto bg-[#F8F4EC] border-2 border-[#967D67] shadow-2xl p-4 sm:p-8 z-10 text-[#261811] animate-fade-in max-h-[92dvh] flex flex-col justify-between rounded-sm">
        
        {/* Header com Botão Fechar */}
        <div className="flex justify-between items-start mb-4 sm:mb-6 border-b border-[#967D67] pb-3 sm:pb-4 shrink-0">
          <div className="flex flex-col">
            <span className="font-display tracking-[0.3em] uppercase text-[0.72rem] text-[#543D30] font-semibold">
              {mode === "admin" ? "Área Administrativa" : "R.S.V.P."}
            </span>
            <h2 id="rsvp-modal-title" className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal mt-0.5">
              {mode === "admin" ? "Relatório de Presenças" : "Confirmação de Presença"}
            </h2>
          </div>
          <button
            onClick={close}
            className="text-[#543D30] hover:text-[#261811] transition-colors p-1.5 focus:outline-none"
            aria-label="Fechar janela"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODO GUEST: EXIGE CONVITE OFICIAL E SELETOR DE IDADE PARA O BUFFET        */}
        {/* ========================================================================= */}
        {mode === "guest" && (
          <div className="overflow-y-auto overscroll-contain pr-1 flex-1">
            {!convitePreDefinido ? (
              <div className="space-y-4 py-2">
                <div className="bg-[#EAE0D2] border-2 border-[#967D67] p-4 text-left rounded-sm space-y-3">
                  <span className="font-display text-[0.68rem] tracking-widest uppercase text-[#543D30] font-bold block">
                    Confirmação Exclusiva da Lista Oficial
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#261811]">
                    Localize o seu Convite
                  </h3>
                  <p className="font-serif italic text-xs text-[#453126]">
                    A confirmação de presença é restrita aos convidados da lista dos noivos.
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
                        className="flex-1 bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
                      />
                      <button
                        type="submit"
                        disabled={buscandoConvite}
                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-4 py-2 font-display text-xs tracking-wider uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {buscandoConvite ? "Buscando..." : "Localizar"}
                      </button>
                    </div>
                  </form>

                  {erroConviteNaoEncontrado && (
                    <div className="p-3 bg-red-100 border border-red-500 text-xs text-red-950 font-semibold mt-2">
                      {erroConviteNaoEncontrado}
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  <p className="font-serif italic text-xs text-[#543D30]">
                    Dúvidas ou não localizou seu convite? Entre em contato diretamente com os noivos.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Banner de Boas-vindas à Família */}
                <div className="bg-[#EAE0D2] border-2 border-[#967D67] p-3 text-left rounded-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-display text-[0.65rem] tracking-widest uppercase text-[#543D30] font-bold block">
                        Convite Nominal Confirmado
                      </span>
                      <h3 className="font-serif text-lg font-bold text-[#261811]">
                        {convitePreDefinido.familia}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConvitePreDefinido(null)}
                      className="text-[0.68rem] text-[#543D30] underline hover:text-[#261811] font-serif"
                    >
                      Trocar convite
                    </button>
                  </div>
                  <p className="font-serif italic text-xs text-[#453126] mt-1">
                    Será uma grande honra celebrar este dia com vocês. Confirme abaixo a presença da sua família:
                  </p>
                </div>

                {errorMsg && (
                  <div className="bg-[#EAE0D2] border border-[#967D67] p-3 text-[0.9rem] text-[#261811] rounded-sm font-sans flex items-center gap-2">
                    <span className="font-bold text-red-900">[Atenção]</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Alternador de Presença Geral */}
                <div>
                  <label className="block font-display text-[0.72rem] tracking-[0.25em] uppercase text-[#543D30] font-bold mb-2">
                    Vocês comparecerão ao casamento? *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setPresenca(true)}
                      className={`min-h-[46px] py-3 px-2 border text-center transition-all text-[0.88rem] sm:text-[0.95rem] font-serif font-semibold ${
                        presenca
                          ? "border-[#261811] bg-[#261811] text-[#F8F4EC] shadow-sm"
                          : "border-[#967D67] bg-[#EFE7DC] text-[#261811] hover:border-[#543D30]"
                      }`}
                    >
                      Sim, confirmamos presença
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresenca(false)}
                      className={`min-h-[46px] py-3 px-2 border text-center transition-all text-[0.88rem] sm:text-[0.95rem] font-serif font-semibold ${
                        !presenca
                          ? "border-[#261811] bg-[#261811] text-[#F8F4EC] shadow-sm"
                          : "border-[#967D67] bg-[#EFE7DC] text-[#261811] hover:border-[#543D30]"
                      }`}
                    >
                      Infelizmente não poderemos ir
                    </button>
                  </div>
                </div>

                {/* Nome do Titular */}
                <div>
                  <label htmlFor="rsvp-nome" className="block font-display text-[0.72rem] tracking-[0.25em] uppercase text-[#543D30] font-bold mb-1.5">
                    Nome do Titular do Convite *
                  </label>
                  <input
                    id="rsvp-nome"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3.5 py-2.5 text-[#261811] font-serif text-[1.05rem] focus:outline-none focus:border-[#261811] transition-colors"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="rsvp-telefone" className="block font-display text-[0.72rem] tracking-[0.25em] uppercase text-[#543D30] font-bold mb-1.5">
                      WhatsApp / Celular *
                    </label>
                    <input
                      id="rsvp-telefone"
                      type="tel"
                      required
                      value={telefone}
                      onChange={handleTelefoneChange}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3.5 py-2.5 text-[#261811] font-serif text-[1.05rem] focus:outline-none focus:border-[#261811] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="rsvp-email" className="block font-display text-[0.72rem] tracking-[0.25em] uppercase text-[#543D30] font-bold mb-1.5">
                      E-mail <span className="lowercase font-sans opacity-75">(opcional)</span>
                    </label>
                    <input
                      id="rsvp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3.5 py-2.5 text-[#261811] font-serif text-[1.05rem] focus:outline-none focus:border-[#261811] transition-colors"
                    />
                  </div>
                </div>

                {/* Seção de Membros e Critério de Criança para o Buffet */}
                {presenca && (
                  <div className="border-t border-[#967D67] pt-4 mt-2 space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="block font-display text-[0.74rem] tracking-[0.25em] uppercase text-[#543D30] font-bold">
                          Membros da Família Autorizados
                        </span>
                        <span className="text-[0.84rem] text-[#453126] font-serif italic">
                          Marque quem irá e defina a faixa etária para o buffet
                        </span>
                      </div>
                      <span className="font-display text-[0.65rem] tracking-wider uppercase bg-[#EAE0D2] border border-[#967D67] px-2 py-1 text-[#543D30] font-bold">
                        Lista Restrita
                      </span>
                    </div>

                    <div className="divide-y divide-[#967D67] border-2 border-[#967D67] bg-[#EAE0D2]">
                      {convitePreDefinido.membros
                        .filter(m => !m.titular && m.nome !== nome)
                        .map((m) => {
                          const vai = !!membrosPresenca[m.id];
                          const isMenor7 = !!membrosCrianca[m.id];
                          return (
                            <div
                              key={m.id}
                              className={`p-3 space-y-2.5 transition-colors ${
                                vai ? "bg-[#FAF7F0]" : "bg-[#EAE0D2]/70 opacity-75"
                              }`}
                            >
                              <div
                                onClick={() => {
                                  setMembrosPresenca(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                }}
                                className="flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={vai}
                                    onChange={() => {
                                      setMembrosPresenca(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                    }}
                                    className="w-4 h-4 accent-[#261811] cursor-pointer"
                                  />
                                  <div>
                                    <p className="font-serif text-[0.98rem] font-semibold text-[#261811]">
                                      {m.nome}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-[0.7rem] font-display uppercase tracking-wider font-bold px-2 py-0.5 border ${
                                  vai
                                    ? "bg-emerald-100 border-emerald-600 text-emerald-950"
                                    : "bg-[#DBCABA] border-[#967D67] text-[#543D30]"
                                }`}>
                                  {vai ? "Confirmado" : "Não irá"}
                                </span>
                              </div>

                              {/* Marcação discreta de idade caso a pessoa compareça */}
                              {vai && (
                                <div className="pl-7 pt-1.5 border-t border-[#EAE0D2]">
                                  <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isMenor7}
                                      onChange={(e) => setMembrosCrianca(prev => ({ ...prev, [m.id]: e.target.checked }))}
                                      className="w-4 h-4 accent-[#261811] cursor-pointer"
                                    />
                                    <span className="text-xs font-serif text-[#453126]">
                                      Menor de 7 anos (0 a 6 anos)
                                    </span>
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    <p className="text-[0.78rem] text-[#543D30] font-serif italic pt-1">
                      ℹ️ Este convite é nominal e restrito aos membros autorizados da sua família.
                    </p>

                    {/* Resumo dinâmico da família para conferência imediata */}
                    {(() => {
                      const outrosConfirmados = convitePreDefinido.membros
                        .filter(m => !m.titular && m.nome !== nome && !!membrosPresenca[m.id]);
                      const criancasQtd = outrosConfirmados.filter(m => !!membrosCrianca[m.id]).length;
                      const adultosQtd = 1 + outrosConfirmados.filter(m => !membrosCrianca[m.id]).length;
                      const totalQtd = adultosQtd + criancasQtd;

                      return (
                        <div className="p-3 bg-[#E4D9CA] border-2 border-[#967D67] text-[0.9rem] font-serif text-[#261811] flex flex-wrap justify-between gap-2 font-semibold">
                          <span>Total Confirmado: <strong>{totalQtd} {totalQtd > 1 ? "pessoas" : "pessoa"}</strong></span>
                          <span>Adultos (≥ 7 anos): <strong>{adultosQtd}</strong></span>
                          {criancasQtd > 0 && (
                            <span>Crianças menores de 7 anos: <strong>{criancasQtd}</strong></span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Observações / Mensagem */}
                <div>
                  <label htmlFor="rsvp-obs" className="block font-display text-[0.72rem] tracking-[0.25em] uppercase text-[#543D30] font-bold mb-1.5">
                    Mensagem para os noivos ou observações <span className="lowercase font-sans opacity-75">(opcional)</span>
                  </label>
                  <textarea
                    id="rsvp-obs"
                    rows={2}
                    maxLength={500}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Restrição alimentar (vegetariano/intolerância) ou mensagem com carinho."
                    className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3.5 py-2 text-[#261811] font-serif text-[1rem] focus:outline-none focus:border-[#261811] transition-colors resize-none"
                  />
                </div>

                {/* Botão de Envio */}
                <div className="pt-2 pb-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[48px] py-3.5 bg-[#261811] text-[#F8F4EC] font-display text-[0.84rem] tracking-[0.25em] uppercase hover:bg-[#160E0A] transition-all disabled:opacity-50 font-bold shadow-md cursor-pointer"
                  >
                    {loading ? "Registrando Confirmação..." : "Confirmar Presença"}
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
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => carregarRelatorioAdmin()}
                    disabled={adminLoading}
                    className="font-display text-[0.72rem] tracking-wider uppercase text-[#261811] hover:text-[#543D30] transition-colors font-bold"
                  >
                    Atualizar Dados
                  </button>
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

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigApi(!showConfigApi)}
                    className="text-[0.72rem] text-[#543D30] underline font-semibold"
                  >
                    Configurar URL do backend ({getApiBaseUrl()})
                  </button>
                </div>

                {showConfigApi && (
                  <div className="p-3 border border-[#967D67] bg-[#FAF7F0] space-y-2 text-xs">
                    <label className="block text-[0.68rem] font-display text-[#543D30] uppercase font-bold">
                      Endereço da API Backend
                    </label>
                    <input
                      type="text"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      className="w-full p-1.5 border border-[#967D67] text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiUrl}
                      className="px-3 py-1 bg-[#261811] text-[#F8F4EC] text-xs font-display uppercase tracking-wider font-bold"
                    >
                      Salvar URL
                    </button>
                  </div>
                )}
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
