import { getApiBaseUrl } from './api';

export interface MembroAutorizado {
  id: string;
  nome: string;
  criancaAte6Anos: boolean; // true = menor de 7 anos (0 a 6 anos); false = adulto / >= 7 anos
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  dataHoraCheckin?: string;
  recepcionista?: string;
  papel?: string; // Ex: Padrinho, Madrinha, Pai dos Noivos, Mãe dos Noivos, etc.
  vinculo?: string; // Ex: Noivo, Noiva, Casal
  par?: string; // Par no cortejo
  participaCortejo?: boolean;
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
  statusCortejo?: string; // AGUARDANDO_CHEGADA, NO_LOCAL, PRONTO_CORTEJO, ENTROU_CORTEJO
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

export const CACHE_PORTARIA_KEY = "CACHE_PORTARIA_CONVITES_V2";
export const FILA_OFFLINE_KEY = "FILA_OFFLINE_CHECKINS_V2";

export function getFilaOfflineCheckins(): Array<{
  codigo: string;
  presencas: Array<{ membroId: string; presente: boolean }>;
  operador: string;
  timestamp: number;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FILA_OFFLINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function salvarNoCacheOffline(convite: ConvitePreDefinido | ConvitePreDefinido[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CACHE_PORTARIA_KEY);
    const map: Record<string, ConvitePreDefinido> = raw ? JSON.parse(raw) : {};
    const lista = Array.isArray(convite) ? convite : [convite];
    lista.forEach((c) => {
      if (c && c.codigo) {
        map[c.codigo.toLowerCase().trim()] = c;
      }
    });
    localStorage.setItem(CACHE_PORTARIA_KEY, JSON.stringify(map));
  } catch {}
}

export function buscarNoCacheOfflinePorCodigo(codigo: string): ConvitePreDefinido | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PORTARIA_KEY);
    if (!raw) return null;
    const map: Record<string, ConvitePreDefinido> = JSON.parse(raw);
    return map[codigo.toLowerCase().trim()] || null;
  } catch {
    return null;
  }
}

export function buscarNoCacheOfflinePorTermo(termo: string): ConvitePreDefinido[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_PORTARIA_KEY);
    if (!raw) return [];
    const map: Record<string, ConvitePreDefinido> = JSON.parse(raw);
    const q = termo.toLowerCase().trim();
    return Object.values(map).filter((c) => {
      if (c.codigo && c.codigo.toLowerCase().includes(q)) return true;
      if (c.familia && c.familia.toLowerCase().includes(q)) return true;
      if (c.telefone && c.telefone.toLowerCase().includes(q)) return true;
      if (c.membros && c.membros.some((m) => m.nome && m.nome.toLowerCase().includes(q))) return true;
      return false;
    });
  } catch {
    return [];
  }
}

export async function sincronizarFilaOffline(): Promise<{ sincronizados: number; erros: number }> {
  const fila = getFilaOfflineCheckins();
  if (!fila.length) return { sincronizados: 0, erros: 0 };

  let sincronizados = 0;
  let erros = 0;
  const restante: typeof fila = [];

  for (const item of fila) {
    try {
      const baseUrl = getApiBaseUrl();
      const url = baseUrl ? `${baseUrl}/api/recepcao/checkin` : `/api/recepcao/checkin`;
      const res = await fetch(url, {
        method: "POST",
        headers: getRecepcaoAuthHeaders(),
        body: JSON.stringify({
          codigo: item.codigo,
          presencas: item.presencas,
          recepcionista: item.operador,
        }),
      });
      if (res.ok) {
        sincronizados++;
      } else {
        restante.push(item);
        erros++;
      }
    } catch {
      restante.push(item);
      erros++;
    }
  }

  try {
    localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(restante));
  } catch {}

  return { sincronizados, erros };
}

// 1. Busca convite pelo código via requisição HTTP direta ao backend (MongoDB) com fallback offline
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
          salvarNoCacheOffline(data);
          return data;
        }
      }
    }
  } catch (err) {
    console.warn("Rede indisponível. Buscando convite no cache local offline...", err);
  }

  // Fallback cache local (offline)
  const cached = buscarNoCacheOfflinePorCodigo(limpo);
  if (cached) return cached;

  return null;
}

/**
 * Busca convites por termo (nome da família, nome de qualquer membro, telefone ou código)
 * GET /api/recepcao/busca?termo=... com fallback offline
 */
export async function buscarConvitesPorTermoBackend(termo: string): Promise<ConvitePreDefinido[]> {
  const limpo = termo.trim();
  if (!limpo) return [];

  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/recepcao/busca?termo=${encodeURIComponent(limpo)}`
    : `/api/recepcao/busca?termo=${encodeURIComponent(limpo)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: getRecepcaoAuthHeaders(),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        salvarNoCacheOffline(data);
        return data;
      }
    }
  } catch (err) {
    console.warn("Rede indisponível na busca. Buscando termo no cache local offline...", err);
  }

  // Fallback cache local (offline)
  const cachedList = buscarNoCacheOfflinePorTermo(limpo);
  if (cachedList.length > 0) return cachedList;

  return [];
}

export const RECEPCAO_JWT_STORAGE_KEY = "CASAMENTO_RECEPCAO_JWT_TOKEN";

export function getRecepcaoAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined"
    ? (localStorage.getItem("CONVITE_ADMIN_TOKEN") || sessionStorage.getItem(RECEPCAO_JWT_STORAGE_KEY) || localStorage.getItem(RECEPCAO_JWT_STORAGE_KEY))
    : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Valida a sessão de recepção no backend (sem confiar em flags estáticas do localStorage)
export async function validarSessaoRecepcaoBackend(): Promise<boolean> {
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem(RECEPCAO_JWT_STORAGE_KEY) || localStorage.getItem(RECEPCAO_JWT_STORAGE_KEY))
    : null;
  if (!token) return false;

  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/validar-sessao` : `/api/recepcao/validar-sessao`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    // Falha de rede
  }

  // Se o token for inválido ou rejeitado, limpa os storages locais para impedir auto-login indevido
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
    localStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
    localStorage.removeItem("CASAMENTO_RECEPCAO_AUTENTICADA");
  }
  return false;
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
        // Armazena preferencialmente na sessionStorage para fechar ao sair da sessão do navegador
        sessionStorage.setItem(RECEPCAO_JWT_STORAGE_KEY, data.token);
      }
      return { success: true, token: data.token };
    }
    const err = isJson ? await res.json().catch(() => ({})) : {};
    return { success: false, message: err.message || "Credenciais inválidas" };
  } catch (err: any) {
    return { success: false, message: err.message || "Não foi possível conectar ao servidor." };
  }
}

// Cadastrar novo convite nominal pela Área Administrativa (com geração aleatória no backend)
export async function cadastrarConviteAdmin(dados: {
  familia: string;
  telefone?: string;
  email?: string;
  papel?: string;
  observacao?: string;
  membros: Array<{
    nome: string;
    criancaAte6Anos: boolean;
    papel?: string;
    vinculo?: string;
  }>;
}): Promise<{ success: boolean; message: string; convite?: ConvitePreDefinido; codigo?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("CONVITE_ADMIN_TOKEN") : null;
  if (!token) {
    return { success: false, message: "Autenticação administrativa necessária." };
  }

  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/admin/convites` : `/api/admin/convites`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(dados)
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const json = isJson ? await res.json() : {};

    if (res.ok) {
      return {
        success: true,
        message: json.message || "Convite gerado com sucesso!",
        convite: json.convite || json,
        codigo: json.codigo || json.convite?.codigo
      };
    }

    return {
      success: false,
      message: json.message || "Não foi possível cadastrar o convite. Verifique os dados e tente novamente."
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Erro de conexão ao cadastrar convite."
    };
  }
}

// Listar convites pré-cadastrados para o painel administrativo
export async function listarConvitesAdmin(): Promise<ConvitePreDefinido[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("CONVITE_ADMIN_TOKEN") : null;
  if (!token) return [];

  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/admin/convites` : `/api/admin/convites`;

  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
  } catch {}
  return [];
}

// 3. Registrar check-in individual por membro no banco de dados (com suporte offline resiliente)
export async function registrarCheckinBackend(
  codigo: string,
  presencas: Array<{ membroId: string; presente: boolean }>,
  operador: string = "Recepção"
): Promise<{ success: boolean; message: string; convite?: any; offline?: boolean }> {
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
      // Atualiza cache local
      const c = buscarNoCacheOfflinePorCodigo(codigo);
      if (c && c.membros) {
        presencas.forEach(p => {
          const m = c.membros.find(x => x.id === p.membroId);
          if (m) {
            m.presenteCheckin = p.presente;
            m.dataHoraCheckin = new Date().toISOString();
          }
        });
        salvarNoCacheOffline(c);
      }
      return { success: true, message: data.message || "Check-in realizado com sucesso", convite: data.convite };
    }
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const err = isJson ? await res.json().catch(() => ({})) : {};
    return { success: false, message: err.message || "Erro ao registrar check-in." };
  } catch (err: any) {
    // Modo Offline: salva no cache local e enfileira para sincronização
    try {
      const c = buscarNoCacheOfflinePorCodigo(codigo);
      if (c && c.membros) {
        presencas.forEach(p => {
          const m = c.membros.find(x => x.id === p.membroId);
          if (m) {
            m.presenteCheckin = p.presente;
            m.dataHoraCheckin = new Date().toISOString();
          }
        });
        salvarNoCacheOffline(c);
      }
      const fila = getFilaOfflineCheckins();
      fila.push({ codigo, presencas, operador, timestamp: Date.now() });
      localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(fila));
      return {
        success: true,
        message: "Check-in registrado localmente (Modo Offline) - será sincronizado automaticamente quando a conexão retornar.",
        offline: true
      };
    } catch {
      return { success: false, message: "Erro de conexão ao registrar check-in." };
    }
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

export async function checkinParticipanteBackend(
  id: string,
  presente?: boolean,
  statusCortejo?: string
): Promise<{ success: boolean; message: string; participante?: ParticipanteCerimonia }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/recepcao/participantes/${encodeURIComponent(id)}/checkin` : `/api/recepcao/participantes/${encodeURIComponent(id)}/checkin`;

  try {
    const payload: Record<string, any> = {};
    if (presente !== undefined) payload.presente = presente;
    if (statusCortejo !== undefined) payload.statusCortejo = statusCortejo;

    const res = await fetch(url, {
      method: "POST",
      headers: getRecepcaoAuthHeaders(),
      body: JSON.stringify(payload)
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
  const adminToken = typeof window !== "undefined" ? localStorage.getItem("CONVITE_ADMIN_TOKEN") : null;
  const headers = getRecepcaoAuthHeaders();

  // Se o usuário estiver autenticado como admin, busca preferencialmente via /api/admin/fornecedores
  const primaryEndpoint = adminToken ? "/api/admin/fornecedores" : "/api/recepcao/fornecedores";
  const url = baseUrl ? `${baseUrl}${primaryEndpoint}` : primaryEndpoint;

  const processResponse = (data: any) => {
    if (Array.isArray(data)) {
      let totalMembrosEquipe = 0;
      let totalMembrosPresentes = 0;
      data.forEach((f: any) => {
        if (Array.isArray(f.equipe)) {
          totalMembrosEquipe += f.equipe.length;
          totalMembrosPresentes += f.equipe.filter((m: any) => m.presente).length;
        }
      });
      return {
        totalEmpresas: data.length,
        totalMembrosEquipe,
        totalMembrosPresentes,
        fornecedores: data,
      };
    }
    if (data && Array.isArray(data.fornecedores)) {
      return data;
    }
    return null;
  };

  try {
    const res = await fetch(url, { headers });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const parsed = processResponse(await res.json());
      if (parsed) return parsed;
    }
  } catch (err) {
    console.error("Erro ao buscar fornecedores no servidor:", err);
  }

  // Fallback caso o endpoint principal falhe
  try {
    const fallbackEndpoint = adminToken ? "/api/recepcao/fornecedores" : "/api/admin/fornecedores";
    const fallbackUrl = baseUrl ? `${baseUrl}${fallbackEndpoint}` : fallbackEndpoint;
    const res = await fetch(fallbackUrl, { headers });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const parsed = processResponse(await res.json());
      if (parsed) return parsed;
    }
  } catch {
    // ignora fallback
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
  const url = baseUrl ? `${baseUrl}/api/admin/fornecedores` : `/api/admin/fornecedores`;

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

export async function atualizarFornecedorBackend(
  fornecedorId: string,
  dados: Partial<FornecedorCasamento>
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/admin/fornecedores/${encodeURIComponent(fornecedorId)}`
    : `/api/admin/fornecedores/${encodeURIComponent(fornecedorId)}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: getRecepcaoAuthHeaders(),
      body: JSON.stringify(dados)
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao atualizar fornecedor" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao atualizar fornecedor" };
  }
}

export async function excluirFornecedorBackend(
  fornecedorId: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/admin/fornecedores/${encodeURIComponent(fornecedorId)}`
    : `/api/admin/fornecedores/${encodeURIComponent(fornecedorId)}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: getRecepcaoAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: true, message: data.message || "Fornecedor excluído com sucesso!" };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao excluir fornecedor" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao excluir fornecedor" };
  }
}

export async function removerMembroFornecedorBackend(
  fornecedorId: string,
  membroId: string
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/admin/fornecedores/${encodeURIComponent(fornecedorId)}/membros/${encodeURIComponent(membroId)}`
    : `/api/admin/fornecedores/${encodeURIComponent(fornecedorId)}/membros/${encodeURIComponent(membroId)}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: getRecepcaoAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: true, message: data.message || "Membro removido da equipe", fornecedor: data.fornecedor };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Erro ao remover membro da equipe" };
  } catch (err: any) {
    return { success: false, message: err.message || "Erro de conexão ao remover membro da equipe" };
  }
}

export async function buscarFornecedorPublico(id: string): Promise<FornecedorCasamento | null> {
  if (!id || !id.trim()) return null;
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/convites/fornecedor/${encodeURIComponent(id.trim())}`
    : `/api/convites/fornecedor/${encodeURIComponent(id.trim())}`;

  try {
    const res = await fetch(url);
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
  } catch (err) {
    console.error("Erro ao buscar credencial do fornecedor:", err);
  }

  // Fallback: busca na listagem geral de fornecedores caso o usuário esteja no painel ou sessão ativa
  try {
    const data = await buscarFornecedoresBackend();
    if (data && Array.isArray(data.fornecedores)) {
      const termo = id.trim().toLowerCase();
      const match = data.fornecedores.find(
        (f) =>
          (f.id && f.id.toLowerCase() === termo) ||
          (f.empresa && f.empresa.toLowerCase() === termo)
      );
      if (match) return match;
    }
  } catch {}

  return null;
}

export async function adicionarMembroPublicoFornecedor(
  fornecedorId: string,
  novoMembro: { nome: string; funcao?: string }
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento; membro?: MembroEquipeFornecedor }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/convites/fornecedor/${encodeURIComponent(fornecedorId)}/membros`
    : `/api/convites/fornecedor/${encodeURIComponent(fornecedorId)}/membros`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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


