import React, { useState, useEffect, useMemo } from "react";
import type { Tab, UserRole, ConviteCadastrado, NovoConviteFormState } from "./types";
import { AdminHeader } from "./components/AdminHeader";
import { AdminLogin } from "./components/AdminLogin";
import { DeleteConviteModal } from "./components/DeleteConviteModal";
import { DashboardTab } from "./tabs/DashboardTab";
import { ConvitesTab } from "./tabs/ConvitesTab";
import { RsvpTab, type RespostaConvidadoItem } from "./tabs/RsvpTab";
import { PortariaTab } from "./tabs/PortariaTab";
import { CortejoTab } from "./tabs/CortejoTab";
import { FornecedoresTab } from "./tabs/FornecedoresTab";
import { AuditoriaTab } from "./tabs/AuditoriaTab";
import { ConfiguracoesTab } from "./tabs/ConfiguracoesTab";
import {
  buscarClassificacoesBackend,
  isPapelCortejo,
} from "../../services/classificacoes";
import type {
  PapelParticipante,
  VinculoParticipante,
} from "../../services/classificacoes";

// Services
import {
  autenticarAdmin,
  buscarRelatorioRsvpAdmin,
  buscarMetricasAdmin,
  cadastrarConviteAdmin,
  excluirConviteAdmin,
  listarConvitesAdmin,
} from "../../services/api";
import type {
  AdminRsvpResponse,
  DashboardMetricas,
  RsvpAdminItem,
  AcompanhanteResponse,
} from "../../services/api";
import {
  loginRecepcaoBackend,
  buscarRelatorioAuditoriaBackend,
  buscarParticipantesCerimoniaBackend,
  buscarFornecedoresBackend,
  validarSessaoRecepcaoBackend,
  RECEPCAO_JWT_STORAGE_KEY,
} from "../../services/convites";
import type {
  RelatorioAuditoria,
  ParticipanteCerimonia,
  FornecedorCasamento,
} from "../../services/convites";
import { getLinkConviteCompleto } from "./utils/formatters";

export function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Auth State
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Dados Admin (Noivos)
  const [data, setData] = useState<AdminRsvpResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [searchRsvp, setSearchRsvp] = useState("");
  const [metricasBackend, setMetricasBackend] = useState<DashboardMetricas | null>(null);

  // Convites
  const [listaConvites, setListaConvites] = useState<ConviteCadastrado[]>([]);
  const [buscaConvites, setBuscaConvites] = useState("");
  const [feedbackGeral, setFeedbackGeral] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [conviteEmEdicao, setConviteEmEdicao] = useState<ConviteCadastrado | null>(null);
  const [novoConvite, setNovoConvite] = useState<NovoConviteFormState>({
    familia: "",
    telefone: "",
    email: "",
    papel: "Convidados",
    observacao: "",
    membros: [{ id: "1", nome: "", criancaAte6Anos: false, titular: true, papel: "Convidado", participaCortejo: false }],
  });
  const [cadLoading, setCadLoading] = useState(false);
  const [cadErro, setCadErro] = useState("");
  const [cadSucesso, setCadSucesso] = useState<{ codigo: string; link: string; familia: string } | null>(null);

  // Exclusão
  const [conviteParaExcluir, setConviteParaExcluir] = useState<ConviteCadastrado | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const [excluirErro, setExcluirErro] = useState("");

  // Dados Operacionais (Portaria, Cortejo, Fornecedores, Auditoria)
  const [participantes, setParticipantes] = useState<ParticipanteCerimonia[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorCasamento[]>([]);
  const [relatorioAuditoria, setRelatorioAuditoria] = useState<RelatorioAuditoria | null>(null);
  const [auditoriaLoading, setAuditoriaLoading] = useState(false);

  // Classificações (Papéis & Vínculos Dinâmicos)
  const [papeis, setPapeis] = useState<PapelParticipante[]>([]);
  const [vinculos, setVinculos] = useState<VinculoParticipante[]>([]);

  // ─── INICIALIZAÇÃO E SUPORTE A ROTAS (EXCLUSIVAMENTE #admin) ─────────────────
  useEffect(() => {
    const verificarAberturaUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      const querAbrir = params.get("admin") === "true" || hash.includes("admin");

      if (querAbrir) {
        setIsOpen(true);
        document.body.style.overflow = "hidden";
      }
    };

    const tentarRestaurarSessao = async () => {
      const adminToken = localStorage.getItem("CONVITE_ADMIN_TOKEN");
      const recepcaoToken =
        sessionStorage.getItem(RECEPCAO_JWT_STORAGE_KEY) ||
        localStorage.getItem(RECEPCAO_JWT_STORAGE_KEY);

      if (adminToken) {
        try {
          setUserRole("admin");
          setIsLogged(true);
          setActiveTab("dashboard");
          await carregarDadosAdmin(adminToken);
          carregarClassificacoes();
          carregarFornecedores();
          return;
        } catch {
          localStorage.removeItem("CONVITE_ADMIN_TOKEN");
        }
      }

      if (recepcaoToken) {
        const valida = await validarSessaoRecepcaoBackend();
        if (valida) {
          setUserRole("recepcao");
          setIsLogged(true);
          setActiveTab("portaria");
          carregarDadosOperacionais();
        }
      }
    };

    verificarAberturaUrl();
    tentarRestaurarSessao();

    const handleOpenAdminPanel = () => {
      setIsOpen(true);
      document.body.style.overflow = "hidden";
    };

    window.addEventListener("popstate", verificarAberturaUrl);
    window.addEventListener("hashchange", verificarAberturaUrl);
    window.addEventListener("open-admin-panel", handleOpenAdminPanel);

    return () => {
      window.removeEventListener("popstate", verificarAberturaUrl);
      window.removeEventListener("hashchange", verificarAberturaUrl);
      window.removeEventListener("open-admin-panel", handleOpenAdminPanel);
      document.body.style.overflow = "";
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";

    const url = new URL(window.location.href);
    if (url.hash.includes("admin")) {
      url.hash = "";
    }
    url.searchParams.delete("admin");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  };

  // ─── LOGIN UNIFICADO COM ROTEAMENTO DE TELA INICIAL ──────────────────────────
  const handleLogin = async (usr: string, pass: string) => {
    setAuthError("");
    setAuthLoading(true);

    const userLimpo = usr.trim().toLowerCase();
    const isProvavelRecepcao = userLimpo.includes("recep") || userLimpo.includes("portar");

    try {
      if (isProvavelRecepcao) {
        const res = await loginRecepcaoBackend(usr.trim(), pass);
        if (res.success) {
          setUserRole("recepcao");
          setIsLogged(true);
          setActiveTab("portaria"); // TELA INICIAL DA RECEPÇÃO
          carregarDadosOperacionais();
          return;
        }
        const adminToken = await autenticarAdmin(usr.trim(), pass);
        setUserRole("admin");
        setIsLogged(true);
        setActiveTab("dashboard"); // TELA INICIAL DOS NOIVOS
        await carregarDadosAdmin(adminToken);
        carregarClassificacoes();
        carregarFornecedores();
      } else {
        try {
          const adminToken = await autenticarAdmin(usr.trim(), pass);
          setUserRole("admin");
          setIsLogged(true);
          setActiveTab("dashboard"); // TELA INICIAL DOS NOIVOS
          await carregarDadosAdmin(adminToken);
          carregarClassificacoes();
          carregarFornecedores();
        } catch (adminErr: any) {
          const res = await loginRecepcaoBackend(usr.trim(), pass);
          if (res.success) {
            setUserRole("recepcao");
            setIsLogged(true);
            setActiveTab("portaria"); // TELA INICIAL DA RECEPÇÃO
            carregarDadosOperacionais();
            return;
          }
          throw adminErr;
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Usuário ou senha inválidos.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("CONVITE_ADMIN_TOKEN");
    sessionStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
    localStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
    setIsLogged(false);
    setUserRole("admin");
    setData(null);
    setMetricasBackend(null);
    setAuthError("");
  };

  // ─── CARREGADORES DE DADOS ───────────────────────────────────────────────────
  const carregarDadosAdmin = async (token?: string) => {
    setDataLoading(true);
    setDataError("");
    try {
      const [result, convitesRes, metricasRes] = await Promise.all([
        buscarRelatorioRsvpAdmin(token),
        listarConvitesAdmin(token).catch(() => []),
        buscarMetricasAdmin(token).catch(() => null),
      ]);
      setData(result);
      if (Array.isArray(convitesRes)) setListaConvites(convitesRes);
      if (metricasRes) setMetricasBackend(metricasRes);
    } catch (err: any) {
      setDataError(err.message || "Erro ao carregar dados administrativos.");
    } finally {
      setDataLoading(false);
    }
  };

  const carregarDadosOperacionais = () => {
    carregarAuditoria();
    carregarParticipantes();
    carregarFornecedores();
    carregarClassificacoes();
  };

  const carregarClassificacoes = async () => {
    try {
      const classif = await buscarClassificacoesBackend();
      if (classif && classif.papeis) setPapeis(classif.papeis);
      if (classif && classif.vinculos) setVinculos(classif.vinculos);
    } catch (err) {
      console.error("Erro ao carregar classificações:", err);
    }
  };

  const carregarAuditoria = async () => {
    setAuditoriaLoading(true);
    const aud = await buscarRelatorioAuditoriaBackend();
    if (aud) setRelatorioAuditoria(aud);
    setAuditoriaLoading(false);
  };

  const carregarParticipantes = async () => {
    const dataPart = await buscarParticipantesCerimoniaBackend();
    if (dataPart && dataPart.participantes) {
      setParticipantes(dataPart.participantes);
    }
  };

  const carregarFornecedores = async () => {
    const dataForn = await buscarFornecedoresBackend();
    if (dataForn && dataForn.fornecedores) {
      setFornecedores(dataForn.fornecedores);
    }
  };

  // ─── CRUD DE CONVITES ────────────────────────────────────────────────────────
  const handleSalvarConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadErro("");
    setCadSucesso(null);

    if (!novoConvite.familia.trim()) {
      setCadErro("Informe o nome da família ou convidado principal.");
      return;
    }
    if (novoConvite.membros.some((m) => !m.nome.trim())) {
      setCadErro("Preencha o nome de todos os membros.");
      return;
    }

    setCadLoading(true);
    try {
      const papelCortejoMembro = novoConvite.membros.find((m) => isPapelCortejo(m.papel || "Convidado", papeis))?.papel;
      const papelDerivado = papelCortejoMembro || novoConvite.membros[0]?.papel || "Convidado";

      const res = await cadastrarConviteAdmin({
        codigo: conviteEmEdicao ? conviteEmEdicao.codigo : undefined,
        familia: novoConvite.familia.trim(),
        telefone: novoConvite.telefone.trim() || undefined,
        email: novoConvite.email.trim() || undefined,
        papel: papelDerivado,
        observacao: novoConvite.observacao.trim() || undefined,
        membros: novoConvite.membros.map((m, idx) => {
          const papelMembro = m.papel || "Convidado";
          const ehCortejo = isPapelCortejo(papelMembro, papeis);
          return {
            id: m.id,
            nome: m.nome.trim(),
            criancaAte6Anos: m.criancaAte6Anos,
            titular: idx === 0,
            papel: papelMembro,
            par: m.par?.trim() || undefined,
            participaCortejo: ehCortejo,
          };
        }),
      });

      const link = getLinkConviteCompleto(res.codigo);
      setCadSucesso({ codigo: res.codigo, link, familia: novoConvite.familia });
      setConviteEmEdicao(null);
      setNovoConvite({
        familia: "",
        telefone: "",
        email: "",
        papel: "Convidados",
        observacao: "",
        membros: [{ id: "1", nome: "", criancaAte6Anos: false, titular: true, papel: "Convidado", par: "", participaCortejo: false }],
      });
      await carregarDadosAdmin();
    } catch (err: any) {
      setCadErro(err.message || "Erro ao salvar convite.");
    } finally {
      setCadLoading(false);
    }
  };

  const handleIniciarEdicao = (c: ConviteCadastrado) => {
    setConviteEmEdicao(c);
    setNovoConvite({
      familia: c.familia || "",
      telefone: c.telefone || "",
      email: c.email || "",
      papel: c.papel || "Convidados",
      observacao: c.observacao || "",
      membros: c.membros?.length
        ? c.membros.map((m, idx) => {
            const papelNormalizado = (m.papel === "Convidado comum" || !m.papel) ? "Convidado" : m.papel;
            const ehCortejo = isPapelCortejo(papelNormalizado, papeis);
            return {
              id: m.id || String(idx + 1),
              nome: m.nome,
              criancaAte6Anos: Boolean(m.criancaAte6Anos),
              titular: idx === 0,
              papel: papelNormalizado,
              par: m.par || "",
              participaCortejo: ehCortejo,
            };
          })
        : [{ id: "1", nome: "", criancaAte6Anos: false, titular: true, papel: "Convidado", par: "", participaCortejo: false }],
    });
  };

  const handleConfirmarExclusao = async () => {
    if (!conviteParaExcluir) return;
    setExcluindoLoading(true);
    setExcluirErro("");
    try {
      await excluirConviteAdmin(conviteParaExcluir.codigo);
      setFeedbackGeral({
        tipo: "sucesso",
        msg: `Convite de "${conviteParaExcluir.familia}" excluído com sucesso.`,
      });
      setConviteParaExcluir(null);
      await carregarDadosAdmin();
    } catch (err: any) {
      setExcluirErro(err.message || "Não foi possível excluir o convite.");
    } finally {
      setExcluindoLoading(false);
    }
  };

  // ─── CÁLCULOS MEMOIZADOS ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (metricasBackend) {
      return {
        totalConvites: metricasBackend.totalConvites,
        totalPessoas: metricasBackend.totalPessoas,
        totalConfirmados: metricasBackend.totalConfirmados,
        totalRecusaram: metricasBackend.totalRecusaram,
        totalPendentes: metricasBackend.totalPendentes,
        totalAdultos: metricasBackend.totalAdultosConfirmados,
        totalCriancasAte6Anos: metricasBackend.totalCriancasConfirmadas,
      };
    }
    const rsvpList: RsvpAdminItem[] = data?.data || data?.rsvps || [];
    const conf = rsvpList.filter((r) => r.presenca);
    const rec = rsvpList.filter((r) => !r.presenca);
    return {
      totalConvites: listaConvites.length || rsvpList.length,
      totalPessoas: rsvpList.reduce((acc: number, r: RsvpAdminItem) => acc + (r.totalPessoas || 1), 0),
      totalConfirmados: conf.reduce((acc: number, r: RsvpAdminItem) => acc + (r.totalPessoas || 1), 0),
      totalRecusaram: rec.reduce((acc: number, r: RsvpAdminItem) => acc + (r.totalPessoas || 1), 0),
      totalPendentes: 0,
      totalAdultos: conf.reduce((acc: number, r: RsvpAdminItem) => acc + (r.adultos || 1), 0),
      totalCriancasAte6Anos: conf.reduce((acc: number, r: RsvpAdminItem) => acc + (r.criancasAte6Anos || 0), 0),
    };
  }, [metricasBackend, data, listaConvites]);

  const respostasConvidados = useMemo<RespostaConvidadoItem[]>(() => {
    const itens: RespostaConvidadoItem[] = [];
    const codigosProcessados = new Set<string>();

    if (Array.isArray(listaConvites)) {
      listaConvites.forEach((c) => {
        const codigo = c.codigo || "—";
        codigosProcessados.add(codigo.toLowerCase());
        const telefone = c.telefone || "";
        const familia = c.familia || "";
        const observacao = c.observacao || "";
        const dataConfirmacao = c.dataConfirmacao;
        const conviteRespondido = c.status === "CONFIRMADO" || c.status === "RECUSADO" || !!dataConfirmacao;

        if (Array.isArray(c.membros) && c.membros.length > 0) {
          c.membros.forEach((m: any, idx: number) => {
            let status: "CONFIRMADO" | "RECUSADO" | "PENDENTE" = "PENDENTE";

            if (c.status === "RECUSADO") {
              status = "RECUSADO";
            } else if (c.status === "CONFIRMADO") {
              if (m.confirmadoRsvp === true) {
                status = "CONFIRMADO";
              } else if (m.confirmadoRsvp === false) {
                status = "RECUSADO";
              } else {
                status = "RECUSADO";
              }
            } else if (m.confirmadoRsvp === true) {
              status = "CONFIRMADO";
            } else if (m.confirmadoRsvp === false) {
              status = "RECUSADO";
            }

            const papel = m.papel || "Convidado";
            const cortejoAtivo = m.participaCortejo !== undefined ? Boolean(m.participaCortejo) : isPapelCortejo(papel, papeis);
            const participaCortejo: "Sim" | "Não" = cortejoAtivo ? "Sim" : "Não";
            const faixaEtaria = m.criancaAte6Anos ? "Criança (0 a 6 anos)" : "Adulto";

            itens.push({
              id: `${c.id || codigo}-${m.id || idx}`,
              codigoConvite: codigo,
              nome: m.nome,
              papel,
              participaCortejo,
              faixaEtaria,
              telefone,
              status,
              familia,
              observacao,
              criancaAte6Anos: m.criancaAte6Anos,
              dataConfirmacao,
              respondido: conviteRespondido || status !== "PENDENTE",
            });
          });
        }
      });
    }

    const rsvpList: RsvpAdminItem[] = data?.data || data?.rsvps || [];
    rsvpList.forEach((r) => {
      const cod = (r as any).codigoConvite;
      if (!cod || !codigosProcessados.has(cod.toLowerCase())) {
        const status: "CONFIRMADO" | "RECUSADO" | "PENDENTE" = r.presenca ? "CONFIRMADO" : "RECUSADO";
        itens.push({
          id: `rsvp-${r.id}`,
          codigoConvite: cod || "—",
          nome: r.nome,
          papel: "Convidado",
          participaCortejo: "Não",
          faixaEtaria: "Adulto",
          telefone: r.telefone,
          status,
          observacao: r.observacao,
          respondido: true,
        });

        if (r.acompanhantes && r.acompanhantes.length > 0) {
          r.acompanhantes.forEach((a, aIdx) => {
            itens.push({
              id: `rsvp-${r.id}-acomp-${aIdx}`,
              codigoConvite: cod || "—",
              nome: a.nome,
              papel: "Convidado",
              participaCortejo: "Não",
              faixaEtaria: a.criancaAte6Anos ? "Criança (0 a 6 anos)" : "Adulto",
              telefone: r.telefone,
              status,
              criancaAte6Anos: a.criancaAte6Anos,
              respondido: true,
            });
          });
        }
      }
    });

    return itens;
  }, [listaConvites, data, papeis]);

  const filteredConvites = useMemo(() => {
    if (!buscaConvites.trim()) return listaConvites;
    const q = buscaConvites.toLowerCase().trim();
    return listaConvites.filter(
      (c) =>
        c.familia.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q) ||
        c.membros?.some((m) => m.nome.toLowerCase().includes(q))
    );
  }, [listaConvites, buscaConvites]);

  if (!isOpen) return null;

  const tabsDisponiveis: { id: Tab; label: string }[] =
    userRole === "recepcao"
      ? [
          { id: "portaria", label: "Portaria & Check-in" },
          { id: "cortejo", label: "Cortejo" },
          { id: "fornecedores", label: "Fornecedores" },
          { id: "auditoria", label: "Buffet" },
        ]
      : [
          { id: "dashboard", label: "Visão Geral" },
          { id: "convites", label: "Convites" },
          { id: "rsvp", label: "Presenças" },
          { id: "fornecedores", label: "Fornecedores" },
          { id: "configuracoes", label: "Papéis" },
        ];

  return (
    <div
      className="fixed inset-0 z-[99999] bg-[#FAF7F2] text-[#261811] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label="Painel Administrativo"
    >
      <AdminHeader
        isLogged={isLogged}
        userRole={userRole}
        activeTab={activeTab}
        tabsDisponiveis={tabsDisponiveis}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        onClose={close}
      />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-8 w-full">
        {!isLogged ? (
          <AdminLogin onLogin={handleLogin} loading={authLoading} error={authError} />
        ) : (
          <>
            {dataError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-300 rounded-[8px] text-sm text-rose-900 font-medium">
                {dataError}
              </div>
            )}

            {activeTab === "dashboard" && <DashboardTab stats={stats} />}

            {activeTab === "convites" && (
              <ConvitesTab
                listaConvites={listaConvites}
                filteredConvites={filteredConvites}
                buscaConvites={buscaConvites}
                onBuscaChange={setBuscaConvites}
                conviteEmEdicao={conviteEmEdicao}
                novoConvite={novoConvite}
                onNovoConviteChange={setNovoConvite}
                cadLoading={cadLoading}
                cadErro={cadErro}
                cadSucesso={cadSucesso}
                onSalvarConvite={handleSalvarConvite}
                onIniciarEdicao={handleIniciarEdicao}
                onAbrirModalExclusao={setConviteParaExcluir}
                feedbackGeral={feedbackGeral}
                onDismissFeedback={() => setFeedbackGeral(null)}
                papeis={papeis}
                vinculos={vinculos}
                onRecarregarDados={carregarDadosAdmin}
              />
            )}

            {activeTab === "rsvp" && (
              <RsvpTab
                respostas={respostasConvidados}
                search={searchRsvp}
                onSearchChange={setSearchRsvp}
                loading={dataLoading}
              />
            )}

            {activeTab === "portaria" && (
              <PortariaTab
                onRefreshData={() => {
                  carregarDadosOperacionais();
                  if (userRole === "admin") carregarDadosAdmin();
                }}
              />
            )}

            {activeTab === "cortejo" && (
              <CortejoTab
                participantes={participantes}
                onParticipantesChange={setParticipantes}
                onRefreshAuditoria={carregarAuditoria}
              />
            )}

            {activeTab === "fornecedores" && (
              <FornecedoresTab
                userRole={userRole}
                fornecedores={fornecedores}
                onFornecedoresChange={setFornecedores}
                onRefreshAuditoria={carregarAuditoria}
                onRefreshFornecedores={carregarFornecedores}
              />
            )}

            {activeTab === "auditoria" && (
              <AuditoriaTab
                relatorio={relatorioAuditoria}
                loading={auditoriaLoading}
                onRefresh={carregarAuditoria}
              />
            )}

            {activeTab === "configuracoes" && (
              <ConfiguracoesTab
                papeis={papeis}
                vinculos={vinculos}
                onRefresh={carregarClassificacoes}
              />
            )}
          </>
        )}
      </main>

      <DeleteConviteModal
        convite={conviteParaExcluir}
        loading={excluindoLoading}
        error={excluirErro}
        onCancel={() => setConviteParaExcluir(null)}
        onConfirm={handleConfirmarExclusao}
      />
    </div>
  );
}
