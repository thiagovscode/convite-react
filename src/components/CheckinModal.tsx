import React, { useState, useEffect } from "react";
import {
  buscarConvitePorCodigo,
  loginRecepcaoBackend,
  registrarCheckinBackend,
  buscarRelatorioAuditoriaBackend,
  buscarParticipantesCerimoniaBackend,
  checkinParticipanteBackend,
  buscarFornecedoresBackend,
  checkinMembroFornecedorBackend,
  adicionarMembroFornecedorBackend,
  cadastrarFornecedorBackend
} from "../services/convites";
import type {
  ConvitePreDefinido,
  MembroAutorizado,
  RelatorioAuditoria,
  ParticipanteCerimonia,
  FornecedorCasamento,
  MembroEquipeFornecedor
} from "../services/convites";

const RECEPCAO_AUTH_KEY = "CASAMENTO_RECEPCAO_AUTENTICADA";

export default function CheckinModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [tab, setTab] = useState<"leitor" | "participantes" | "fornecedores" | "auditoria">("leitor");

  // Login State
  const [userInput, setUserInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Busca e Checkin State
  const [codigoInput, setCodigoInput] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [conviteAtual, setConviteAtual] = useState<ConvitePreDefinido | null>(null);
  
  // Seleção individual de presença para a família atual
  const [selecaoPresenca, setSelecaoPresenca] = useState<Record<string, boolean>>({});
  const [salvandoCheckin, setSalvandoCheckin] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroCheckin, setErroCheckin] = useState("");

  // Relatório de Auditoria para o Buffet
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
  const [copiadoWhatsApp, setCopiadoWhatsApp] = useState(false);

  // Participantes da Cerimônia (Cortejo)
  const [participantes, setParticipantes] = useState<ParticipanteCerimonia[]>([]);
  const [carregandoParticipantes, setCarregandoParticipantes] = useState(false);
  const [filtroLadoParticipante, setFiltroLadoParticipante] = useState<"TODOS" | "NOIVO" | "NOIVA">("TODOS");

  // Fornecedores & Staff
  const [fornecedores, setFornecedores] = useState<FornecedorCasamento[]>([]);
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(false);
  const [modalNovoFornecedor, setModalNovoFornecedor] = useState(false);
  const [membroExtraNome, setMembroExtraNome] = useState<Record<string, string>>({});
  const [membroExtraFuncao, setMembroExtraFuncao] = useState<Record<string, string>>({});
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: "",
    servico: "Orquestra",
    empresa: "",
    telefone: "",
    horarioPrevisto: "14:00",
    instrucaoChegada: "",
    chegadaAntecipada: false
  });

  const carregarTodosDados = () => {
    carregarAuditoria();
    carregarParticipantes();
    carregarFornecedores();
  };

  useEffect(() => {
    const authSalva = localStorage.getItem(RECEPCAO_AUTH_KEY);
    if (authSalva === "true") {
      setIsAutenticado(true);
      carregarTodosDados();
    }

    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkin") === "true" || window.location.hash.includes("checkin=true")) {
        setIsOpen(true);
        document.body.style.overflow = "hidden";
      }
    };

    checkUrl();
    window.addEventListener("popstate", checkUrl);

    return () => {
      window.removeEventListener("popstate", checkUrl);
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("checkin");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  };

  const carregarAuditoria = async () => {
    setCarregandoAuditoria(true);
    const data = await buscarRelatorioAuditoriaBackend();
    if (data) {
      setRelatorio(data);
    }
    setCarregandoAuditoria(false);
  };

  const carregarParticipantes = async () => {
    setCarregandoParticipantes(true);
    const data = await buscarParticipantesCerimoniaBackend();
    if (data && data.participantes) {
      setParticipantes(data.participantes);
    }
    setCarregandoParticipantes(false);
  };

  const toggleCheckinParticipante = async (p: ParticipanteCerimonia) => {
    if (!p.id) return;
    const res = await checkinParticipanteBackend(p.id, !p.presenteCheckin);
    if (res.success && res.participante) {
      setParticipantes((prev: ParticipanteCerimonia[]) => prev.map((item: ParticipanteCerimonia) => item.id === p.id ? res.participante! : item));
    }
  };

  const carregarFornecedores = async () => {
    setCarregandoFornecedores(true);
    const data = await buscarFornecedoresBackend();
    if (data && data.fornecedores) {
      setFornecedores(data.fornecedores);
    }
    setCarregandoFornecedores(false);
  };

  const handleToggleMembroFornecedor = async (fornecedorId: string, membroId: string, statusAtual: boolean) => {
    const res = await checkinMembroFornecedorBackend(fornecedorId, membroId, !statusAtual);
    if (res.success && res.fornecedor) {
      setFornecedores((prev: FornecedorCasamento[]) => prev.map((f: FornecedorCasamento) => f.id === fornecedorId ? res.fornecedor! : f));
    }
  };

  const handleAdicionarMembroExtra = async (fornecedorId: string) => {
    const nome = membroExtraNome[fornecedorId]?.trim();
    if (!nome) return;
    const funcao = membroExtraFuncao[fornecedorId]?.trim() || "Equipe";
    const res = await adicionarMembroFornecedorBackend(fornecedorId, { nome, funcao });
    if (res.success && res.fornecedor) {
      setFornecedores((prev: FornecedorCasamento[]) => prev.map((f: FornecedorCasamento) => f.id === fornecedorId ? res.fornecedor! : f));
      setMembroExtraNome((prev: Record<string, string>) => ({ ...prev, [fornecedorId]: "" }));
      setMembroExtraFuncao((prev: Record<string, string>) => ({ ...prev, [fornecedorId]: "" }));
    }
  };

  const handleCadastrarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornecedor.empresa || !novoFornecedor.nome) return;
    const res = await cadastrarFornecedorBackend(novoFornecedor);
    if (res.success) {
      setModalNovoFornecedor(false);
      setNovoFornecedor({
        nome: "",
        servico: "Orquestra",
        empresa: "",
        telefone: "",
        horarioPrevisto: "14:00",
        instrucaoChegada: "",
        chegadaAntecipada: false
      });
      carregarFornecedores();
    }
  };

  const gerarTextoFechamentoWhatsApp = () => {
    if (!relatorio) return "";
    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    let texto = `📋 *FECHAMENTO OFICIAL DA PORTARIA - CASAMENTO*\n`;
    texto += `📅 *Horário da Auditoria:* ${dataHoraStr}\n\n`;
    texto += `👥 *CONVIDADOS DA FESTA:*\n`;
    texto += `• Total Previsto: ${relatorio.totalConvidadosPrevistos} pessoas\n`;
    texto += `• Confirmados no RSVP: ${relatorio.totalConfirmadosRsvp} pessoas\n`;
    texto += `• *Presentes Reais no Evento:* ${relatorio.totalPresentesReais} pessoas\n`;
    texto += `   - Adultos pagantes (≥ 7 anos): *${relatorio.totalAdultosPresentes}*\n`;
    texto += `   - Crianças isentas (< 7 anos): *${relatorio.totalCriancasPresentes}*\n`;
    texto += `• Faltantes confirmados (No-Show): ${relatorio.totalAusentesNoShow} pessoas\n\n`;

    const totalStaffPresente = fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0), 0);
    texto += `🎧 *FORNECEDORES & EQUIPES NO LOCAL:*\n`;
    texto += `• Total de profissionais presentes: *${totalStaffPresente} pessoas*\n`;
    fornecedores.forEach((f: FornecedorCasamento) => {
      const presentesForn = f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0;
      const totalForn = f.equipe ? f.equipe.length : 0;
      texto += `  - ${f.empresa} (${f.servico}): ${presentesForn}/${totalForn} no local\n`;
    });

    texto += `\n_Relatório auditado pela equipe de recepção e portaria oficial do evento._`;
    return texto;
  };

  const handleCopiarWhatsApp = () => {
    const texto = gerarTextoFechamentoWhatsApp();
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoWhatsApp(true);
    setTimeout(() => setCopiadoWhatsApp(false), 3000);
  };

  const handleCompartilharWhatsApp = () => {
    const texto = gerarTextoFechamentoWhatsApp();
    if (!texto) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleLoginRecepcao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const res = await loginRecepcaoBackend(userInput, passInput);
    setLoginLoading(false);

    if (res.success) {
      setIsAutenticado(true);
      localStorage.setItem(RECEPCAO_AUTH_KEY, "true");
      setUserInput("");
      setPassInput("");
      carregarTodosDados();
    } else {
      setLoginError(res.message || "Usuário ou senha incorretos.");
    }
  };

  const handleLogoutRecepcao = () => {
    localStorage.removeItem(RECEPCAO_AUTH_KEY);
    setIsAutenticado(false);
    setConviteAtual(null);
  };

  // Buscar convite por código, QR code ou texto
  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const termo = codigoInput.trim();
    if (!termo) return;

    setLoadingBusca(true);
    setErroCheckin("");
    setMensagemSucesso("");

    let codigoLimpo = termo;
    try {
      if (termo.startsWith("{")) {
        const parsed = JSON.parse(termo);
        codigoLimpo = parsed.codigo || termo;
      }
    } catch {
      // texto normal
    }

    const c = await buscarConvitePorCodigo(codigoLimpo);
    setLoadingBusca(false);

    if (c) {
      setConviteAtual(c);
      // Inicializa presença: se já tinha checkin gravado, usa o status; senão, default = true para quem confirmou RSVP
      const sel: Record<string, boolean> = {};
      c.membros?.forEach(m => {
        if (m.presenteCheckin !== undefined) {
          sel[m.id] = m.presenteCheckin;
        } else {
          // Default: se confirmou RSVP, pré-marca como presente para agilizar
          sel[m.id] = m.confirmadoRsvp !== false;
        }
      });
      setSelecaoPresenca(sel);
    } else {
      setConviteAtual(null);
      setErroCheckin(`Nenhum convite localizado com o código ou nome "${codigoLimpo}".`);
    }
  };

  const alternarPresencaMembro = (id: string) => {
    setSelecaoPresenca((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const marcarTodos = (presente: boolean) => {
    if (!conviteAtual?.membros) return;
    const sel: Record<string, boolean> = {};
    conviteAtual.membros.forEach((m: MembroAutorizado) => {
      sel[m.id] = presente;
    });
    setSelecaoPresenca(sel);
  };

  const salvarPresenca = async () => {
    if (!conviteAtual) return;
    setSalvandoCheckin(true);
    setErroCheckin("");
    setMensagemSucesso("");

    const presencas = (conviteAtual.membros || []).map((m: MembroAutorizado) => ({
      membroId: m.id,
      presente: !!selecaoPresenca[m.id]
    }));

    const res = await registrarCheckinBackend(conviteAtual.codigo, presencas, "Portaria");
    setSalvandoCheckin(false);

    if (res.success) {
      const presentesQtd = Object.values(selecaoPresenca).filter(Boolean).length;
      const ausentesQtd = presencas.length - presentesQtd;

      setMensagemSucesso(`Entrada registrada com sucesso! Presentes: ${presentesQtd} | Ausentes: ${ausentesQtd}`);
      carregarAuditoria();
      carregarParticipantes();
      carregarFornecedores();
      // Atualiza localmente no modal
      if (res.convite) {
        setConviteAtual(res.convite);
      }
    } else {
      setErroCheckin(res.message || "Erro ao salvar check-in.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-[#160E0A] bg-opacity-85 backdrop-blur-sm" onClick={close}></div>

      <div className="relative w-full max-w-[700px] my-auto bg-[#F8F4EC] border-2 border-[#967D67] shadow-2xl p-5 sm:p-7 z-10 text-[#261811] max-h-[92dvh] flex flex-col justify-between rounded-sm">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#967D67] pb-3 mb-4 shrink-0">
          <div>
            <span className="font-display tracking-[0.25em] uppercase text-[0.7rem] text-[#543D30] font-bold">
              Portaria &amp; Cerimonial
            </span>
            <h2 className="font-serif text-2xl text-[#261811] font-semibold">
              Recepção do Casamento
            </h2>
          </div>
          <button onClick={close} className="text-[#543D30] hover:text-[#261811] p-1 font-bold" aria-label="Fechar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. SE NÃO AUTENTICADO: LOGIN DA RECEPÇÃO */}
        {!isAutenticado ? (
          <form onSubmit={handleLoginRecepcao} className="p-5 border-2 border-[#967D67] bg-[#EAE0D2] space-y-4 max-w-[420px] mx-auto my-6 text-left rounded-sm">
            <div className="text-center pb-1">
              <h3 className="font-serif text-xl text-[#261811] font-semibold">Acesso da Portaria</h3>
              <p className="font-serif italic text-xs text-[#453126] mt-0.5">
                Digite as credenciais fornecidas previamente pelos noivos para iniciar a recepção dos convidados.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-100 border border-red-500 p-2.5 text-xs text-red-950 font-bold">
                {loginError}
              </div>
            )}

            <div>
              <label className="block font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] font-bold mb-1">
                Usuário da Recepção
              </label>
              <input
                type="text"
                required
                autoFocus
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="recepcao"
                className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
              />
            </div>

            <div>
              <label className="block font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] font-bold mb-1">
                Senha da Portaria
              </label>
              <input
                type="password"
                required
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] py-2.5 font-display text-xs tracking-widest uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? "Verificando..." : "Entrar na Portaria"}
            </button>
          </form>
        ) : (
          /* 2. RECONHECIMENTO E CONFERÊNCIA NOMINAL */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
            
            {/* Top Bar com Tabs e Logout */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67] pb-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTab("leitor")}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "leitor"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Convites / QR
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("participantes"); carregarParticipantes(); }}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "participantes"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Participantes ({participantes.filter((p: ParticipanteCerimonia) => p.presenteCheckin).length}/{participantes.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("fornecedores"); carregarFornecedores(); }}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "fornecedores"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Fornecedores &amp; Staff ({fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0), 0)}/{fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.length : 0), 0)})
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("auditoria"); carregarAuditoria(); }}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "auditoria"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Buffet &amp; Auditoria
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[0.7rem] font-serif text-[#543D30]">
                  Operador: <strong className="text-[#261811]">Recepção</strong>
                </span>
                <button
                  type="button"
                  onClick={handleLogoutRecepcao}
                  className="text-[0.7rem] text-red-800 underline hover:text-red-950 font-bold"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* TAB 1: LEITOR & CHECK-IN NOMINAL */}
            {tab === "leitor" && (
              <div className="space-y-4">
                {/* Campo de Busca / Scanner */}
                <form onSubmit={handleBuscar} className="space-y-2">
                  <label className="block font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] font-bold">
                    Código do Convite, Nome da Família ou Texto do QR Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      placeholder="Ex: fulana, padrinhos-joao ou aponte o leitor"
                      className="flex-1 bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
                    />
                    <button
                      type="submit"
                      disabled={loadingBusca}
                      className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-4 py-2 font-display text-xs tracking-wider uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loadingBusca ? "Buscando..." : "Localizar"}
                    </button>
                  </div>
                </form>

                {erroCheckin && (
                  <div className="p-3 bg-red-100 border border-red-500 text-xs text-red-950 font-medium">
                    {erroCheckin}
                  </div>
                )}

                {mensagemSucesso && (
                  <div className="p-3 bg-emerald-100 border border-emerald-600 text-xs text-emerald-950 font-semibold">
                    {mensagemSucesso}
                  </div>
                )}

                {/* FICHA DO CONVITE LOCALIZADO */}
                {conviteAtual && (
                  <div className="border-2 border-[#967D67] bg-[#FAF7F0] p-4 space-y-4 rounded-sm">
                    <div className="flex flex-wrap justify-between items-start border-b border-[#967D67] pb-2">
                      <div>
                        <span className="font-display text-[0.65rem] tracking-widest uppercase text-[#543D30] font-bold">
                          Convite Localizado: #{conviteAtual.codigo}
                        </span>
                        <h3 className="font-serif text-xl font-bold text-[#261811]">
                          {conviteAtual.familia}
                        </h3>
                        {conviteAtual.telefone && (
                          <p className="font-serif text-xs text-[#543D30]">
                            Telefone: {conviteAtual.telefone}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 text-[0.65rem] font-display uppercase font-bold tracking-wider border ${
                          conviteAtual.status === "CONFIRMADO"
                            ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                            : conviteAtual.status === "RECUSADO"
                            ? "bg-red-100 border-red-500 text-red-900"
                            : "bg-amber-100 border-amber-500 text-amber-900"
                        }`}>
                          RSVP: {conviteAtual.status || "PENDENTE"}
                        </span>
                      </div>
                    </div>

                    {/* Banner de Papel de Honra (Padrinhos / Pais dos Noivos) */}
                    {conviteAtual.papel && (
                      <div className="bg-[#261811] text-[#F8F4EC] p-2.5 rounded-sm flex flex-wrap items-center justify-between gap-2 text-xs font-serif shadow-sm">
                        <div>
                          <span className="font-display tracking-widest uppercase text-[0.62rem] text-[#D5C6B5] font-bold block">
                            Convidado de Honra Oficial
                          </span>
                          <strong className="text-sm font-semibold text-[#F8F4EC]">{conviteAtual.papel}</strong>
                        </div>
                        <span className="bg-[#3D281E] border border-[#967D67] px-2 py-0.5 text-[0.65rem] font-display uppercase tracking-wider font-bold text-[#F8F4EC]">
                          Paleta Oficial dos Padrinhos / Pais
                        </span>
                      </div>
                    )}

                    {/* Instrução para o caso de faltas no dia */}
                    <div className="bg-[#EAE0D2] p-2.5 text-xs text-[#453126] font-serif border border-[#967D67]">
                      <strong>Instrução da Recepção:</strong> Marque apenas quem está fisicamente presente na portaria.
                      Se alguém faltou, desmarque a pessoa para abater da contagem do Buffet.
                    </div>

                    {/* Lista Nominal de Membros */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-serif font-bold text-[#543D30]">
                        <span>Membros Autorizados do Convite:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => marcarTodos(true)}
                            className="text-[#261811] underline hover:text-[#543D30] cursor-pointer"
                          >
                            Entraram Todos
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => marcarTodos(false)}
                            className="text-[#543D30] underline hover:text-[#261811] cursor-pointer"
                          >
                            Desmarcar Todos
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-[#EAE0D2] border border-[#967D67] bg-[#FFF]">
                        {conviteAtual.membros?.map((m: MembroAutorizado) => {
                          const isPresente = !!selecaoPresenca[m.id];
                          return (
                            <div
                              key={m.id}
                              onClick={() => alternarPresencaMembro(m.id)}
                              className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                isPresente ? "bg-emerald-50/70" : "bg-red-50/40"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isPresente}
                                  onChange={() => alternarPresencaMembro(m.id)}
                                  className="w-4 h-4 accent-[#261811] cursor-pointer"
                                />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-serif text-sm font-semibold text-[#261811]">
                                      {m.nome}
                                    </p>
                                    {m.papel && (
                                      <span className="px-2 py-0.5 font-display text-[0.62rem] uppercase tracking-wider font-bold bg-[#261811] text-[#F8F4EC] rounded-xs border border-[#967D67]">
                                        {m.papel}
                                      </span>
                                    )}
                                    {m.titular && !m.papel && (
                                      <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30]">
                                        (Titular)
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-serif text-xs text-[#543D30]">
                                    {m.criancaAte6Anos
                                      ? "Criança (Menor de 7 anos - Isenta / Reduzida)"
                                      : "Adulto / Acima de 7 anos (Pagante Integral)"}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                {isPresente ? (
                                  <span className="inline-block px-2 py-0.5 font-display text-[0.65rem] tracking-wider uppercase font-bold bg-emerald-600 text-white rounded-sm">
                                    Presente
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 font-display text-[0.65rem] tracking-wider uppercase font-bold bg-[#8C2D19] text-white rounded-sm">
                                    Não Compareceu
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resumo da Ação e Botão de Confirmação */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#967D67]">
                      <div className="text-xs font-serif text-[#453126]">
                        Entrada calculada:{" "}
                        <strong className="text-[#261811]">
                          {Object.values(selecaoPresenca).filter(Boolean).length} presentes
                        </strong>{" "}
                        de {conviteAtual.membros?.length || 0} previstos.
                      </div>

                      <button
                        type="button"
                        onClick={salvarPresenca}
                        disabled={salvandoCheckin}
                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-5 py-2.5 font-display text-xs tracking-widest uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {salvandoCheckin ? "Salvando Entrada..." : "Confirmar Entrada na Festa"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PARTICIPANTES DA CERIMÔNIA (CORTEJO & PARES) */}
            {tab === "participantes" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67] pb-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#261811]">
                      Cortejo &amp; Participantes da Cerimônia
                    </h3>
                    <p className="font-serif italic text-xs text-[#543D30]">
                      Link dos pares pelo convite e conferência nominal na portaria.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display uppercase tracking-wider text-[#453126]">
                      Filtrar:
                    </span>
                    <select
                      value={filtroLadoParticipante}
                      onChange={(e) => setFiltroLadoParticipante(e.target.value as any)}
                      className="bg-[#FAF7F0] border border-[#967D67] text-xs font-serif px-2 py-1 text-[#261811] focus:outline-none"
                    >
                      <option value="TODOS">Todos os Participantes</option>
                      <option value="NOIVO">Lado do Noivo</option>
                      <option value="NOIVA">Lado da Noiva</option>
                    </select>
                  </div>
                </div>

                {/* Métricas do Cortejo */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-[#EAE0D2] border border-[#967D67]">
                    <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                      Total no Cortejo
                    </span>
                    <strong className="font-serif text-xl text-[#261811]">{participantes.length}</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-100 border-2 border-emerald-600">
                    <span className="block font-display text-[0.6rem] uppercase tracking-wider text-emerald-950 font-bold">
                      Já Chegaram
                    </span>
                    <strong className="font-serif text-xl text-emerald-950">
                      {participantes.filter((p: ParticipanteCerimonia) => p.presenteCheckin).length}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#FAF7F0] border border-[#967D67]">
                    <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                      Faltam Chegar
                    </span>
                    <strong className="font-serif text-xl text-amber-900">
                      {participantes.filter((p: ParticipanteCerimonia) => !p.presenteCheckin).length}
                    </strong>
                  </div>
                </div>

                {/* Lista de Participantes: Nome > Papel -> Vinculo · Par */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {participantes
                    .filter((p: ParticipanteCerimonia) => filtroLadoParticipante === "TODOS" || (p.vinculo && p.vinculo.toUpperCase().includes(filtroLadoParticipante)))
                    .map((p: ParticipanteCerimonia) => {
                      const isPresente = Boolean(p.presenteCheckin);
                      const isConfirmado = Boolean(p.confirmadoRsvp);

                      // Busca tolerante do par (por parId, por nome completo ou por primeiro nome)
                      const normalizarNome = (txt?: string) => txt ? txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
                      const parObj = p.par ? participantes.find((outro: ParticipanteCerimonia) => {
                        if (outro.id && (p as any).parId && outro.id === (p as any).parId) return true;
                        const n1 = normalizarNome(outro.nome);
                        const n2 = normalizarNome(p.par);
                        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
                      }) : null;

                      const parPresente = parObj ? Boolean(parObj.presenteCheckin) : false;
                      const parNome = p.par || (parObj ? parObj.nome : null);

                      return (
                        <div
                          key={p.id || p.nome}
                          className={`p-3.5 border transition-all flex flex-wrap items-center justify-between gap-3 rounded-xs ${
                            isPresente
                              ? "bg-emerald-50/80 border-emerald-600 shadow-xs"
                              : "bg-[#FAF7F0] border-[#967D67] hover:border-[#261811]"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 min-w-[260px]">
                            {/* Nome > Papel -> Vinculo */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-serif text-base font-bold text-[#261811]">
                                {p.nome}
                              </span>
                              <span className="text-[#967D67] font-sans font-light">&gt;</span>
                              <span className="px-2 py-0.5 font-display text-[0.68rem] uppercase font-bold tracking-wider bg-[#261811] text-[#F8F4EC] rounded-xs border border-[#967D67]">
                                {p.papel}
                              </span>
                              {p.vinculo && (
                                <>
                                  <span className="text-[#967D67] font-sans font-light">&rarr;</span>
                                  <span className="font-display text-[0.68rem] uppercase tracking-wider font-semibold text-[#543D30]">
                                    {p.vinculo}
                                  </span>
                                </>
                              )}

                              {/* Status de RSVP do participante */}
                              {isConfirmado ? (
                                <span className="px-1.5 py-0.2 text-[0.6rem] font-display uppercase tracking-wider font-semibold bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-xs">
                                  RSVP Confirmado
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 text-[0.6rem] font-display uppercase tracking-wider font-semibold bg-amber-100 text-amber-950 border border-amber-400 rounded-xs">
                                  RSVP Pendente
                                </span>
                              )}
                            </div>

                            {/* Informações de Par, Telefone e Chegada */}
                            <div className="flex items-center gap-2.5 flex-wrap text-xs font-serif text-[#543D30]">
                              {/* Rastreamento Inteligente do Par */}
                              {parNome && (
                                <div className="flex items-center gap-1.5 flex-wrap bg-[#EAE0D2]/70 px-2 py-0.5 rounded border border-[#967D67]/40">
                                  <span>Par: <strong className="text-[#261811]">{parNome}</strong></span>
                                  
                                  {isPresente && parPresente ? (
                                    <span className="px-2 py-0.2 bg-emerald-700 text-white rounded text-[0.62rem] font-display uppercase tracking-wider font-bold">
                                      ✓ Par Completo no Local
                                    </span>
                                  ) : isPresente && !parPresente ? (
                                    <span className="px-2 py-0.2 bg-amber-200 text-amber-950 border border-amber-700 rounded text-[0.62rem] font-display uppercase tracking-wider font-semibold">
                                      ⏳ Aguardando {parNome} chegar
                                    </span>
                                  ) : !isPresente && parPresente ? (
                                    <span className="px-2 py-0.2 bg-teal-200 text-teal-950 border border-teal-700 rounded text-[0.62rem] font-display uppercase tracking-wider font-semibold">
                                      ✓ {parNome} já no local (Aguardando {p.nome})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.2 bg-stone-200 text-stone-800 border border-stone-400 rounded text-[0.62rem] font-display uppercase tracking-wider">
                                      ⏳ Ambos a caminho
                                    </span>
                                  )}

                                  {parObj?.telefone && !parPresente && (
                                    <a
                                      href={`https://wa.me/55${parObj.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[0.62rem] text-emerald-800 underline font-sans font-semibold hover:text-emerald-950 ml-0.5"
                                      title={`Cobrar ${parNome} via WhatsApp`}
                                    >
                                      Cobrar WhatsApp
                                    </a>
                                  )}
                                </div>
                              )}

                              {p.telefone && (
                                <span>
                                  Tel: <a href={`tel:${p.telefone.replace(/[^0-9]/g, '')}`} className="underline text-[#261811] font-semibold">{p.telefone}</a>
                                </span>
                              )}

                              {p.codigoConvite && (
                                <span className="font-mono text-[0.68rem] text-[#967D67]">
                                  Convite: #{p.codigoConvite}
                                </span>
                              )}

                              {isPresente && p.dataHoraEntrada && (
                                <span className="text-emerald-900 font-semibold bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-300 text-[0.68rem]">
                                  Entrada: {new Date(p.dataHoraEntrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCheckinParticipante(p)}
                              className={`px-4 py-2 font-display text-xs tracking-wider uppercase font-bold rounded-sm transition-all cursor-pointer ${
                                isPresente
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  : "bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC]"
                              }`}
                            >
                              {isPresente ? "Presente ✓ (Desmarcar)" : "Marcar Chegada"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: FORNECEDORES & CONTATOS DE EMERGÊNCIA */}
            {tab === "fornecedores" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67] pb-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#261811]">
                      Contatos de Fornecedores &amp; Chegada da Equipe
                    </h3>
                    <p className="font-serif italic text-xs text-[#543D30]">
                      Telefones rápidos e check-in nominal por profissional da equipe.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalNovoFornecedor(true)}
                    className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1.5 font-display text-[0.68rem] tracking-wider uppercase font-bold rounded-sm transition-colors cursor-pointer"
                  >
                    + Adicionar Fornecedor
                  </button>
                </div>

                {/* Métricas de Fornecedores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-[#EAE0D2] border border-[#967D67]">
                    <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                      Empresas Contratadas
                    </span>
                    <strong className="font-serif text-xl text-[#261811]">{fornecedores.length}</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-100 border-2 border-emerald-600">
                    <span className="block font-display text-[0.6rem] uppercase tracking-wider text-emerald-950 font-bold">
                      Profissionais no Local
                    </span>
                    <strong className="font-serif text-xl text-emerald-950">
                      {fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0), 0)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#FAF7F0] border border-[#967D67] col-span-2 sm:col-span-1">
                    <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                      Total da Equipe Esperada
                    </span>
                    <strong className="font-serif text-xl text-[#261811]">
                      {fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.length : 0), 0)}
                    </strong>
                  </div>
                </div>

                {/* Modal Cadastro de Fornecedor */}
                {modalNovoFornecedor && (
                  <form onSubmit={handleCadastrarFornecedor} className="p-3 bg-[#EAE0D2] border-2 border-[#967D67] space-y-2 text-xs">
                    <div className="flex justify-between items-center font-display text-xs font-bold uppercase text-[#261811]">
                      <span>Cadastrar Nova Empresa / Fornecedor</span>
                      <button type="button" onClick={() => setModalNovoFornecedor(false)} className="text-red-800 hover:text-red-950 font-bold">Fechar ✕</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Responsável Principal</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Luciano"
                          value={novoFornecedor.nome}
                          onChange={e => setNovoFornecedor({...novoFornecedor, nome: e.target.value})}
                          className="w-full bg-[#FAF7F0] border border-[#967D67] px-2 py-1 text-[#261811]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Serviço / Categoria</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Orquestra, Fotógrafo, Som"
                          value={novoFornecedor.servico}
                          onChange={e => setNovoFornecedor({...novoFornecedor, servico: e.target.value})}
                          className="w-full bg-[#FAF7F0] border border-[#967D67] px-2 py-1 text-[#261811]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Nome da Empresa</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Harmonia Musical"
                          value={novoFornecedor.empresa}
                          onChange={e => setNovoFornecedor({...novoFornecedor, empresa: e.target.value})}
                          className="w-full bg-[#FAF7F0] border border-[#967D67] px-2 py-1 text-[#261811]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Telefone / WhatsApp</label>
                        <input
                          type="text"
                          placeholder="(11) 98888-0000"
                          value={novoFornecedor.telefone}
                          onChange={e => setNovoFornecedor({...novoFornecedor, telefone: e.target.value})}
                          className="w-full bg-[#FAF7F0] border border-[#967D67] px-2 py-1 text-[#261811]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Horário Previsto de Entrada</label>
                        <input
                          type="text"
                          placeholder="Ex: 14:00"
                          value={novoFornecedor.horarioPrevisto}
                          onChange={e => setNovoFornecedor({...novoFornecedor, horarioPrevisto: e.target.value})}
                          className="w-full bg-[#FAF7F0] border border-[#967D67] px-2 py-1 text-[#261811]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Instrução / Chegada Antecipada</label>
                        <input
                          type="text"
                          placeholder="Ex: Chegada antecipada para afinação e montagem"
                          value={novoFornecedor.instrucaoChegada}
                          onChange={e => setNovoFornecedor({...novoFornecedor, instrucaoChegada: e.target.value, chegadaAntecipada: !!e.target.value})}
                          className="w-full bg-[#FAF7F0] border border-[#967D67] px-2 py-1 text-[#261811]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-4 py-1.5 font-display text-[0.68rem] tracking-wider uppercase font-bold rounded-sm cursor-pointer"
                      >
                        Salvar Empresa
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Fornecedores com Equipe Nominal */}
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {fornecedores.map((f: FornecedorCasamento) => {
                    const equipe = f.equipe || [];
                    const totalPresentes = equipe.filter((m: MembroEquipeFornecedor) => m.presente).length;

                    return (
                      <div
                        key={f.id || f.empresa}
                        className="p-3.5 border-2 border-[#967D67] bg-[#FAF7F0] space-y-3"
                      >
                        {/* Linha 1: Luciano > Fornecedor > Orquestra -> Harmonia Musical */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67]/40 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif text-base font-bold text-[#261811]">
                              {f.nome || f.responsavel}
                            </span>
                            <span className="text-[#967D67] font-sans font-light">&gt;</span>
                            <span className="px-2 py-0.5 font-display text-[0.65rem] uppercase font-bold tracking-wider bg-[#261811] text-[#F8F4EC] rounded-xs border border-[#967D67]">
                              {f.papel || "Fornecedor"}
                            </span>
                            <span className="text-[#967D67] font-sans font-light">&gt;</span>
                            <span className="px-2 py-0.5 font-display text-[0.65rem] uppercase font-bold tracking-wider bg-[#EAE0D2] text-[#261811] rounded-xs border border-[#967D67]">
                              {f.servico}
                            </span>
                            <span className="text-[#967D67] font-sans font-light">&rarr;</span>
                            <strong className="font-serif font-bold text-base text-[#453126]">
                              {f.empresa}
                            </strong>
                          </div>

                          <span className={`px-2 py-0.5 font-display text-[0.65rem] uppercase tracking-wider font-bold rounded-xs border ${
                            totalPresentes === equipe.length && equipe.length > 0
                              ? "bg-emerald-100 text-emerald-950 border-emerald-600"
                              : totalPresentes > 0
                              ? "bg-blue-100 text-blue-950 border-blue-600"
                              : "bg-amber-100 text-amber-950 border-amber-600"
                          }`}>
                            Equipe: {totalPresentes} de {equipe.length} no local
                          </span>
                        </div>

                        {/* Linha 2: Alerta de Chegada Antecipada e Telefone para Emergência */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-serif">
                          {f.instrucaoChegada ? (
                            <div className="p-1.5 bg-amber-50 border border-amber-500 text-amber-950 text-[0.72rem] font-medium flex items-center gap-1.5 rounded-xs">
                              <span>⚡ <strong>Chegada Antecipada:</strong> {f.instrucaoChegada}</span>
                            </div>
                          ) : (
                            <span className="text-[#543D30]">Entrada prevista: {f.horarioPrevisto || "Horário padrão"}</span>
                          )}

                          {f.telefone && (
                            <div className="flex items-center gap-2">
                              <span>Contato:</span>
                              <a
                                href={`tel:${f.telefone.replace(/[^0-9]/g, '')}`}
                                className="underline font-bold text-[#261811] hover:text-[#543D30]"
                              >
                                {f.telefone}
                              </a>
                              <a
                                href={`https://wa.me/55${f.telefone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[0.62rem] font-display uppercase tracking-wider font-bold hover:bg-emerald-800"
                              >
                                Chamar no WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Linha 3: Lista Nominal da Equipe */}
                        <div className="space-y-1.5 pt-1">
                          <p className="font-display text-[0.62rem] uppercase tracking-wider text-[#543D30] font-bold">
                            Membros da Equipe (Check-in Individual):
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {equipe.map((m: MembroEquipeFornecedor) => {
                              const isPresente = Boolean(m.presente);
                              return (
                                <div
                                  key={m.id}
                                  onClick={() => f.id && handleToggleMembroFornecedor(f.id, m.id, isPresente)}
                                  className={`p-2 border rounded-sm cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                    isPresente
                                      ? "bg-emerald-50 border-emerald-600 shadow-xs"
                                      : "bg-white border-[#967D67] hover:border-[#261811]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isPresente}
                                      onChange={() => {}}
                                      className="w-3.5 h-3.5 accent-[#261811] cursor-pointer"
                                    />
                                    <div>
                                      <p className="font-serif text-xs font-bold text-[#261811]">
                                        {m.nome}
                                      </p>
                                      {m.funcao && (
                                        <span className="text-[0.65rem] text-[#543D30] block">
                                          {m.funcao}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    {isPresente ? (
                                      <span className="inline-block px-1.5 py-0.2 font-display text-[0.58rem] tracking-wider uppercase font-bold bg-emerald-600 text-white rounded-xs">
                                        Chegou
                                      </span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.2 font-display text-[0.58rem] tracking-wider uppercase font-bold bg-[#8C2D19] text-white rounded-xs">
                                        Aguardando
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Adicionar Membro Extra na Equipe */}
                          {f.id && (
                            <div className="pt-1.5 flex gap-1.5 items-center">
                              <input
                                type="text"
                                placeholder="+ Nome de assistente / ajudante extra"
                                value={membroExtraNome[f.id] || ""}
                                onChange={(e) => setMembroExtraNome({ ...membroExtraNome, [f.id!]: e.target.value })}
                                className="flex-1 bg-white border border-[#967D67] px-2 py-1 text-xs text-[#261811] font-serif"
                              />
                              <input
                                type="text"
                                placeholder="Função"
                                value={membroExtraFuncao[f.id] || ""}
                                onChange={(e) => setMembroExtraFuncao({ ...membroExtraFuncao, [f.id!]: e.target.value })}
                                className="w-28 bg-white border border-[#967D67] px-2 py-1 text-xs text-[#261811] font-serif"
                              />
                              <button
                                type="button"
                                onClick={() => handleAdicionarMembroExtra(f.id!)}
                                className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1 font-display text-[0.62rem] uppercase tracking-wider font-bold rounded-sm cursor-pointer"
                              >
                                + Adicionar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: PLACAR DE AUDITORIA PARA O BUFFET */}
            {tab === "auditoria" && (
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#967D67] pb-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#261811]">
                      Conferência Oficial para o Buffet
                    </h3>
                    <p className="font-serif italic text-xs text-[#543D30]">
                      Contagem real de pagantes integrais e cortesias para fechamento de conta.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopiarWhatsApp}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 font-display text-xs tracking-wider uppercase font-bold rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {copiadoWhatsApp ? "✓ Texto Copiado!" : "Copiar p/ WhatsApp"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCompartilharWhatsApp}
                      className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1.5 font-display text-xs tracking-wider uppercase font-bold rounded-sm transition-colors cursor-pointer"
                    >
                      Abrir no WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={carregarAuditoria}
                      disabled={carregandoAuditoria}
                      className="text-xs text-[#261811] underline hover:text-[#543D30] font-serif ml-2"
                    >
                      {carregandoAuditoria ? "Atualizando..." : "Recarregar"}
                    </button>
                  </div>
                </div>

                {relatorio ? (
                  <div className="space-y-4">
                    {/* Grid de Métricas Principais */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-[#EAE0D2] border border-[#967D67] text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30] font-bold block">
                          Total Convidado
                        </span>
                        <strong className="font-serif text-2xl text-[#261811]">
                          {relatorio.totalConvidadosPrevistos}
                        </strong>
                        <span className="block text-[0.65rem] text-[#543D30]">
                          ({relatorio.totalAdultosPrevistos} ad / {relatorio.totalCriancasPrevistas} cr)
                        </span>
                      </div>

                      <div className="p-3 bg-[#EAE0D2] border border-[#967D67] text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30] font-bold block">
                          Confirmados RSVP
                        </span>
                        <strong className="font-serif text-2xl text-blue-950">
                          {relatorio.totalConfirmadosRsvp}
                        </strong>
                        <span className="block text-[0.65rem] text-[#543D30]">
                          ({relatorio.totalAdultosConfirmados} ad / {relatorio.totalCriancasConfirmadas} cr)
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-100 border-2 border-emerald-600 text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-emerald-950 font-bold block">
                          Presentes Reais
                        </span>
                        <strong className="font-serif text-2xl text-emerald-950">
                          {relatorio.totalPresentesReais}
                        </strong>
                        <span className="block text-[0.65rem] text-emerald-900 font-bold">
                          ({relatorio.totalAdultosPresentes} ad / {relatorio.totalCriancasPresentes} cr)
                        </span>
                      </div>

                      <div className="p-3 bg-red-100 border border-red-500 text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-red-950 font-bold block">
                          Faltaram no Dia
                        </span>
                        <strong className="font-serif text-2xl text-red-950">
                          {relatorio.totalAusentesNoShow}
                        </strong>
                        <span className="block text-[0.65rem] text-red-900">
                          (No-Show confirmado)
                        </span>
                      </div>
                    </div>

                    {/* Explicação de Acerto de Contas */}
                    <div className="p-3 bg-[#FAF7F0] border border-[#967D67] text-xs font-serif text-[#453126]">
                      <strong>Métrica do Buffet:</strong> Cobrança final deve se basear nos <strong>{relatorio.totalPresentesReais} presentes reais</strong> ({relatorio.totalAdultosPresentes} adultos pagantes integrais e {relatorio.totalCriancasPresentes} crianças).
                    </div>

                    {/* Tabela de Famílias */}
                    <div className="max-h-[300px] overflow-y-auto border border-[#967D67] bg-[#FFF] text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#EAE0D2] font-display text-[0.65rem] uppercase tracking-wider text-[#261811] sticky top-0">
                          <tr>
                            <th className="p-2 border-b border-[#967D67]">Família</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Previstos</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Confirmados</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Presentes</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Faltaram</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE0D2] font-serif">
                          {relatorio.familias.map((f: any) => (
                            <tr key={f.codigo} className="hover:bg-[#FAF7F0]">
                              <td className="p-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="text-[#261811]">{f.familia}</strong>
                                  {f.papel && (
                                    <span className="px-1.5 py-0.2 bg-[#261811] text-[#F8F4EC] border border-[#967D67] rounded-xs text-[0.58rem] font-display uppercase tracking-wider font-bold">
                                      {f.papel}
                                    </span>
                                  )}
                                </div>
                                <span className="block text-[0.65rem] text-[#543D30]">#{f.codigo}</span>
                              </td>
                              <td className="p-2 text-center text-[#543D30]">{f.totalMembros}</td>
                              <td className="p-2 text-center text-blue-900 font-semibold">{f.confirmadosRsvp}</td>
                              <td className="p-2 text-center text-emerald-900 font-bold">{f.presentesCheckin}</td>
                              <td className="p-2 text-center text-red-900 font-semibold">{f.ausentesNoShow}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="font-serif italic text-sm text-[#543D30]">
                    Carregando dados da auditoria...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#967D67] pt-3 mt-4 flex justify-between items-center text-xs text-[#543D30] font-serif shrink-0">
          <span>Sistema Integrado com AWS &amp; Portaria</span>
          <button onClick={close} className="underline text-[#261811] hover:text-[#543D30] font-semibold cursor-pointer">
            Voltar ao Convite
          </button>
        </div>
      </div>
    </div>
  );
}
