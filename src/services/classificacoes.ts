import { getApiBaseUrl } from './api';

export interface PapelParticipante {
  id?: string;
  nome: string;
  cortejo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VinculoParticipante {
  id?: string;
  nome: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassificacoesResponse {
  papeis: PapelParticipante[];
  vinculos: VinculoParticipante[];
}

function getAdminAuthHeaders(token?: string): Record<string, string> {
  const authToken = token || localStorage.getItem('CONVITE_ADMIN_TOKEN') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

/**
 * Busca a lista consolidada de papéis e vínculos (Público / Cache)
 */
export async function buscarClassificacoesBackend(): Promise<ClassificacoesResponse> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/classificacoes` : '/api/classificacoes';

  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Erro ao buscar classificações:', err);
  }

  // Fallback padrão se offline ou erro
  return {
    papeis: PAPEIS_PADRAO,
    vinculos: [
      { nome: 'Noivo' },
      { nome: 'Noiva' },
      { nome: 'Pai/Mãe' },
      { nome: 'Irmão/Irmã' },
      { nome: 'Família' },
      { nome: 'Amigo(a)' },
      { nome: 'Colega' },
      { nome: 'Outro' },
    ],
  };
}

export const PAPEIS_PADRAO: PapelParticipante[] = [
  { nome: 'Convidado', cortejo: false },
  { nome: 'Padrinho', cortejo: true },
  { nome: 'Madrinha', cortejo: true },
  { nome: 'Pai', cortejo: true },
  { nome: 'Mãe', cortejo: true },
  { nome: 'Daminha', cortejo: true },
  { nome: 'Pajem', cortejo: true },
  { nome: 'Florista', cortejo: true },
  { nome: 'Outro', cortejo: false },
];

/**
 * Determina dinamicamente se um papel pertence ao cortejo.
 * A fonte da verdade prioritária é a configuração dinâmica cadastrada (API/Banco).
 * Se o papel foi criado ou editado pelo usuário com cortejo=true, esta função respeita imediatamente.
 */
export function isPapelCortejo(
  papelNome?: string,
  papeisCadastrados?: PapelParticipante[]
): boolean {
  if (!papelNome) return false;
  const nomeLimpo = papelNome.trim().toLowerCase();

  // "Convidado" (ou sem papel especial) não é cortejo
  if (nomeLimpo === 'convidado' || nomeLimpo === 'convidado comum' || nomeLimpo === '') {
    return false;
  }

  // 1. Se o papel estiver cadastrado dinamicamente na API/Banco, respeita a configuração
  if (papeisCadastrados && papeisCadastrados.length > 0) {
    const encontrado = papeisCadastrados.find(
      (p) => (p.nome || '').trim().toLowerCase() === nomeLimpo
    );
    if (encontrado && encontrado.cortejo !== undefined) {
      return Boolean(encontrado.cortejo);
    }
  }

  // 2. Qualquer papel específico diferente de "Convidado" já é considerado integrante do cortejo!
  return true;
}

/**
 * Cria ou atualiza um papel (Admin)
 */
export async function salvarPapelAdmin(
  dados: { id?: string; nome: string; cortejo?: boolean },
  token?: string
): Promise<{ success: boolean; message: string; papel?: PapelParticipante }> {
  const baseUrl = getApiBaseUrl();
  const isEdicao = Boolean(dados.id);
  const endpoint = isEdicao
    ? `/api/admin/configuracoes/papeis/${encodeURIComponent(dados.id!)}`
    : '/api/admin/configuracoes/papeis';
  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

  const res = await fetch(url, {
    method: isEdicao ? 'PUT' : 'POST',
    headers: getAdminAuthHeaders(token),
    body: JSON.stringify(dados),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: json.message || 'Erro ao salvar papel.' };
  }
  return json;
}

/**
 * Exclui um papel (Admin)
 */
export async function excluirPapelAdmin(
  id: string,
  token?: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/admin/configuracoes/papeis/${encodeURIComponent(id)}`
    : `/api/admin/configuracoes/papeis/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(token),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: json.message || 'Erro ao excluir papel.' };
  }
  return json;
}

/**
 * Cria ou atualiza um vínculo (Admin)
 */
export async function salvarVinculoAdmin(
  dados: { id?: string; nome: string },
  token?: string
): Promise<{ success: boolean; message: string; vinculo?: VinculoParticipante }> {
  const baseUrl = getApiBaseUrl();
  const isEdicao = Boolean(dados.id);
  const endpoint = isEdicao
    ? `/api/admin/configuracoes/vinculos/${encodeURIComponent(dados.id!)}`
    : '/api/admin/configuracoes/vinculos';
  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

  const res = await fetch(url, {
    method: isEdicao ? 'PUT' : 'POST',
    headers: getAdminAuthHeaders(token),
    body: JSON.stringify(dados),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: json.message || 'Erro ao salvar vínculo.' };
  }
  return json;
}

/**
 * Exclui um vínculo (Admin)
 */
export async function excluirVinculoAdmin(
  id: string,
  token?: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}/api/admin/configuracoes/vinculos/${encodeURIComponent(id)}`
    : `/api/admin/configuracoes/vinculos/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(token),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: json.message || 'Erro ao excluir vínculo.' };
  }
  return json;
}
