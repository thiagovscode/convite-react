export interface AcompanhanteRequest {
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
}

export const getApiBaseUrl = (): string => {
  // Variável de ambiente do Vite (configurada via VITE_API_URL no GitHub Secrets / CI)
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    return String(viteApiUrl).trim().replace(/\/$/, '');
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
    localStorage.setItem('CONVITE_ADMIN_TOKEN', json.token);
    return json.token;
  }

  throw new Error('Token não retornado pelo servidor.');
}

/**
 * Busca a listagem e resumo geral de confirmações
 * GET /api/admin/rsvp/casamento
 */
export async function buscarRelatorioRsvpAdmin(token?: string): Promise<AdminRsvpResponse> {
  const baseUrl = getApiBaseUrl();
  const authToken = token || localStorage.getItem('CONVITE_ADMIN_TOKEN');

  if (!authToken) {
    throw new Error('Autenticação necessária.');
  }

  const url = baseUrl ? `${baseUrl}/api/admin/rsvp/casamento` : '/api/admin/rsvp/casamento';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('CONVITE_ADMIN_TOKEN');
    throw new Error('Sessão expirada. Faça login novamente.');
  }

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
