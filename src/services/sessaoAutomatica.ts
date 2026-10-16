import {
  CONVITE_ADMIN_REFRESH_KEY,
  CONVITE_ADMIN_TOKEN_KEY,
  getApiBaseUrl,
  renovarTokenAdmin,
} from "./api";
import {
  RECEPCAO_JWT_STORAGE_KEY,
  RECEPCAO_REFRESH_STORAGE_KEY,
  renovarTokenRecepcao,
} from "./convites";

/**
 * Renovação transparente de sessão e encerramento imediato quando não houver token válido.
 *
 * Quando o access token expira, o backend rejeita a chamada (401 ou 403). Em vez de mostrar
 * "Você não tem permissão" ou derrubar a sessão prematuramente, renovamos o token com o refresh token
 * e repetimos a requisição uma única vez. Se a renovação falhar ou o token continuar inválido,
 * limpamos os tokens e notificamos a aplicação para voltar imediatamente à tela de login.
 */

const MARGEM_EXPIRACAO_MS = 60_000;

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
  return auth && auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

function encerrarSessaoInvalida(): void {
  localStorage.removeItem(CONVITE_ADMIN_TOKEN_KEY);
  localStorage.removeItem(CONVITE_ADMIN_REFRESH_KEY);
  sessionStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
  sessionStorage.removeItem(RECEPCAO_REFRESH_STORAGE_KEY);
  localStorage.removeItem(RECEPCAO_JWT_STORAGE_KEY);
  localStorage.removeItem(RECEPCAO_REFRESH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("sessao-jwt-expirada"));
}

async function renovarPara(tokenUsado: string | null, url: string): Promise<string | null> {
  const adminAtual = localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY);
  const recepcaoAtual = lerToken(RECEPCAO_JWT_STORAGE_KEY);

  const ehAdmin =
    (tokenUsado && tokenUsado === adminAtual) ||
    url.includes("/api/admin/") ||
    Boolean(localStorage.getItem(CONVITE_ADMIN_REFRESH_KEY));
  const ehRecepcao =
    (tokenUsado && tokenUsado === recepcaoAtual) ||
    url.includes("/api/recepcao/") ||
    Boolean(lerToken(RECEPCAO_REFRESH_STORAGE_KEY));

  if (ehAdmin) {
    const novo = await renovarTokenAdmin();
    if (novo) return novo;
  }
  if (ehRecepcao) {
    const novo = await renovarTokenRecepcao();
    if (novo) return novo;
  }
  return null;
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
    const ehRotaProtegida = url.includes("/api/admin/") || url.includes("/api/recepcao/");

    // Apenas chamadas à API do evento, nunca o próprio login/refresh, e só com corpo reutilizável
    if (!ehApiPropria || ehRotaDeAuth || typeof input !== "string" || (init?.body && typeof init.body !== "string")) {
      return fetchOriginal(input, init);
    }

    const headers = new Headers(init?.headers || {});
    let tokenUsado = tokenDaRequisicao(headers);

    if (!tokenUsado && !ehRotaProtegida) {
      return fetchOriginal(input, init);
    }

    // Se a rota é protegida mas estava sem token no header, tenta recuperar ou renovar antes de enviar
    if (!tokenUsado && ehRotaProtegida) {
      tokenUsado = localStorage.getItem(CONVITE_ADMIN_TOKEN_KEY) || lerToken(RECEPCAO_JWT_STORAGE_KEY);
      if (!tokenUsado) {
        tokenUsado = await renovarPara(null, url);
      }
      if (tokenUsado) {
        headers.set("Authorization", `Bearer ${tokenUsado}`);
      }
    }

    // Renovação preventiva: evita a requisição falhar por token expirado ou prestes a expirar
    if (tokenUsado) {
      const exp = expiracaoMs(tokenUsado);
      if (exp === null || exp - Date.now() < MARGEM_EXPIRACAO_MS) {
        const novo = await renovarPara(tokenUsado, url);
        if (novo) {
          headers.set("Authorization", `Bearer ${novo}`);
          tokenUsado = novo;
        } else if (exp === null || exp <= Date.now()) {
          encerrarSessaoInvalida();
        }
      }
    }

    let resposta = await fetchOriginal(input, { ...init, headers });

    // O backend responde 401 ou 403 para token expirado/inválido; tentamos renovar uma única vez
    if (resposta.status === 401 || resposta.status === 403) {
      const novo = await renovarPara(tokenUsado, url);
      if (novo && novo !== tokenUsado) {
        headers.set("Authorization", `Bearer ${novo}`);
        resposta = await fetchOriginal(input, { ...init, headers });
      }
      // Se não foi possível renovar ou se mesmo após renovar o backend rejeitou com 401/403, desloga imediatamente
      if (resposta.status === 401 || resposta.status === 403) {
        encerrarSessaoInvalida();
      }
    }

    return resposta;
  };
}
