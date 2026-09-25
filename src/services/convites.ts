import { getApiBaseUrl } from './api';

export interface MembroAutorizado {
  id: string;
  nome: string;
  criancaAte6Anos: boolean; // true = menor de 7 anos (0 a 6 anos); false = adulto / >= 7 anos
  titular?: boolean;
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  dataHoraCheckin?: string;
  recepcionista?: string;
}

export interface ConvitePreDefinido {
  id?: string;
  codigo: string;          // Ex: "fulana", "fam-silva"
  familia: string;         // Ex: "Família Silva" ou "Fulana da Silva e Família"
  telefone?: string;
  email?: string;
  status?: string;         // PENDENTE, CONFIRMADO, RECUSADO
  membros: MembroAutorizado[];
  confirmado?: boolean;
  dataConfirmacao?: string;
}

export interface RelatorioAuditoria {
  totalConvidadosPrevistos: number;
  totalAdultosPrevistos: number;
  totalCriancasPrevistas: number;

  totalConfirmadosRsvp: number;
  totalAdultosConfirmados: number;
  totalCriancasConfirmadas: number;

  totalPresentesReais: number;
  totalAdultosPresentes: number;
  totalCriancasPresentes: number;

  totalAusentesNoShow: number;
  totalAguardandoChegada: number;
  totalRecusados: number;

  familias: Array<{
    id?: string;
    codigo: string;
    familia: string;
    statusRsvp: string;
    telefone?: string;
    totalMembros: number;
    confirmadosRsvp: number;
    presentesCheckin: number;
    ausentesNoShow: number;
    membros: MembroAutorizado[];
  }>;
}

// Lista padrão / fallback local
const STORAGE_KEY = 'CONVITES_PRE_DEFINIDOS_CASAMENTO';

const convitesPadrao: ConvitePreDefinido[] = [
  {
    codigo: "fulana",
    familia: "Fulana da Silva e Família",
    telefone: "(11) 98888-7777",
    status: "PENDENTE",
    membros: [
      { id: "1", nome: "Fulana da Silva", criancaAte6Anos: false, titular: true },
      { id: "2", nome: "Lucas Silva (Filho)", criancaAte6Anos: true, titular: false },
      { id: "3", nome: "Matheus Silva (Filho)", criancaAte6Anos: false, titular: false }
    ]
  },
  {
    codigo: "padrinhos-joao",
    familia: "João e Mariana (Padrinhos)",
    telefone: "(11) 97777-6666",
    status: "PENDENTE",
    membros: [
      { id: "p1", nome: "João Pedro Santos", criancaAte6Anos: false, titular: true },
      { id: "p2", nome: "Mariana Alencar", criancaAte6Anos: false, titular: false }
    ]
  },
  {
    codigo: "fam-vasconcelos",
    familia: "Família Vasconcelos",
    telefone: "(11) 99999-5555",
    status: "PENDENTE",
    membros: [
      { id: "v1", nome: "Carlos Vasconcelos", criancaAte6Anos: false, titular: true },
      { id: "v2", nome: "Clara Vasconcelos", criancaAte6Anos: false, titular: false },
      { id: "v3", nome: "Sofia Vasconcelos", criancaAte6Anos: true, titular: false }
    ]
  }
];

export function carregarConvitesPreDefinidos(): ConvitePreDefinido[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Erro ao carregar convites do storage:", e);
  }
  return convitesPadrao;
}

export function salvarConvitesPreDefinidos(convites: ConvitePreDefinido[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convites));
  } catch (e) {
    console.error("Erro ao salvar convites no storage:", e);
  }
}

// 1. Busca convite pelo código (com fallback para storage offline)
export async function buscarConvitePorCodigo(codigo: string): Promise<ConvitePreDefinido | null> {
  const limpo = codigo.toLowerCase().trim();
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/convites/${encodeURIComponent(limpo)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.codigo) return data;
    }
  } catch {
    // Continua para o storage local caso o backend esteja indisponível
  }

  const lista = carregarConvitesPreDefinidos();
  return lista.find(c => c.codigo.toLowerCase() === limpo) || null;
}

// 2. Login da equipe de recepção
export async function loginRecepcaoBackend(username: string, password: string): Promise<{ success: boolean; token?: string; message?: string }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, token: data.token };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Credenciais inválidas" };
  } catch {
    // Autenticação local offline
    if (username.trim().toLowerCase() === "recepcao" && (password === "recepcao2027" || password === "admin123")) {
      return { success: true, token: "TOKEN_OFFLINE_RECEPCAO" };
    }
    return { success: false, message: "Não foi possível conectar ao servidor." };
  }
}

// 3. Registrar check-in individual por membro
export async function registrarCheckinBackend(
  codigo: string,
  presencas: Array<{ membroId: string; presente: boolean }>,
  operador: string = "Recepção"
): Promise<{ success: boolean; message: string; convite?: any }> {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/recepcao/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        presencas,
        recepcionista: operador
      })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || "Check-in realizado com sucesso", convite: data.convite };
    }
  } catch {
    // Fallback offline
  }

  // Atualiza localmente no storage offline
  const lista = carregarConvitesPreDefinidos();
  const convite = lista.find(c => c.codigo.toLowerCase() === codigo.toLowerCase());
  if (convite && convite.membros) {
    const mapa = new Map(presencas.map(p => [p.membroId, p.presente]));
    convite.membros.forEach(m => {
      if (mapa.has(m.id)) {
        m.presenteCheckin = mapa.get(m.id);
        m.dataHoraCheckin = m.presenteCheckin ? new Date().toISOString() : undefined;
        m.recepcionista = operador;
      }
    });
    salvarConvitesPreDefinidos(lista);
    return { success: true, message: "Check-in salvo localmente (offline)", convite };
  }

  return { success: false, message: "Convite não encontrado." };
}

// 4. Obter relatório geral de auditoria (para Buffet e Noivos)
export async function buscarRelatorioAuditoriaBackend(): Promise<RelatorioAuditoria | null> {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/recepcao/auditoria`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  // Monta resumo a partir do storage offline
  const lista = carregarConvitesPreDefinidos();
  let previstos = 0, adultosPrev = 0, criancasPrev = 0;
  let rsvp = 0, adultosRsvp = 0, criancasRsvp = 0;
  let presentes = 0, adultosPres = 0, criancasPres = 0;
  let ausentes = 0, aguardando = 0, recusados = 0;

  lista.forEach(c => {
    if (c.status === "RECUSADO") recusados++;
    c.membros?.forEach(m => {
      previstos++;
      if (m.criancaAte6Anos) criancasPrev++; else adultosPrev++;

      if (m.confirmadoRsvp) {
        rsvp++;
        if (m.criancaAte6Anos) criancasRsvp++; else adultosRsvp++;

        if (m.presenteCheckin === true) {
          presentes++;
          if (m.criancaAte6Anos) criancasPres++; else adultosPres++;
        } else if (m.presenteCheckin === false) {
          ausentes++;
        } else {
          aguardando++;
        }
      }
    });
  });

  return {
    totalConvidadosPrevistos: previstos,
    totalAdultosPrevistos: adultosPrev,
    totalCriancasPrevistas: criancasPrev,
    totalConfirmadosRsvp: rsvp,
    totalAdultosConfirmados: adultosRsvp,
    totalCriancasConfirmadas: criancasRsvp,
    totalPresentesReais: presentes,
    totalAdultosPresentes: adultosPres,
    totalCriancasPresentes: criancasPres,
    totalAusentesNoShow: ausentes,
    totalAguardandoChegada: aguardando,
    totalRecusados: recusados,
    familias: lista.map(c => ({
      codigo: c.codigo,
      familia: c.familia,
      statusRsvp: c.status || "PENDENTE",
      telefone: c.telefone,
      totalMembros: c.membros?.length || 0,
      confirmadosRsvp: c.membros?.filter(m => m.confirmadoRsvp).length || 0,
      presentesCheckin: c.membros?.filter(m => m.presenteCheckin === true).length || 0,
      ausentesNoShow: c.membros?.filter(m => m.presenteCheckin === false).length || 0,
      membros: c.membros || []
    }))
  };
}

export function adicionarOuAtualizarConvite(convite: ConvitePreDefinido) {
  const lista = carregarConvitesPreDefinidos();
  const idx = lista.findIndex(c => c.codigo.toLowerCase() === convite.codigo.toLowerCase());
  if (idx >= 0) {
    lista[idx] = convite;
  } else {
    lista.push(convite);
  }
  salvarConvitesPreDefinidos(lista);
}

export function removerConvite(codigo: string) {
  const lista = carregarConvitesPreDefinidos().filter(c => c.codigo.toLowerCase() !== codigo.toLowerCase());
  salvarConvitesPreDefinidos(lista);
}
