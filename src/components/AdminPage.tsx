import React, { useState, useEffect } from "react";
import {
  autenticarAdmin,
  buscarRelatorioRsvpAdmin,
  cadastrarConviteAdmin,
  listarConvitesAdmin,
  getApiBaseUrl,
} from "../services/api";
import type {
  AdminRsvpResponse,
  NovoMembroAdminRequest,
} from "../services/api";

// ─── tipos internos ──────────────────────────────────────────────────────────
type Tab = "dashboard" | "rsvp" | "convites";

export interface MembroConviteCadastrado {
  id?: string;
  nome: string;
  criancaAte6Anos?: boolean;
  titular?: boolean;
  confirmouPresenca?: boolean;
  papel?: string;
}

export interface ConviteCadastrado {
  id?: string;
  codigo: string;
  familia: string;
  telefone?: string;
  email?: string;
  papel?: string;
  status?: string;
  observacao?: string;
  membros: MembroConviteCadastrado[];
  dataConfirmacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NovoConviteState {
  familia: string;
  telefone: string;
  email: string;
  papel: string;
  observacao: string;
  membros: NovoMembroAdminRequest[];
}

const PAPEL_OPTIONS = [
  "Convidados",
  "Padrinhos",
  "Madrinhas",
  "Pais dos Noivos",
  "Família Próxima",
  "Cortejo",
  "Fornecedor",
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | undefined) {
  return (n ?? 0).toLocaleString("pt-BR");
}

// ─── componentes auxiliares ──────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  color = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "neutral" | "green" | "amber" | "blue" | "rose";
}) {
  const ring: Record<string, string> = {
    neutral: "border-[#D8CDC0]",
    green: "border-emerald-300",
    amber: "border-amber-300",
    blue: "border-sky-300",
    rose: "border-rose-300",
  };
  const val: Record<string, string> = {
    neutral: "text-[#261811]",
    green: "text-emerald-800",
    amber: "text-amber-800",
    blue: "text-sky-800",
    rose: "text-rose-800",
  };
  return (
    <div
      className={`bg-white border ${ring[color]} rounded-[8px] p-5 flex flex-col gap-1 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]`}
    >
      <span className="text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold">
        {label}
      </span>
      <span className={`text-3xl font-serif font-light ${val[color]}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[0.75rem] font-serif text-[#8C7A6B] italic">
          {sub}
        </span>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-1 h-5 bg-[#261811] rounded-full inline-block" />
      <h2 className="font-serif text-xl text-[#261811] font-normal tracking-[-0.01em]">
        {children}
      </h2>
    </div>
  );
}

// ─── componente principal ────────────────────────────────────────────────────
export default function AdminPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");

  // auth
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // data
  const [data, setData] = useState<AdminRsvpResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");

  // convites cadastrados
  const [convitesSubTab, setConvitesSubTab] = useState<"lista" | "novo">("lista");
  const [listaConvites, setListaConvites] = useState<ConviteCadastrado[]>([]);
  const [buscaConvites, setBuscaConvites] = useState("");
  const [copiadoLinkPorCodigo, setCopiadoLinkPorCodigo] = useState<Record<string, string>>({});

  // cadastro
  const [novoConvite, setNovoConvite] = useState<NovoConviteState>({
    familia: "",
    telefone: "",
    email: "",
    papel: "Convidados",
    observacao: "",
    membros: [{ id: "1", nome: "", criancaAte6Anos: false, titular: true }],
  });
  const [cadLoading, setCadLoading] = useState(false);
  const [cadErro, setCadErro] = useState("");
  const [cadSucesso, setCadSucesso] = useState<{
    codigo: string;
    link: string;
    familia: string;
  } | null>(null);
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);

  // ─── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      document.body.style.overflow = "hidden";
      if (!window.location.hash.includes("admin")) {
        window.history.pushState({ admin: true }, "", "#admin");
      }
    };

    const checkHash = () => {
      const isAdmin =
        window.location.hash.includes("admin") ||
        new URLSearchParams(window.location.search).get("admin") === "true";
      if (isAdmin) {
        setIsOpen(true);
        document.body.style.overflow = "hidden";
        const token = localStorage.getItem("CONVITE_ADMIN_TOKEN");
        if (token) {
          setIsLogged(true);
          loadData(token);
        }
      } else {
        setIsOpen(false);
        document.body.style.overflow = "";
      }
    };

    checkHash();
    window.addEventListener("open-admin-page", handleOpen);
    window.addEventListener("popstate", checkHash);
    return () => {
      window.removeEventListener("open-admin-page", handleOpen);
      window.removeEventListener("popstate", checkHash);
    };
  }, []);

  // ─── actions ────────────────────────────────────────────────────────────────
  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";
    if (window.location.hash.includes("admin")) {
      if (window.history.state?.admin) {
        window.history.back();
      } else {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.pathname + (url.search || ""));
      }
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("admin")) {
      url.searchParams.delete("admin");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const token = await autenticarAdmin(username.trim(), password);
      setIsLogged(true);
      await loadData(token);
      setTab("dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Usuário ou senha inválidos.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("CONVITE_ADMIN_TOKEN");
    setIsLogged(false);
    setData(null);
    setPassword("");
    setAuthError("");
  };

  const loadData = async (token?: string) => {
    setDataLoading(true);
    setDataError("");
    try {
      const [result, convitesRes] = await Promise.all([
        buscarRelatorioRsvpAdmin(token),
        listarConvitesAdmin(token).catch((e) => {
          console.warn("Erro ao buscar lista de convites:", e);
          return [];
        }),
      ]);
      setData(result);
      if (Array.isArray(convitesRes)) {
        setListaConvites(convitesRes);
      }
    } catch (err: any) {
      setDataError(err.message || "Erro ao carregar dados.");
      if (
        err.message?.includes("expirada") ||
        err.message?.includes("Autenticação")
      ) {
        setIsLogged(false);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const getLinkConviteCompleto = (codigo: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const base = `${origin}${pathname}`.replace(/\/$/, "");
    return `${base}/?convite=${codigo}`;
  };

  const getLinkRsvpDireto = (codigo: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const base = `${origin}${pathname}`.replace(/\/$/, "");
    return `${base}/?convite=${codigo}#rsvp`;
  };

  const copiarTexto = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoLinkPorCodigo((prev) => ({ ...prev, [chave]: "Copiado" }));
    setTimeout(() => {
      setCopiadoLinkPorCodigo((prev) => {
        const c = { ...prev };
        delete c[chave];
        return c;
      });
    }, 2500);
  };

  const abrirWhatsAppComConvite = (c: ConviteCadastrado) => {
    const link = getLinkConviteCompleto(c.codigo);
    const msg = `Olá, ${c.familia}! Preparamos com muito carinho o nosso convite de casamento. Clique no link para ver os detalhes e confirmar a presença da sua família:\n\n${link}`;
    const telLimpo = (c.telefone || "").replace(/\D/g, "");
    if (telLimpo.length >= 10) {
      window.open(
        `https://wa.me/55${telLimpo}?text=${encodeURIComponent(msg)}`,
        "_blank"
      );
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(msg)}`,
        "_blank"
      );
    }
  };

  const handleCadastrar = async (e: React.FormEvent) => {
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
        familia: novoConvite.familia.trim(),
        telefone: novoConvite.telefone.trim() || undefined,
        email: novoConvite.email.trim() || undefined,
        papel: novoConvite.papel.trim() || undefined,
        observacao: novoConvite.observacao.trim() || undefined,
        membros: novoConvite.membros.map((m) => ({
          nome: m.nome.trim(),
          criancaAte6Anos: m.criancaAte6Anos,
          titular: m.titular,
        })),
      });
      const link = getLinkConviteCompleto(res.codigo);
      setCadSucesso({ codigo: res.codigo, link, familia: novoConvite.familia });
      setNovoConvite({
        familia: "",
        telefone: "",
        email: "",
        papel: "Convidados",
        observacao: "",
        membros: [{ id: "1", nome: "", criancaAte6Anos: false, titular: true }],
      });
      await loadData();
    } catch (err: any) {
      setCadErro(err.message || "Erro ao cadastrar convite.");
    } finally {
      setCadLoading(false);
    }
  };

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiadoFeedback(true);
    setTimeout(() => setCopiadoFeedback(false), 3000);
  };

  const addMembro = () => {
    setNovoConvite((prev) => ({
      ...prev,
      membros: [
        ...prev.membros,
        {
          id: String(Date.now()),
          nome: "",
          criancaAte6Anos: false,
          titular: false,
        },
      ],
    }));
  };

  const removeMembro = (idx: number) => {
    if (novoConvite.membros.length <= 1) return;
    setNovoConvite((prev) => ({
      ...prev,
      membros: prev.membros.filter((_, i) => i !== idx),
    }));
  };

  const updateMembro = (
    idx: number,
    field: keyof NovoMembroAdminRequest,
    value: any
  ) => {
    setNovoConvite((prev) => {
      const membros = [...prev.membros];
      membros[idx] = { ...membros[idx], [field]: value };
      if (field === "titular" && value) {
        membros.forEach((m, i) => {
          if (i !== idx) m.titular = false;
        });
      }
      return { ...prev, membros };
    });
  };

  // ─── filtro da tabela ────────────────────────────────────────────────────────
  const filteredRsvp = data?.data?.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.nome?.toLowerCase().includes(q) ||
      item.telefone?.includes(q) ||
      item.email?.toLowerCase().includes(q)
    );
  });

  const filteredConvites = listaConvites.filter((item) => {
    if (!buscaConvites.trim()) return true;
    const q = buscaConvites.toLowerCase();
    const matchFamilia = item.familia?.toLowerCase().includes(q);
    const matchCodigo = item.codigo?.toLowerCase().includes(q);
    const matchTel = item.telefone?.includes(q);
    const matchMembro = item.membros?.some((m) =>
      m.nome?.toLowerCase().includes(q)
    );
    return matchFamilia || matchCodigo || matchTel || matchMembro;
  });

  if (!isOpen) return null;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[99999] bg-[#F5F0E8] overflow-y-auto">
      {/* ── TOPBAR ── */}
      <header className="sticky top-0 z-40 bg-[#261811] text-[#FAF7F2] shadow-lg">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          {/* Marca */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              className="text-[#D5C6B5] hover:text-white transition-colors p-1 -ml-1 rounded cursor-pointer"
              title="Voltar ao convite"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="h-5 w-px bg-[#453126]" />
            <span className="font-serif text-base sm:text-lg text-[#FAF7F2] tracking-wide">
              Tainara &amp; Thiago
            </span>
            <span className="hidden sm:inline text-[0.65rem] font-sans tracking-[0.2em] uppercase text-[#967D67] font-medium ml-1">
              · Painel Administrativo
            </span>
          </div>

          {/* Nav + ações */}
          {isLogged && (
            <div className="flex items-center gap-1 sm:gap-2">
              {(["dashboard", "rsvp", "convites"] as Tab[]).map((t) => {
                const labels: Record<Tab, string> = {
                  dashboard: "Visão Geral",
                  rsvp: "Presenças",
                  convites: "Convites",
                };
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`text-[0.68rem] sm:text-[0.72rem] font-sans tracking-[0.14em] uppercase px-2.5 sm:px-3.5 py-1.5 rounded-[4px] transition-all cursor-pointer font-medium ${
                      tab === t
                        ? "bg-[#FAF7F2] text-[#261811]"
                        : "text-[#D5C6B5] hover:text-white hover:bg-[#3D281E]"
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
              <div className="h-5 w-px bg-[#453126] mx-1" />
              <button
                onClick={() => loadData()}
                disabled={dataLoading}
                title="Atualizar dados"
                className="text-[#D5C6B5] hover:text-white p-1.5 rounded transition-colors disabled:opacity-40 cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="text-[0.68rem] font-sans tracking-[0.14em] uppercase px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-[#3D281E] rounded-[4px] transition-all cursor-pointer font-medium"
              >
                Sair
              </button>
            </div>
          )}

          {/* Fechar */}
          <button
            type="button"
            onClick={close}
            className="sm:hidden text-[#D5C6B5] hover:text-white transition-colors p-1 rounded cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ── CONTEÚDO ── */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8">
        {/* ── LOGIN ── */}
        {!isLogged ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="w-full max-w-[400px] bg-white border border-[#E3D8CB] rounded-[10px] shadow-[0_8px_40px_-12px_rgba(38,24,17,0.14)] overflow-hidden">
              {/* cabeçalho */}
              <div className="bg-[#261811] px-8 py-8 text-center">
                <span className="font-display text-[0.62rem] tracking-[0.3em] uppercase text-[#967D67] font-bold block mb-2">
                  Área Restrita
                </span>
                <h1 className="font-serif text-2xl text-[#FAF7F2] font-light">
                  Painel dos Noivos
                </h1>
                <p className="font-serif italic text-sm text-[#A8998B] mt-1">
                  Tainara &amp; Thiago · 24.01.2027
                </p>
              </div>

              {/* formulário */}
              <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">
                {authError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-[6px] text-sm text-rose-900 font-medium text-center">
                    {authError}
                  </div>
                )}

                <div>
                  <label className="block text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                    Usuário
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white transition-all rounded-[6px]"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white transition-all rounded-[6px]"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-[0.76rem] tracking-[0.2em] uppercase font-semibold transition-all rounded-[6px] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {authLoading ? "Autenticando..." : "Entrar no Painel"}
                </button>

                <p className="text-center text-[0.76rem] text-[#8C7A6B] font-serif italic">
                  Acesso exclusivo para os noivos.
                </p>
              </form>
            </div>
          </div>
        ) : (
          <>
            {dataError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-300 rounded-[8px] text-sm text-rose-900 font-medium">
                {dataError}
              </div>
            )}

            {/* ── DASHBOARD ── */}
            {tab === "dashboard" && (
              <div className="space-y-8">
                <div>
                  <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
                    Visão Geral
                  </p>
                  <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
                    Resumo do Evento
                  </h1>
                </div>

                {/* cards principais */}
                {data && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <StatCard
                        label="Total Confirmados"
                        value={fmt(data.resumoGeral.totalConfirmados)}
                        sub="confirmaram presença"
                        color="green"
                      />
                      <StatCard
                        label="Não Vão"
                        value={fmt(data.resumoGeral.totalRecusaram)}
                        sub="recusaram"
                        color="rose"
                      />
                      <StatCard
                        label="Adultos Confirmados"
                        value={fmt(data.resumoGeral.totalAdultos)}
                        sub="7 anos ou mais"
                        color="blue"
                      />
                      <StatCard
                        label="Crianças (≤ 6 anos)"
                        value={fmt(data.resumoGeral.totalCriancasAte6Anos)}
                        sub="isentas de lista"
                        color="amber"
                      />
                    </div>

                    {/* barra de progresso de confirmações */}
                    <div className="bg-white border border-[#E3D8CB] rounded-[10px] p-6 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]">
                      <SectionTitle>Taxa de Confirmação</SectionTitle>
                      {(() => {
                        const total =
                          data.resumoGeral.totalConfirmados +
                          data.resumoGeral.totalRecusaram;
                        const pct =
                          total > 0
                            ? Math.round(
                                (data.resumoGeral.totalConfirmados / total) *
                                  100
                              )
                            : 0;
                        return (
                          <div className="space-y-3">
                            <div className="flex items-end justify-between">
                              <span className="font-serif text-4xl text-emerald-800 font-light">
                                {pct}%
                              </span>
                              <span className="font-serif text-sm text-[#8C7A6B] italic pb-1">
                                {data.resumoGeral.totalConfirmados} de {total}{" "}
                                responderam
                              </span>
                            </div>
                            <div className="h-3 bg-[#EAE0D2] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex gap-6 text-xs font-sans text-[#8C7A6B]">
                              <span>
                                <span className="inline-block w-2.5 h-2.5 bg-emerald-600 rounded-full mr-1.5 align-middle" />
                                Confirmados: {data.resumoGeral.totalConfirmados}
                              </span>
                              <span>
                                <span className="inline-block w-2.5 h-2.5 bg-rose-400 rounded-full mr-1.5 align-middle" />
                                Recusaram: {data.resumoGeral.totalRecusaram}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* últimas confirmações */}
                    <div className="bg-white border border-[#E3D8CB] rounded-[10px] p-6 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-5 bg-[#261811] rounded-full inline-block" />
                          <h2 className="font-serif text-xl text-[#261811] font-normal">
                            Últimas Confirmações
                          </h2>
                        </div>
                        <button
                          onClick={() => setTab("rsvp")}
                          className="text-[0.7rem] font-sans tracking-[0.14em] uppercase text-[#6B5A4D] hover:text-[#261811] underline cursor-pointer transition-colors"
                        >
                          Ver todas →
                        </button>
                      </div>
                      <div className="divide-y divide-[#F0EAE0]">
                        {data.data
                          .slice(0, 6)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="py-3.5 flex items-center justify-between gap-4"
                            >
                              <div>
                                <p className="font-serif text-[0.95rem] text-[#261811] font-medium leading-tight">
                                  {item.nome}
                                </p>
                                <p className="text-[0.76rem] text-[#8C7A6B] font-sans mt-0.5">
                                  {item.telefone}
                                  {item.totalPessoas > 1 &&
                                    ` · ${item.totalPessoas} pessoas`}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-[0.68rem] font-sans tracking-wider uppercase px-2.5 py-1 rounded-full font-semibold ${
                                  item.presenca
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {item.presenca ? "Confirmado" : "Não vai"}
                              </span>
                            </div>
                          ))}
                        {data.data.length === 0 && (
                          <p className="py-6 text-center font-serif italic text-sm text-[#8C7A6B]">
                            Nenhuma confirmação recebida ainda.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {dataLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-[#261811] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* ── PRESENÇAS ── */}
            {tab === "rsvp" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
                      Lista de RSVPs
                    </p>
                    <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
                      Confirmações de Presença
                    </h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Buscar por nome, telefone…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-white border border-[#D8CDC0] px-4 py-2.5 text-sm font-serif text-[#261811] focus:outline-none focus:border-[#261811] rounded-[6px] transition-all w-48 sm:w-64"
                    />
                    {data && (
                      <span className="text-[0.74rem] font-sans text-[#8C7A6B] shrink-0">
                        {filteredRsvp?.length ?? 0} registros
                      </span>
                    )}
                  </div>
                </div>

                {/* sumário rápido */}
                {data && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                      label="Confirmados"
                      value={data.resumoGeral.totalConfirmados}
                      color="green"
                    />
                    <StatCard
                      label="Recusaram"
                      value={data.resumoGeral.totalRecusaram}
                      color="rose"
                    />
                    <StatCard
                      label="Adultos"
                      value={data.resumoGeral.totalAdultos}
                      color="blue"
                    />
                    <StatCard
                      label="Crianças ≤ 6 anos"
                      value={data.resumoGeral.totalCriancasAte6Anos}
                      color="amber"
                    />
                  </div>
                )}

                {/* tabela */}
                <div className="bg-white border border-[#E3D8CB] rounded-[10px] overflow-hidden shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]">
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-8 h-8 border-2 border-[#261811] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F5F0E8] border-b border-[#E3D8CB]">
                            <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                              Convidado
                            </th>
                            <th className="text-left px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold hidden sm:table-cell">
                              Telefone
                            </th>
                            <th className="text-center px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                              Pessoas
                            </th>
                            <th className="text-center px-5 py-3 text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0EAE0]">
                          {filteredRsvp?.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-[#FAF7F2] transition-colors"
                            >
                              <td className="px-5 py-4">
                                <p className="font-serif text-[0.95rem] text-[#261811] font-medium">
                                  {item.nome}
                                </p>
                                {item.email && (
                                  <p className="text-[0.73rem] text-[#8C7A6B] font-sans mt-0.5">
                                    {item.email}
                                  </p>
                                )}
                                {item.observacao && (
                                  <p className="text-[0.73rem] italic text-[#967D67] mt-0.5 font-serif">
                                    "{item.observacao}"
                                  </p>
                                )}
                                {item.acompanhantes &&
                                  item.acompanhantes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {item.acompanhantes.map((a, i) => (
                                        <span
                                          key={i}
                                          className="text-[0.68rem] font-sans text-[#6B5A4D] bg-[#F0EAE0] px-2 py-0.5 rounded-full"
                                        >
                                          {a.nome}
                                          {a.criancaAte6Anos && " ·criança"}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </td>
                              <td className="px-5 py-4 text-[0.85rem] text-[#6B5A4D] font-sans hidden sm:table-cell whitespace-nowrap">
                                {item.telefone}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className="font-serif text-[#261811] text-base">
                                  {item.totalPessoas}
                                </span>
                                {item.criancasAte6Anos > 0 && (
                                  <span className="block text-[0.68rem] text-[#8C7A6B] font-sans">
                                    +{item.criancasAte6Anos} cr
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span
                                  className={`inline-block text-[0.68rem] font-sans tracking-wider uppercase px-3 py-1 rounded-full font-semibold ${
                                    item.presenca
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {item.presenca ? "Confirmado" : "Não vai"}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {!filteredRsvp?.length && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-5 py-10 text-center font-serif italic text-[#8C7A6B]"
                              >
                                Nenhuma confirmação encontrada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CONVITES ── */}
            {tab === "convites" && (
              <div className="space-y-6">
                {/* Seletor de Sub-abas: Lista de Convites vs Novo Convite */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E3D8CB] pb-4">
                  <div>
                    <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
                      Gestão de Convites Oficiais
                    </p>
                    <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
                      {convitesSubTab === "lista"
                        ? "Convites Cadastrados & Códigos"
                        : "Cadastrar Novo Convite"}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConvitesSubTab("lista")}
                      className={`text-[0.72rem] font-sans tracking-[0.14em] uppercase px-3.5 py-2 rounded-[6px] font-semibold transition-all cursor-pointer ${
                        convitesSubTab === "lista"
                          ? "bg-[#261811] text-[#FAF7F2] shadow-sm"
                          : "bg-white border border-[#D8CDC0] text-[#6B5A4D] hover:text-[#261811]"
                      }`}
                    >
                      Lista de Convites ({listaConvites.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConvitesSubTab("novo");
                        setCadSucesso(null);
                      }}
                      className={`text-[0.72rem] font-sans tracking-[0.14em] uppercase px-3.5 py-2 rounded-[6px] font-semibold transition-all cursor-pointer ${
                        convitesSubTab === "novo"
                          ? "bg-[#261811] text-[#FAF7F2] shadow-sm"
                          : "bg-white border border-[#D8CDC0] text-[#6B5A4D] hover:text-[#261811]"
                      }`}
                    >
                      + Novo Convite
                    </button>
                  </div>
                </div>

                {/* 1. SUB-ABA: LISTA DE CONVITES CADASTRADOS */}
                {convitesSubTab === "lista" ? (
                  <div className="space-y-6">
                    {/* StatCards no topo da aba Convites */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <StatCard
                        label="Convites Emitidos"
                        value={fmt(listaConvites.length)}
                        sub="famílias cadastradas"
                        color="neutral"
                      />
                      <StatCard
                        label="Pessoas na Lista"
                        value={fmt(
                          listaConvites.reduce(
                            (acc, c) => acc + (c.membros?.length || 0),
                            0
                          )
                        )}
                        sub="familiares cadastrados"
                        color="blue"
                      />
                      <StatCard
                        label="Confirmados"
                        value={fmt(
                          listaConvites.filter(
                            (c) =>
                              (c.status || "").toUpperCase() === "CONFIRMADO"
                          ).length
                        )}
                        sub="já responderam"
                        color="green"
                      />
                      <StatCard
                        label="Pendentes"
                        value={fmt(
                          listaConvites.filter(
                            (c) =>
                              (c.status || "PENDENTE").toUpperCase() ===
                              "PENDENTE"
                          ).length
                        )}
                        sub="aguardando resposta"
                        color="amber"
                      />
                    </div>

                    {/* Painel Unificado Elegante */}
                    <div className="bg-white border border-[#E3D8CB] rounded-[10px] p-6 sm:p-8 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#F0EAE0]">
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-5 bg-[#261811] rounded-full inline-block" />
                          <h2 className="font-serif text-xl text-[#261811] font-normal">
                            Relação de Convites &amp; Códigos
                          </h2>
                          <span className="text-xs text-[#8C7A6B] font-sans">
                            ({filteredConvites.length}{" "}
                            {filteredConvites.length === 1
                              ? "convite"
                              : "convites"}
                            )
                          </span>
                        </div>

                        {/* Campo de Busca Rápida */}
                        <div className="flex items-center gap-2 w-full sm:w-80">
                          <input
                            type="text"
                            placeholder="Buscar família, membro ou código…"
                            value={buscaConvites}
                            onChange={(e) => setBuscaConvites(e.target.value)}
                            className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] focus:outline-none focus:border-[#261811] focus:bg-white rounded-[6px] transition-all"
                          />
                          {buscaConvites && (
                            <button
                              type="button"
                              onClick={() => setBuscaConvites("")}
                              className="text-xs text-[#8C7A6B] hover:text-[#261811] underline cursor-pointer shrink-0"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista Linha a Linha (Estilo Últimas Confirmações) */}
                      <div className="divide-y divide-[#F0EAE0]">
                        {filteredConvites.map((c) => {
                          const statusKey = (
                            c.status || "PENDENTE"
                          ).toUpperCase();
                          const statusPill =
                            statusKey === "CONFIRMADO"
                              ? "bg-emerald-100 text-emerald-800"
                              : statusKey === "RECUSADO"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800";
                          const statusLabel =
                            statusKey === "CONFIRMADO"
                              ? "Confirmado"
                              : statusKey === "RECUSADO"
                              ? "Não vai"
                              : "Pendente";

                          const linkOficial = getLinkConviteCompleto(c.codigo);
                          const linkRsvp = getLinkRsvpDireto(c.codigo);
                          const copiadoConvite =
                            copiadoLinkPorCodigo[c.codigo];
                          const copiadoRsvp =
                            copiadoLinkPorCodigo[`${c.codigo}-rsvp`];
                          const copiadoCode =
                            copiadoLinkPorCodigo[`${c.codigo}-code`];

                          return (
                            <div
                              key={c.id || c.codigo}
                              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF7F2]/60 -mx-4 px-4 rounded-[6px] transition-colors"
                            >
                              {/* Dados do Convite e Familiares */}
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-serif text-[1.05rem] text-[#261811] font-medium leading-tight">
                                    {c.familia}
                                  </span>
                                  {c.papel && (
                                    <span className="text-[0.62rem] font-sans tracking-[0.16em] uppercase px-2 py-0.5 bg-[#FAF7F2] border border-[#D8CDC0] rounded text-[#6B5A4D] font-semibold">
                                      {c.papel}
                                    </span>
                                  )}
                                  <span
                                    onClick={() =>
                                      copiarTexto(c.codigo, `${c.codigo}-code`)
                                    }
                                    title="Clique para copiar o código"
                                    className="font-mono text-xs font-bold text-[#261811] bg-[#F5F0E8] hover:bg-[#EAE0D5] px-2 py-0.5 rounded border border-[#D8CDC0] cursor-pointer transition-colors select-all"
                                  >
                                    {copiadoCode || c.codigo}
                                  </span>
                                </div>

                                {/* Linha de Familiares e Informações */}
                                <p className="text-[0.78rem] text-[#6B5A4D] font-sans leading-relaxed">
                                  {c.telefone && <span>{c.telefone} · </span>}
                                  <span className="text-[#8C7A6B]">
                                    {c.membros?.length
                                      ? `Membros (${c.membros.length}): `
                                      : "Sem membros detalhados"}
                                  </span>
                                  {c.membros?.map((m, idx) => (
                                    <span key={m.id || idx}>
                                      {idx > 0 && ", "}
                                      <strong className="text-[#261811] font-normal">
                                        {m.nome}
                                      </strong>
                                      {m.titular && (
                                        <span className="text-[0.65rem] text-[#8C7A6B]">
                                          {" "}
                                          (Titular)
                                        </span>
                                      )}
                                      {m.criancaAte6Anos && (
                                        <span className="text-[0.65rem] text-amber-700">
                                          {" "}
                                          (≤ 6 anos)
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                  {c.observacao && (
                                    <span className="italic font-serif text-[#8C7A6B]">
                                      {" "}
                                      · "{c.observacao}"
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* Status e Ações Limpas */}
                              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                                <span
                                  className={`shrink-0 text-[0.68rem] font-sans tracking-wider uppercase px-2.5 py-1 rounded-full font-semibold ${statusPill}`}
                                >
                                  {statusLabel}
                                </span>

                                {/* Botão Copiar Link */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    copiarTexto(linkOficial, c.codigo)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-[#543D30] hover:text-[#261811] bg-[#FAF7F2] hover:bg-[#EFE8DC] border border-[#D8CDC0] rounded-[6px] transition-all cursor-pointer font-medium"
                                  title="Copiar link oficial do convite"
                                >
                                  <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span>
                                    {copiadoConvite || "Copiar Link"}
                                  </span>
                                </button>

                                {/* Botão Copiar Link RSVP */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    copiarTexto(
                                      linkRsvp,
                                      `${c.codigo}-rsvp`
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-sans text-[#7D6B5D] hover:text-[#261811] bg-white hover:bg-[#FAF7F2] border border-[#E3D8CB] rounded-[6px] transition-all cursor-pointer"
                                  title="Copiar link direto para confirmação"
                                >
                                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{copiadoRsvp || "Link RSVP"}</span>
                                </button>

                                {/* Botão WhatsApp */}
                                <button
                                  type="button"
                                  onClick={() => abrirWhatsAppComConvite(c)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[6px] transition-all cursor-pointer font-medium"
                                  title="Enviar convite por WhatsApp"
                                >
                                  <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredConvites.length === 0 && (
                          <div className="py-12 text-center space-y-3">
                            <p className="font-serif italic text-[#8C7A6B] text-base">
                              {listaConvites.length === 0
                                ? "Nenhum convite cadastrado ainda."
                                : "Nenhum convite encontrado para esta busca."}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setConvitesSubTab("novo");
                                setCadSucesso(null);
                              }}
                              className="px-5 py-2 bg-[#261811] text-white text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] hover:bg-[#1A100B] transition-colors cursor-pointer"
                            >
                              + Cadastrar Primeiro Convite
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2. SUB-ABA: FORMULÁRIO DE NOVO CONVITE */
                  <>
                    {cadSucesso ? (
                      /* ── Card de Sucesso ── */
                      <div className="bg-white border border-emerald-300 rounded-[10px] p-8 text-center space-y-5 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)] max-w-[560px] mx-auto">
                        <span className="text-4xl block">✦</span>
                        <div>
                          <p className="text-[0.64rem] font-sans tracking-[0.2em] uppercase text-[#6B5A4D] font-semibold mb-1">
                            Convite Gravado no Backend com Sucesso
                          </p>
                          <h2 className="font-serif text-2xl text-[#261811] font-light">
                            {cadSucesso.familia}
                          </h2>
                        </div>
                        <div className="bg-[#F5F0E8] border border-[#D8CDC0] rounded-[8px] p-4 space-y-1">
                          <p className="text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold">
                            Código Único do Convite
                          </p>
                          <p className="font-mono text-2xl font-bold tracking-widest text-[#261811] select-all">
                            {cadSucesso.codigo}
                          </p>
                        </div>
                        <div className="text-left space-y-2">
                          <p className="text-[0.66rem] font-sans tracking-[0.14em] uppercase text-[#6B5A4D] font-semibold">
                            Link para enviar ao convidado
                          </p>
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={cadSucesso.link}
                              className="flex-1 bg-white border border-[#D8CDC0] px-3 py-2.5 text-xs font-mono text-[#261811] rounded-[6px] select-all"
                            />
                            <button
                              type="button"
                              onClick={() => copiarLink(cadSucesso.link)}
                              className="px-4 bg-[#261811] hover:bg-[#1A100B] text-white text-[0.72rem] font-sans tracking-wider uppercase font-semibold rounded-[6px] transition-colors shrink-0 cursor-pointer"
                            >
                              {copiadoFeedback ? "Copiado!" : "Copiar"}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setCadSucesso(null)}
                            className="px-6 py-2.5 bg-[#261811] text-white text-[0.72rem] font-sans tracking-wider uppercase font-semibold rounded-[6px] hover:bg-[#1A100B] transition-colors cursor-pointer"
                          >
                            + Cadastrar Outro
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCadSucesso(null);
                              setConvitesSubTab("lista");
                            }}
                            className="px-6 py-2.5 border border-[#261811] text-[#261811] text-[0.72rem] font-sans tracking-wider uppercase font-semibold rounded-[6px] hover:bg-[#261811] hover:text-white transition-colors cursor-pointer"
                          >
                            Ver Lista de Convites
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Formulário de Cadastro ── */
                      <form
                        onSubmit={handleCadastrar}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                      >
                        {/* Coluna principal */}
                        <div className="lg:col-span-2 space-y-5">
                          {cadErro && (
                            <div className="p-4 bg-rose-50 border border-rose-300 rounded-[8px] text-sm text-rose-900 font-medium">
                              {cadErro}
                            </div>
                          )}

                          {/* Dados do convite */}
                          <div className="bg-white border border-[#E3D8CB] rounded-[10px] p-6 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]">
                            <SectionTitle>Dados da Família / Convidado</SectionTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2">
                                <label className="block text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                                  Nome da Família ou Convidado Principal *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={novoConvite.familia}
                                  onChange={(e) =>
                                    setNovoConvite((p) => ({
                                      ...p,
                                      familia: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex: Família Vasconcelos ou João da Silva"
                                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white transition-all rounded-[6px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                                  Telefone / WhatsApp
                                </label>
                                <input
                                  type="text"
                                  value={novoConvite.telefone}
                                  onChange={(e) =>
                                    setNovoConvite((p) => ({
                                      ...p,
                                      telefone: e.target.value,
                                    }))
                                  }
                                  placeholder="(11) 99999-9999"
                                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white transition-all rounded-[6px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                                  E-mail (opcional)
                                </label>
                                <input
                                  type="email"
                                  value={novoConvite.email}
                                  onChange={(e) =>
                                    setNovoConvite((p) => ({
                                      ...p,
                                      email: e.target.value,
                                    }))
                                  }
                                  placeholder="email@exemplo.com"
                                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white transition-all rounded-[6px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                                  Categoria / Papel
                                </label>
                                <select
                                  value={novoConvite.papel}
                                  onChange={(e) =>
                                    setNovoConvite((p) => ({
                                      ...p,
                                      papel: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[6px]"
                                >
                                  {PAPEL_OPTIONS.map((o) => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[0.64rem] font-sans tracking-[0.18em] uppercase text-[#6B5A4D] font-semibold mb-1.5">
                                  Observação interna
                                </label>
                                <input
                                  type="text"
                                  value={novoConvite.observacao}
                                  onChange={(e) =>
                                    setNovoConvite((p) => ({
                                      ...p,
                                      observacao: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex: Parente do noivo, mesa reservada…"
                                  className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white transition-all rounded-[6px]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Membros */}
                          <div className="bg-white border border-[#E3D8CB] rounded-[10px] p-6 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)]">
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center gap-3">
                                <span className="w-1 h-5 bg-[#261811] rounded-full inline-block" />
                                <h2 className="font-serif text-xl text-[#261811] font-normal">
                                  Membros do Convite
                                </h2>
                              </div>
                              <button
                                type="button"
                                onClick={addMembro}
                                className="text-[0.68rem] font-sans tracking-[0.14em] uppercase px-3 py-1.5 border border-[#261811] text-[#261811] hover:bg-[#261811] hover:text-white rounded-[6px] transition-all font-semibold cursor-pointer"
                              >
                                + Adicionar Membro
                              </button>
                            </div>
                            <div className="space-y-3">
                              {novoConvite.membros.map((m, idx) => (
                                <div
                                  key={m.id}
                                  className={`flex items-center gap-3 p-3.5 rounded-[8px] border ${
                                    m.titular
                                      ? "border-[#261811]/30 bg-[#F5F0E8]"
                                      : "border-[#E3D8CB] bg-[#FAF7F2]"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      required
                                      value={m.nome}
                                      onChange={(e) =>
                                        updateMembro(
                                          idx,
                                          "nome",
                                          e.target.value
                                        )
                                      }
                                      placeholder={
                                        m.titular
                                          ? "Nome do titular (ex: João da Silva) *"
                                          : `Nome do familiar ${idx + 1} *`
                                      }
                                      className="w-full bg-white border border-[#D8CDC0] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[5px] transition-all"
                                    />
                                  </div>
                                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0 select-none">
                                    <input
                                      type="checkbox"
                                      checked={m.criancaAte6Anos}
                                      onChange={(e) =>
                                        updateMembro(
                                          idx,
                                          "criancaAte6Anos",
                                          e.target.checked
                                        )
                                      }
                                      className="w-3.5 h-3.5 accent-[#261811]"
                                    />
                                    <span className="text-[0.68rem] font-sans text-[#6B5A4D] whitespace-nowrap">
                                      ≤ 6 anos
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0 select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!m.titular}
                                      onChange={(e) =>
                                        updateMembro(
                                          idx,
                                          "titular",
                                          e.target.checked
                                        )
                                      }
                                      className="w-3.5 h-3.5 accent-[#261811]"
                                    />
                                    <span className="text-[0.68rem] font-sans text-[#6B5A4D]">
                                      Titular
                                    </span>
                                  </label>
                                  {novoConvite.membros.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeMembro(idx)}
                                      className="text-rose-400 hover:text-rose-700 transition-colors p-1 cursor-pointer shrink-0"
                                      title="Remover membro"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <p className="mt-3 text-[0.72rem] font-serif italic text-[#8C7A6B]">
                              O código único do convite será gerado de forma aleatória e segura pelo servidor.
                            </p>
                          </div>
                        </div>

                        {/* Coluna lateral — botão + resumo */}
                        <div className="space-y-4">
                          <div className="bg-white border border-[#E3D8CB] rounded-[10px] p-6 shadow-[0_2px_12px_-4px_rgba(38,24,17,0.06)] sticky top-20">
                            <SectionTitle>Resumo do Convite</SectionTitle>
                            <div className="space-y-3 text-sm font-serif text-[#261811] mb-6">
                              <div className="flex justify-between">
                                <span className="text-[#6B5A4D]">Família</span>
                                <span className="font-medium text-right max-w-[60%] break-words">
                                  {novoConvite.familia || "—"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B5A4D]">
                                  Categoria
                                </span>
                                <span>{novoConvite.papel}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B5A4D]">Membros</span>
                                <span>{novoConvite.membros.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B5A4D]">
                                  Crianças ≤ 6
                                </span>
                                <span>
                                  {
                                    novoConvite.membros.filter(
                                      (m) => m.criancaAte6Anos
                                    ).length
                                  }
                                </span>
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={cadLoading}
                              className="w-full py-3.5 bg-[#261811] hover:bg-[#1A100B] text-white font-sans text-[0.74rem] tracking-[0.18em] uppercase font-semibold rounded-[8px] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              {cadLoading
                                ? "Gravando no Backend…"
                                : "Salvar Convite no Backend"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E3D8CB] mt-12 py-5 px-8 text-center">
        <p className="text-[0.72rem] font-serif italic text-[#8C7A6B]">
          Tainara &amp; Thiago · 24 de Janeiro de 2027 · Espaço Balboa,
          Mairiporã - SP
        </p>
        <button
          type="button"
          onClick={close}
          className="mt-2 text-[0.7rem] font-sans tracking-[0.14em] uppercase text-[#6B5A4D] hover:text-[#261811] underline cursor-pointer transition-colors"
        >
          ← Voltar ao Convite
        </button>
      </footer>
    </div>
  );
}
