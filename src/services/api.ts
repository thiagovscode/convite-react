export interface AcompanhanteRequest {
  id?: string;
  nome: string;
  criancaAte6Anos: boolean; // true = menor de 7 anos (0 a 6 anos); false = 7 anos ou mais / adulto
}

export interface RsvpCasamentoRequest {
  nome: string;
  telefone: string;
  email?: string;
  presenca: boolean;
  acompanhantes?: AcompanhanteRequest[];
  observacao?: string;
  codigoConvite?: string;
}

export interface RsvpCasamentoResponse {
  success: boolean;
  message: string;
  resumo?: {
    totalPessoas: number;
    adultos: number;
    criancasAte6Anos: number;
  };
}

export interface AcompanhanteResponse {
  id?: string;
  nome: string;
  criancaAte6Anos: boolean;
}

export interface RsvpAdminItem {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  presenca: boolean;
  acompanhantes?: AcompanhanteResponse[];
  observacao?: string;
  createdAt?: string;
  updatedAt?: string;
  totalPessoas: number;
  adultos: number;
  criancasAte6Anos: number;
}

export interface ResumoGeralCasamento {
  totalRsvps: number;
  totalConfirmados: number;
  totalRecusaram: number;
  totalAdultos: number; // Adultos + Crianças a partir de 7 anos
  totalCriancasAte6Anos: number; // Menores de 7 anos (0 a 6 anos)
}

export interface AdminRsvpResponse {
  success: boolean;
  resumoGeral: ResumoGeralCasamento;
  data: RsvpAdminItem[];
  rsvps?: RsvpAdminItem[];
}

export type AdminRsvpItem = RsvpAdminItem;

export const getApiBaseUrl = (): string => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl && String(viteApiUrl).trim() !== '') {
    return String(viteApiUrl).trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      if (window.location.port === '5173' || window.location.port === '4173') {
        return '';
      }
      return 'http://localhost:3001';
    }

    if (window.location.protocol === 'file:') {
      return 'http://localhost:3001';
    }

    if (host.includes('github.io')) {
      return 'https://casamento.southiagovasconcelos.workers.dev';
    }
  }

  return '';
};

/**
 * Envia a confirmação de presença para o endpoint público do backend
 * POST /api/rsvp/casamento
 */
export async function enviarRsvpCasamento(data: RsvpCasamentoRequest): Promise<RsvpCasamentoResponse> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/rsvp/casamento` : '/api/rsvp/casamento';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Não foi possível carregar algumas informações. Tente novamente em instantes.');
  }

  const json = await response.json();

  if (!response.ok) {
    const errorMsg = json.message || json.error || 'Não foi possível registrar sua confirmação no momento. Por favor, tente novamente em instantes.';
    throw new Error(errorMsg);
  }

  return json;
}

export const CONVITE_ADMIN_TOKEN_KEY = 'CONVITE_ADMIN_TOKEN';
export const CONVITE_ADMIN_REFRESH_KEY = 'CONVITE_ADMIN_REFRESH_TOKEN';

/**
 * Autentica o usuário na rota /api/auth/login
 */
export async function autenticarAdmin(username: string, password: string): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/auth/login` : '/api/auth/login';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Não foi possível carregar algumas informações. Tente novamente em instantes.');
  }

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Credenciais inválidas.');
  }

  if (json.token) {
    localStorage.setItem(CONVITE_ADMIN_TOKEN_KEY, json.token);
    if (json.refreshToken) {
      localStorage.setItem(CONVITE_ADMIN_REFRESH_KEY, json.refreshToken);
    }
    return json.token;
  }

  throw new Error('Token não retornado pelo servidor.');
}

/**
 * Tenta renovar o token de acesso de administrador utilizando o refreshToken
 */
export async function renovarTokenAdmin(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem(CONVITE_ADMIN_REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const baseUrl = getApiBaseUrl();
    const url = baseUrl ? `${baseUrl}/api/auth/refresh` : '/api/auth/refresh';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const json = await response.json();
      if (json.token) {
        localStorage.setItem(CONVITE_ADMIN_TOKEN_KEY, json.token);
        if (json.refreshToken) {
          localStorage.setItem(CONVITE_ADMIN_REFRESH_KEY, json.refreshToken);
        }
        return json.token;
      }
    }
  } catch (e) {
    console.warn('Erro ao renovar token de autenticação:', e);
  }

  localStorage.removeItem(CONVITE_ADMIN_TOKEN_KEY);
  localStorage.removeItem(CONVITE_ADMIN_REFRESH_KEY);
  return null;
}

/**
 * Wrapper HTTP que injeta token Bearer e realiza refresh transparente em caso de 401
 */
export async function fetchAutenticadoAdmin(url: string, init: RequestInit = {}): Promise<Response> {
  let authToken = typeof window !== 'undefined' ? localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY) : null;
  const headers = new Headers(init.headers || {});
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const novoToken = await renovarTokenAdmin();
    if (novoToken) {
      headers.set('Authorization', `Bearer ${novoToken}`);
      response = await fetch(url, { ...init, headers });
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sessao-jwt-expirada'));
      }
      throw new Error('Sua sessão expirou. Faça login novamente.');
    }
  }

  return response;
}

function tratarErroAutenticacao(response: Response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem(CONVITE_ADMIN_TOKEN_KEY);
    localStorage.removeItem(CONVITE_ADMIN_REFRESH_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sessao-jwt-expirada"));
    }
    throw new Error('Sua sessão expirou. Faça login novamente.');
  }
}

/**
 * Busca a listagem e resumo geral de confirmações
 * GET /api/admin/rsvp/casamento
 */
export async function buscarRelatorioRsvpAdmin(token?: string): Promise<AdminRsvpResponse> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);

  if (!authToken) {
    throw new Error('Autenticação necessária.');
  }

  const url = baseUrl ? `${baseUrl}/api/admin/rsvp/casamento` : '/api/admin/rsvp/casamento';

  const response = await fetchAutenticadoAdmin(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Não foi possível carregar o relatório de presenças.');
  }

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Não foi possível carregar o relatório de presenças.');
  }

  return json;
}

export interface NovoMembroAdminRequest {
  id?: string;
  nome: string;
  criancaAte6Anos: boolean;
  papel?: string;
  vinculo?: string;
  par?: string;
  participaCortejo?: boolean;
}

export interface CadastrarConviteAdminRequest {
  id?: string;
  codigo?: string;
  familia: string;
  telefone?: string;
  email?: string;
  papel?: string;
  observacao?: string;
  membros: NovoMembroAdminRequest[];
}

export interface CadastrarConviteAdminResponse {
  success: boolean;
  message: string;
  codigo: string;
  convite: any;
}

/**
 * Cadastra ou edita um convite no backend Java
 * POST /api/admin/convites/cadastrar
 */
export async function cadastrarConviteAdmin(
  dados: CadastrarConviteAdminRequest,
  token?: string
): Promise<CadastrarConviteAdminResponse> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);

  if (!authToken) {
    throw new Error('Autenticação de administrador necessária.');
  }

  const url = baseUrl ? `${baseUrl}/api/admin/convites/cadastrar` : '/api/admin/convites/cadastrar';

  const response = await fetchAutenticadoAdmin(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(dados),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Erro ao cadastrar convite no servidor.');
  }
  return json;
}

/**
 * Lista convites cadastrados no backend Java
 * GET /api/admin/convites
 */
export async function listarConvitesAdmin(token?: string): Promise<any[]> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);

  if (!authToken) {
    throw new Error('Autenticação de administrador necessária.');
  }

  const url = baseUrl ? `${baseUrl}/api/admin/convites` : '/api/admin/convites';

  const response = await fetchAutenticadoAdmin(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Erro ao listar convites no servidor.');
  }
  return json;
}

/**
 * Exclui um convite existente no backend Java
 * DELETE /api/admin/convites/{codigoOuId}
 */
export async function excluirConviteAdmin(
  codigoOuId: string,
  token?: string
): Promise<{ success: boolean; message: string; codigo?: string; familia?: string }> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);

  if (!authToken) {
    throw new Error('Autenticação de administrador necessária.');
  }

  const url = baseUrl
    ? `${baseUrl}/api/admin/convites/${encodeURIComponent(codigoOuId.trim())}`
    : `/api/admin/convites/${encodeURIComponent(codigoOuId.trim())}`;

  const response = await fetchAutenticadoAdmin(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || 'Erro ao excluir convite no servidor.');
  }
  return json;
}

export interface DashboardMetricas {
  totalConvites: number;
  totalConvitesConfirmados: number;
  totalConvitesRecusados: number;
  totalConvitesPendentes: number;
  totalPessoas: number;
  totalConfirmados: number;
  totalRecusaram: number;
  totalPendentes: number;
  totalAdultosConfirmados: number;
  totalCriancasConfirmadas: number;
  taxaConfirmacao: number;
  taxaRecusa: number;
  taxaPendentes: number;
  taxaPresencaRespondidos: number;
}

/**
 * Busca métricas consolidadas do dashboard diretamente do endpoint dedicado do backend
 * GET /api/admin/convites/metricas
 */
export async function buscarMetricasAdmin(token?: string): Promise<DashboardMetricas> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);

  if (!authToken) {
    throw new Error('Autenticação de administrador necessária.');
  }

  const url = baseUrl ? `${baseUrl}/api/admin/convites/metricas` : '/api/admin/convites/metricas';

  const response = await fetchAutenticadoAdmin(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Erro ao buscar métricas no servidor.');
  }
  return json;
}

/**
 * Define ou atualiza o par de um participante do cortejo
 * PUT /api/admin/convites/definir-par
 */
export async function definirParCortejoAdmin(
  dados: { codigoConvite?: string; membroId?: string; nomeMembro?: string; nomePar?: string },
  token?: string
): Promise<{ success: boolean; message: string; convite?: any }> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
  const url = baseUrl ? `${baseUrl}/api/admin/convites/definir-par` : '/api/admin/convites/definir-par';

  const res = await fetchAutenticadoAdmin(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    body: JSON.stringify(dados),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Erro ao definir par.');
  }
  return json;
}

export interface ConfiguracaoEventoInfo {
  prazoRsvp?: string;
  prazoRsvpFormatado: string;
  prazoRsvpExtenso: string;
  expirado: boolean;
}

/**
 * Consulta pública da configuração de prazo de RSVP do evento
 * GET /api/configuracao-evento
 */
export async function obterConfiguracaoEventoPublica(): Promise<ConfiguracaoEventoInfo> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/configuracao-evento` : '/api/configuracao-evento';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao obter configuração');
    return await res.json();
  } catch {
    return {
      prazoRsvpFormatado: '',
      prazoRsvpExtenso: '',
      expirado: false,
    };
  }
}

/**
 * Consulta admin da configuração de prazo de RSVP do evento
 * GET /api/admin/configuracao-evento
 */
export async function obterConfiguracaoEventoAdmin(token?: string): Promise<ConfiguracaoEventoInfo> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
  const url = baseUrl ? `${baseUrl}/api/admin/configuracao-evento` : '/api/admin/configuracao-evento';

  const res = await fetchAutenticadoAdmin(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Erro ao obter prazo do evento.');
  return json;
}

/**
 * Atualiza o prazo de RSVP no painel admin
 * PUT /api/admin/configuracao-evento
 */
export async function atualizarPrazoRsvpAdmin(prazoRsvpIso: string, token?: string): Promise<ConfiguracaoEventoInfo> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
  const url = baseUrl ? `${baseUrl}/api/admin/configuracao-evento` : '/api/admin/configuracao-evento';

  const res = await fetchAutenticadoAdmin(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    body: JSON.stringify({ prazoRsvp: prazoRsvpIso }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Erro ao atualizar prazo de RSVP.');
  return json;
}

/**
 * Reseta o status de um convite para PENDENTE e remove o RSVP associado.
 * POST /api/admin/convites/{codigoOuId}/resetar-rsvp
 */
export async function resetarRsvpConviteAdmin(codigoOuId: string, token?: string): Promise<{ success: boolean; message: string; convite?: any }> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
  const url = baseUrl ? `${baseUrl}/api/admin/convites/${encodeURIComponent(codigoOuId)}/resetar-rsvp` : `/api/admin/convites/${encodeURIComponent(codigoOuId)}/resetar-rsvp`;

  const res = await fetchAutenticadoAdmin(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Erro ao resetar RSVP do convite.');
  return json;
}


