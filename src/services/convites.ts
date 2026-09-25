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
  papel?: string; // Ex: Padrinho, Madrinha, Pai dos Noivos, Mãe dos Noivos, etc.
  vinculo?: string; // Ex: Noivo, Noiva, Casal
  idade?: number | string;
}

export interface ParticipanteCerimonia {
  id?: string;
  nome: string;
  papel: string; // Madrinha, Padrinho, Pai dos Noivos, etc.
  vinculo?: string; // Noivo, Noiva
  par?: string; // Nome do par no cortejo (ex: Mariana Alencar)
  telefone?: string;
  codigoConvite?: string;
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  dataHoraEntrada?: string;
  criancaAte6Anos?: boolean;
  idade?: number | string;
}

export interface MembroEquipeFornecedor {
  id: string;
  nome: string;
  funcao?: string; // Maestro, Violino, Fotógrafo Principal, Assistente, etc.
  presente: boolean;
  dataHoraEntrada?: string;
}

export interface FornecedorCasamento {
  id?: string;
  nome: string; // Responsável principal
  responsavel?: string;
  papel?: string; // "Fornecedor"
  categoria?: string; // Ex: Música & Som, Foto & Vídeo, Buffet & Gastronomia, Decoração, Cerimonial & Staff
  servico: string; // Orquestra, Fotografia, Som e DJ, Cerimonial, Buffet, etc.
  empresa: string;
  telefone?: string; // Contato de emergência da equipe
  horarioPrevisto?: string; // Ex: "14:00"
  instrucaoChegada?: string;
  chegadaAntecipada?: boolean;
  equipe: MembroEquipeFornecedor[];
}

export interface ConvitePreDefinido {
  id?: string;
  codigo: string;
  familia: string;
  telefone?: string;
  email?: string;
  status?: string; // PENDENTE, CONFIRMADO, RECUSADO
  papel?: string;
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
    papel?: string;
    vinculo?: string;
    totalMembros: number;
    confirmadosRsvp: number;
    presentesCheckin: number;
    ausentesNoShow: number;
    membros: MembroAutorizado[];
  }>;
}

// Limpeza de caches legados no navegador para garantir 100% conexão com o banco de dados
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("CONVITES_PRE_DEFINIDOS_CASAMENTO");
    localStorage.removeItem("PARTICIPANTES_CERIMONIA_CASAMENTO");
    localStorage.removeItem("FORNECEDORES_CASAMENTO");
  } catch {
    // ignora em caso de restrição do navegador
  }
}

// 1. Busca convite pelo código via requisição HTTP direta ao backend (MongoDB)
export async function buscarConvitePorCodigo(codigo: string): Promise<ConvitePreDefinido | null> {
  const limpo = codigo.toLowerCase().trim();
  if (!limpo) return null;

  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/convites/${encodeURIComponent(limpo)}` : `/api/convites/${encodeURIComponent(limpo)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data && (data.codigo || data.familia)) {
          return data;
        }
      }
    }
  } catch (err) {
    console.error("Erro ao buscar convite no servidor:", err);
  }

  return null;
}

export const RECEPCAO_JWT_STORAGE_KEY = "CASAMENTO_RECEPCAO_JWT_TOKEN";

export function getRecepcaoAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined"
    ? (localStorage.getItem(RECEPCAO_JWT_STORAGE_KEY) || sessionStorage.getItem(RECEPCAO_JWT_STORAGE_KEY))
    : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// 2. Login da equipe de recepção (autenticação real no backend)
export async function loginRecepcaoBackend(username: string, password: string): Promise<{ success: boolean; token?: string; message?: string }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/login` : `/api/recepcao/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    if (res.ok && isJson) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem(RECEPCAO_JWT_STORAGE_KEY, data.token);
      }
      return { success: true, token: data.token };
    }
    const err = isJson ? await res.json().catch(() => ({})) : {};
    return { success: false, message: err.message || "Credenciais inválidas" };
  } catch (err: any) {
    return { success: false, message: err.message || "Não foi possível conectar ao servidor." };
  }
}

// 3. Registrar check-in individual por membro no banco de dados
export async function registrarCheckinBackend(
  codigo: string,
  presencas: Array<{ membroId: string; presente: boolean }>,
  operador: string = "Recepção"
): Promise<{ success: boolean; message: string; convite?: any }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/checkin` : `/api/recepcao/checkin`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getRecepcaoAuthHeaders(),
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
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const err = isJson ? await res.json().catch(() => ({})) : {};
    return { success: false, message: err.message || "Erro ao registrar check-in." };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao registrar check-in." };
  }
}

// 4. Obter relatório geral de auditoria direto do banco de dados (para Buffet e Noivos)
export async function buscarRelatorioAuditoriaBackend(): Promise<RelatorioAuditoria | null> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/auditoria` : `/api/recepcao/auditoria`;

  try {
    const res = await fetch(url, {
      headers: getRecepcaoAuthHeaders()
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
  } catch (err) {
    console.error("Erro ao buscar relatório de auditoria:", err);
  }

  return null;
}

// ==========================================
// 5. PARTICIPANTES DA CERIMÔNIA (CORTEJO)
// ==========================================
export async function buscarParticipantesCerimoniaBackend(): Promise<{ total: number; confirmadosRsvp: number; presentes: number; participantes: ParticipanteCerimonia[] }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/participantes` : `/api/recepcao/participantes`;

  try {
    const res = await fetch(url, {
      headers: getRecepcaoAuthHeaders()
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
  } catch (err) {
    console.error("Erro ao buscar cortejo no servidor:", err);
  }

  return { total: 0, confirmadosRsvp: 0, presentes: 0, participantes: [] };
}

export async function checkinParticipanteBackend(id: string, presente?: boolean): Promise<{ success: boolean; message: string; participante?: ParticipanteCerimonia }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/participantes/${encodeURIComponent(id)}/checkin` : `/api/recepcao/participantes/${encodeURIComponent(id)}/checkin`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getRecepcaoAuthHeaders(),
      body: JSON.stringify(presente !== undefined ? { presente } : {})
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao atualizar participante" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao atualizar participante" };
  }
}

// ==========================================
// 6. FORNECEDORES & CONTATOS DE EMERGÊNCIA
// ==========================================
export async function buscarFornecedoresBackend(): Promise<{
  totalEmpresas: number;
  totalMembrosEquipe: number;
  totalMembrosPresentes: number;
  fornecedores: FornecedorCasamento[];
}> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/fornecedores` : `/api/recepcao/fornecedores`;

  try {
    const res = await fetch(url, {
      headers: getRecepcaoAuthHeaders()
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
  } catch (err) {
    console.error("Erro ao buscar fornecedores no servidor:", err);
  }

  return { totalEmpresas: 0, totalMembrosEquipe: 0, totalMembrosPresentes: 0, fornecedores: [] };
}

export async function checkinMembroFornecedorBackend(
  fornecedorId: string,
  membroId: string,
  presente?: boolean
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/recepcao/fornecedores/${encodeURIComponent(fornecedorId)}/membros/${encodeURIComponent(membroId)}/checkin`
    : `/api/recepcao/fornecedores/${encodeURIComponent(fornecedorId)}/membros/${encodeURIComponent(membroId)}/checkin`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getRecepcaoAuthHeaders(),
      body: JSON.stringify(presente !== undefined ? { presente } : {})
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao atualizar membro da equipe" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao atualizar membro da equipe" };
  }
}

export async function adicionarMembroFornecedorBackend(
  fornecedorId: string,
  novoMembro: { nome: string; funcao?: string }
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/recepcao/fornecedores/${encodeURIComponent(fornecedorId)}/membros`
    : `/api/recepcao/fornecedores/${encodeURIComponent(fornecedorId)}/membros`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getRecepcaoAuthHeaders(),
      body: JSON.stringify(novoMembro)
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao adicionar membro à equipe" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao adicionar membro à equipe" };
  }
}

export async function cadastrarFornecedorBackend(
  novo: Partial<FornecedorCasamento>
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/fornecedores` : `/api/recepcao/fornecedores`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getRecepcaoAuthHeaders(),
      body: JSON.stringify(novo)
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao cadastrar fornecedor" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao cadastrar fornecedor" };
  }
}
