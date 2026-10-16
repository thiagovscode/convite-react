import {
  CONVITE_ADMIN_TOKEN_KEY,
  getApiBaseUrl,
  renovarTokenAdmin,
} from "./api";
import { RECEPCAO_JWT_STORAGE_KEY, renovarTokenRecepcao } from "./convites";

/**
 * Renovação transparente de sessão.
 *
 * Quando o access token expira, o backend rejeita a chamada (401 ou 403). Em vez de mostrar
 * "Você não tem permissão" ou derrubar a sessão, renovamos o token com o refresh token
 * e repetimos a requisição uma única vez. Só se a renovação falhar o usuário precisa logar de novo.
 */

const MARGEM_EXPIRACAO_MS = 60_000;
let renovacaoEmAndamento: Promise<string | null> | null = null;

function lerToken(chave: string): string | null {
  return sessionStorage.getItem(chave) || localStorage.getItem(chave);
}

function expiracaoMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function tokenDaRequisicao(headers: Headers): string | null {
  const auth = headers.get("Authorization");
  return auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

async function renovarPara(tokenUsado: string): Promise<string | null> {
  if (renovacaoEmAndamento) return renovacaoEmAndamento;

  const ehAdmin = tokenUsado === localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
  const ehRecepcao = tokenUsado === lerToken(RECEPCAO_JWT_STORAGE_KEY);
  if (!ehAdmin && !ehRecepcao) return null;

  renovacaoEmAndamento = (ehAdmin ? renovarTokenAdmin() : renovarTokenRecepcao()).finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

export function instalarRenovacaoAutomaticaDeSessao(): void {
  if (typeof window === "undefined" || (window as any).__fetchComRenovacao) return;
  (window as any).__fetchComRenovacao = true;

  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const baseUrl = getApiBaseUrl();
    const ehApiPropria = url.includes("/api/") && (!baseUrl || url.startsWith(baseUrl) || url.startsWith("/"));
    const ehRotaDeAuth = url.includes("/api/auth/") || url.includes("/api/recepcao/login");

    // Apenas chamadas à API do evento, nunca o próprio login/refresh, e só com corpo reutilizável
    if (!ehApiPropria || ehRotaDeAuth || typeof input !== "string" || (init?.body && typeof init.body !== "string")) {
      return fetchOriginal(input, init);
    }

    const headers = new Headers(init?.headers || {});
    let tokenUsado = tokenDaRequisicao(headers);
    if (!tokenUsado) return fetchOriginal(input, init);

    // Renovação preventiva: evita a requisição falhar por token prestes a expirar
    const exp = expiracaoMs(tokenUsado);
    if (exp !== null && exp - Date.now() < MARGEM_EXPIRACAO_MS) {
      const novo = await renovarPara(tokenUsado);
      if (novo) {
        headers.set("Authorization", `Bearer ${novo}`);
        tokenUsado = novo;
      }
    }

    let resposta = await fetchOriginal(input, { ...init, headers });

    // O backend pode responder 401 ou 403 para token expirado; tentamos renovar uma vez
    if (resposta.status === 401 || resposta.status === 403) {
      const novo = await renovarPara(tokenUsado);
      if (novo && novo !== tokenUsado) {
        headers.set("Authorization", `Bearer ${novo}`);
        resposta = await fetchOriginal(input, { ...init, headers });
      }
    }

    return resposta;
  };
}
