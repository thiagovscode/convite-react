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
  renovarTokenAdmin,
  buscarRelatorioRsvpAdmin,
  buscarMetricasAdmin,
  cadastrarConviteAdmin,
  excluirConviteAdmin,
  listarConvitesAdmin,
  CONVITE_ADMIN_TOKEN_KEY,
  CONVITE_ADMIN_REFRESH_KEY,
} from "../../services/api";
import type {
  AdminRsvpResponse,
  DashboardMetricas,
  RsvpAdminItem,
  AcompanhanteResponse,
} from "../../services/api";
import {
  loginRecepcaoBackend,
  renovarTokenRecepcao,
  buscarRelatorioAuditoriaBackend,
  buscarParticipantesCerimoniaBackend,
  buscarFornecedoresBackend,
  validarSessaoRecepcaoBackend,
  RECEPCAO_JWT_STORAGE_KEY,
  RECEPCAO_REFRESH_STORAGE_KEY,
} from "../../services/convites";
import type {
  RelatorioAuditoria,
  ParticipanteCerimonia,
  FornecedorCasamento,
} from "../../services/convites";
import { getLinkConviteCompleto } from "./utils/formatters";

// Extrai o timestamp de expiração (em milissegundos) da claim 'exp' do payload JWT
function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

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

  const gerarIdMembro = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `m-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const [novoConvite, setNovoConvite] = useState<NovoConviteFormState>(() => ({
    familia: "",
    telefone: "",
    email: "",
    observacao: "",
    membros: [{ id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}`), nome: "", criancaAte6Anos: false, papel: "Convidado", participaCortejo: false }],
  }));
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
      const adminToken = localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
      const recepcaoToken =
        sessionStorage.getItem(RECEPCAO_JWT_STORAGE_KEY) ||
        localStorage.getItem(RECEPCAO_JWT_STORAGE_KEY);

      if (adminToken) {
        let tokenValido = adminToken;
        const exp = parseJwtExp(adminToken);
        if (exp && exp <= Date.now()) {
          const novoToken = await renovarTokenAdmin();
          if (novoToken) {
            tokenValido = novoToken;
          } else {
            tokenValido = "";
            setAuthError("Sua sessão expirou. Faça login novamente.");
          }
        }
        if (tokenValido) {
          try {
            setUserRole("admin");
            setIsLogged(true);
            setActiveTab("dashboard");
            await carregarDadosAdmin(tokenValido);
            carregarClassificacoes();
            carregarFornecedores();
            return;
          } catch {
            localStorage.removeItem(CONVITE_ADMIN_TOKEN_KEY);
            localStorage.removeItem(CONVITE_ADMIN_REFRESH_KEY);
          }
        }
      }

      if (recepcaoToken) {
        const valida = await validarSessaoRecepcaoBackend();
        if (valida) {
          setUserRole("recepcao");
          setIsLogged(true);
          setActiveTab("portaria");
          carregarDadosOperacionais();
        } else {
          setAuthError("Sua sessão expirou. Faça login novamente.");
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

  // ─── GERENCIAMENTO AUTOMÁTICO DE SESSÃO COM RENOVAÇÃO VIA REFRESH TOKEN ─────
  useEffect(() => {
    if (!isLogged) return;

    const checarERenovarSessao = async () => {
      const token =
        localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY) ||
        sessionStorage.getItem(RECEPCAO_JWT_STORAGE_KEY) ||
        localStorage.getItem(RECEPCAO_JWT_STORAGE_KEY);

      if (!token) {
        handleLogout();
        return;
      }

      const expMs = parseJwtExp(token);
      if (!expMs) return;

      const tempoRestante = expMs - Date.now();

      // Se restar menos de 2 minutos ou se já expirou, renova silenciosamente
      if (tempoRestante <= 120000) {
        if (userRole === "admin") {
          const novoToken = await renovarTokenAdmin();
          if (!novoToken) {
            handleLogout("Sua sessão expirou. Faça login novamente.");
          }
        } else {
          const novoToken = await renovarTokenRecepcao();
          if (!novoToken) {
            handleLogout("Sua sessão expirou. Faça login novamente.");
          }
        }
      }
    };

    // Checa a cada 30s se o token precisa ser renovado preventivamente
    const interval = setInterval(checarERenovarSessao, 30000);

    const handleSessaoExpirada = () => {
      handleLogout("Sua sessão expirou. Faça login novamente.");
    };

    window.addEventListener("sessao-jwt-expirada", handleSessaoExpirada);

    return () => {
      clearInterval(interval);
      window.removeEventListener("sessao-jwt-expirada", handleSessaoExpirada);
    };
  }, [isLogged, userRole]);

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

  const handleLogout = (motivo?: string) => {
    localStorage.removeItem(CONVITE_ADMIN_TOKEN_KEY);
    localStorage.removeItem(CONVITE_ADMIN_REFRESH_KEY);
    sessionStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
    sessionStorage.removeItem(RECEPCAO_REFRESH_STORAGE_KEY);
    localStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
    localStorage.removeItem(RECEPCAO_REFRESH_STORAGE_KEY);
    setIsLogged(false);
    setUserRole("admin");
    setData(null);
    setMetricasBackend(null);
    setAuthError(motivo || "");
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
      const res = await cadastrarConviteAdmin({
        id: conviteEmEdicao ? conviteEmEdicao.id : undefined,
        codigo: conviteEmEdicao ? conviteEmEdicao.codigo : undefined,
        familia: novoConvite.familia.trim(),
        telefone: novoConvite.telefone.trim() || undefined,
        email: novoConvite.email.trim() || undefined,
        observacao: novoConvite.observacao.trim() || undefined,
        membros: novoConvite.membros.map((m) => {
          const papelMembro = m.papel || "Convidado";
          const ehCortejo = isPapelCortejo(papelMembro, papeis);
          const idValido = m.id && m.id !== "1" && !/^\d+$/.test(m.id) ? m.id : gerarIdMembro();
          return {
            id: idValido,
            nome: m.nome.trim(),
            criancaAte6Anos: m.criancaAte6Anos,
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
        observacao: "",
        membros: [{ id: gerarIdMembro(), nome: "", criancaAte6Anos: false, papel: "Convidado", par: "", participaCortejo: false }],
      });
      await carregarDadosAdmin();
    } catch (err: any) {
      setCadErro(err.message || "Erro ao salvar convite.");
    } finally {
      setCadLoading(false);
    }
  };

  const handleNovoConvite = () => {
    setConviteEmEdicao(null);
    setCadErro("");
    setCadSucesso(null);
    setNovoConvite({
      familia: "",
      telefone: "",
      email: "",
      observacao: "",
      membros: [{ id: gerarIdMembro(), nome: "", criancaAte6Anos: false, papel: "Convidado", par: "", participaCortejo: false }],
    });
  };

  const handleIniciarEdicao = (c: ConviteCadastrado) => {
    setConviteEmEdicao(c);
    setNovoConvite({
      familia: c.familia || "",
      telefone: c.telefone || "",
      email: c.email || "",
      observacao: c.observacao || "",
      membros: c.membros?.length
        ? c.membros.map((m) => {
            const papelNormalizado = (m.papel === "Convidado comum" || !m.papel) ? "Convidado" : m.papel;
            const ehCortejo = isPapelCortejo(papelNormalizado, papeis);
            const idValido = m.id && m.id !== "1" && !/^\d+$/.test(m.id) ? m.id : gerarIdMembro();
            return {
              id: idValido,
              nome: m.nome,
              criancaAte6Anos: Boolean(m.criancaAte6Anos),
              papel: papelNormalizado,
              par: m.par || "",
              participaCortejo: ehCortejo,
            };
          })
        : [{ id: gerarIdMembro(), nome: "", criancaAte6Anos: false, papel: "Convidado", par: "", participaCortejo: false }],
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
  // ─── CÁLCULOS MEMOIZADOS ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalFornecedoresFicam = (fornecedores || []).reduce(
      (acc, f) => acc + (f.equipe?.filter((m) => m.permaneceAteFim).length || 0),
      0
    );
    const totalConvitesFornecedores = (fornecedores || []).length;

    if (metricasBackend) {
      return {
        totalConvites: metricasBackend.totalConvites + totalConvitesFornecedores,
        totalPessoas: metricasBackend.totalPessoas + totalFornecedoresFicam,
        totalConfirmados: metricasBackend.totalConfirmados + totalFornecedoresFicam,
        totalRecusaram: metricasBackend.totalRecusaram,
        totalPendentes: metricasBackend.totalPendentes,
        totalAdultos: metricasBackend.totalAdultosConfirmados + totalFornecedoresFicam,
        totalCriancasAte6Anos: metricasBackend.totalCriancasConfirmadas,
        totalFornecedoresConfirmados: totalFornecedoresFicam,
      };
    }
    const rsvpList: RsvpAdminItem[] = data?.data || data?.rsvps || [];
    const conf = rsvpList.filter((r) => r.presenca);
    const rec = rsvpList.filter((r) => !r.presenca);
    return {
      totalConvites: (listaConvites.length || rsvpList.length) + totalConvitesFornecedores,
      totalPessoas: rsvpList.reduce((acc: number, r: RsvpAdminItem) => acc + (r.totalPessoas || 1), 0) + totalFornecedoresFicam,
      totalConfirmados: conf.reduce((acc: number, r: RsvpAdminItem) => acc + (r.totalPessoas || 1), 0) + totalFornecedoresFicam,
      totalRecusaram: rec.reduce((acc: number, r: RsvpAdminItem) => acc + (r.totalPessoas || 1), 0),
      totalPendentes: 0,
      totalAdultos: conf.reduce((acc: number, r: RsvpAdminItem) => acc + (r.adultos || 1), 0) + totalFornecedoresFicam,
      totalCriancasAte6Anos: conf.reduce((acc: number, r: RsvpAdminItem) => acc + (r.criancasAte6Anos || 0), 0),
      totalFornecedoresConfirmados: totalFornecedoresFicam,
    };
  }, [metricasBackend, data, listaConvites, fornecedores]);

  // Convites gerados para as equipes de fornecedores para visibilidade na aba Convites
  const convitesFornecedores = useMemo<ConviteCadastrado[]>(() => {
    if (!Array.isArray(fornecedores)) return [];
    return fornecedores.map((f) => {
      const temMembrosQueFicam = f.equipe?.some((m) => m.permaneceAteFim);
      const codigoForn = `FORN-${(f.id ? f.id.slice(-6) : f.empresa.replace(/\s+/g, "").slice(0, 6)).toUpperCase()}`;
      return {
        id: `forn-${f.id || f.empresa}`,
        codigo: codigoForn,
        familia: f.empresa,
        telefone: f.telefone || "",
        papel: "Fornecedor",
        status: temMembrosQueFicam ? "CONFIRMADO" : "PENDENTE",
        observacao: [
          f.categoria ? `Categoria: ${f.categoria}` : "",
          f.servico ? `Serviço: ${f.servico}` : "",
          f.horarioPrevisto ? `Horário Previsto: ${f.horarioPrevisto}` : "",
          f.instrucaoChegada ? `Instrução: ${f.instrucaoChegada}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        membros: (f.equipe || []).map((m, idx) => ({
          id: m.id || `fm-${idx}`,
          nome: m.nome,
          criancaAte6Anos: false,
          confirmadoRsvp: m.permaneceAteFim ? true : undefined,
          presenteCheckin: m.presente,
          papel: m.funcao ? `Fornecedor (${m.funcao})` : "Fornecedor",
          participaCortejo: false,
        })),
        ehFornecedor: true,
        fornecedorId: f.id,
      };
    });
  }, [fornecedores]);

  const todosConvites = useMemo(() => {
    return [...listaConvites, ...convitesFornecedores];
  }, [listaConvites, convitesFornecedores]);

  const respostasConvidados = useMemo<RespostaConvidadoItem[]>(() => {
    const itens: RespostaConvidadoItem[] = [];
    const codigosProcessados = new Set<string>();
    const nomesProcessados = new Set<string>();
    const telefonesProcessados = new Set<string>();

    if (Array.isArray(listaConvites)) {
      listaConvites.forEach((c) => {
        const codigo = c.codigo || "—";
        codigosProcessados.add(codigo.toLowerCase());
        const telefone = c.telefone || "";
        if (telefone) {
          telefonesProcessados.add(telefone.replace(/\D/g, ""));
        }
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

            if (m.nome) {
              nomesProcessados.add(m.nome.trim().toLowerCase());
            }

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
      // Se o RSVP possui observação, repassa para o convidado correspondente já cadastrado
      if (r.observacao) {
        const telR = r.telefone ? r.telefone.replace(/\D/g, "") : "";
        const nomeR = r.nome ? r.nome.trim().toLowerCase() : "";
        const itemExistente = itens.find(
          (it) =>
            (nomeR && it.nome.trim().toLowerCase() === nomeR) ||
            (telR && it.telefone && it.telefone.replace(/\D/g, "") === telR)
        );
        if (itemExistente && !itemExistente.observacao) {
          itemExistente.observacao = r.observacao;
        }
      }

      // Só adiciona se tiver código de convite novo que não conste na lista oficial e o convidado não tiver sido processado
      const cod = (r as any).codigoConvite;
      const nomeR = r.nome ? r.nome.trim().toLowerCase() : "";
      const telR = r.telefone ? r.telefone.replace(/\D/g, "") : "";

      if (cod && !codigosProcessados.has(cod.toLowerCase()) && !nomesProcessados.has(nomeR) && (!telR || !telefonesProcessados.has(telR))) {
        codigosProcessados.add(cod.toLowerCase());
        nomesProcessados.add(nomeR);
        if (telR) telefonesProcessados.add(telR);

        const status: "CONFIRMADO" | "RECUSADO" | "PENDENTE" = r.presenca ? "CONFIRMADO" : "RECUSADO";
        itens.push({
          id: `rsvp-${r.id}`,
          codigoConvite: cod,
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
            const nomeA = a.nome ? a.nome.trim().toLowerCase() : "";
            if (!nomesProcessados.has(nomeA)) {
              nomesProcessados.add(nomeA);
              itens.push({
                id: `rsvp-${r.id}-acomp-${aIdx}`,
                codigoConvite: cod,
                nome: a.nome,
                papel: "Convidado",
                participaCortejo: "Não",
                faixaEtaria: a.criancaAte6Anos ? "Criança (0 a 6 anos)" : "Adulto",
                telefone: r.telefone,
                status,
                criancaAte6Anos: a.criancaAte6Anos,
                respondido: true,
              });
            }
          });
        }
      }
    });

    // Adiciona os profissionais de fornecedores que possuem permanência até o fim confirmada
    if (Array.isArray(fornecedores)) {
      fornecedores.forEach((f) => {
        const cod = `FORN-${(f.id ? f.id.slice(-6) : f.empresa.replace(/\s+/g, "").slice(0, 6)).toUpperCase()}`;
        if (Array.isArray(f.equipe)) {
          f.equipe
            .filter((m) => m.permaneceAteFim)
            .forEach((m, idx) => {
              const nomeM = m.nome ? m.nome.trim().toLowerCase() : "";
              if (!nomesProcessados.has(nomeM)) {
                nomesProcessados.add(nomeM);
                itens.push({
                  id: `forn-membro-${f.id || f.empresa}-${m.id || idx}`,
                  codigoConvite: cod,
                  nome: m.nome,
                  papel: `Fornecedor (${m.funcao || f.categoria || "Staff"})`,
                  participaCortejo: "Não",
                  faixaEtaria: "Adulto",
                  telefone: f.telefone || "—",
                  status: "CONFIRMADO",
                  familia: `${f.empresa} (Fornecedor)`,
                  observacao: `Permanece até o fim · ${f.servico || f.categoria || "Equipe"}`,
                  respondido: true,
                  dataConfirmacao: "Confirmado (Staff)",
                });
              }
            });
        }
      });
    }

    return itens;
  }, [listaConvites, data, papeis, fornecedores]);

  const filteredConvites = useMemo(() => {
    if (!buscaConvites.trim()) return todosConvites;
    const q = buscaConvites.toLowerCase().trim();
    return todosConvites.filter(
      (c) =>
        c.familia.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q) ||
        c.membros?.some((m) => m.nome.toLowerCase().includes(q))
    );
  }, [todosConvites, buscaConvites]);

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
                listaConvites={todosConvites}
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
                onNovoConviteClick={handleNovoConvite}
                onAbrirModalExclusao={setConviteParaExcluir}
                feedbackGeral={feedbackGeral}
                onDismissFeedback={() => setFeedbackGeral(null)}
                papeis={papeis}
                vinculos={vinculos}
                onRecarregarDados={carregarDadosAdmin}
                onNavegarParaFornecedores={() => setActiveTab("fornecedores")}
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
