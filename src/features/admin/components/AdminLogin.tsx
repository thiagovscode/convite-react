import React, { useState } from "react";

interface AdminLoginProps {
  onLogin: (username: string, pass: string) => Promise<void>;
  loading: boolean;
  error: string;
}

export function AdminLogin({ onLogin, loading, error }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 sm:py-12 px-2">
      <div className="w-full max-w-[440px] bg-white border border-[#E8DFD5] rounded-[16px] shadow-[0_8px_36px_-10px_rgba(38,24,17,0.08)] p-6 sm:p-10 text-[#261811] relative overflow-hidden">
        {/* Top editorial accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#261811]" />

        <div className="text-center border-b border-[#EAE0D5] pb-5 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#E5DCD0] flex items-center justify-center mx-auto mb-3 text-[#261811]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="font-sans text-[0.68rem] tracking-[0.22em] uppercase text-[#6B5A4D] font-semibold block mb-1">
            Acesso Restrito
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal tracking-[-0.01em]">
            Painel Administrativo
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#6B5A4D] leading-relaxed mt-1">
            Tainara &amp; Thiago · 24.01.2027
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-rose-50/80 border border-rose-200 border-l-4 border-l-rose-700 py-3 px-3.5 text-xs sm:text-sm text-rose-950 font-sans rounded-[8px] text-left flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="text-left space-y-1.5">
            <label
              htmlFor="admin-login-username"
              className="block text-[0.68rem] font-sans tracking-[0.16em] uppercase text-[#543D30] font-semibold"
            >
              Usuário
            </label>
            <input
              id="admin-login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#FAF7F2]/60 focus:bg-white border border-[#D8CDC0] px-4 py-3 text-[#261811] font-sans text-sm placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#261811] rounded-[10px] transition-colors min-h-[46px]"
              placeholder="Ex: noivos ou recepcao"
            />
          </div>

          <div className="text-left space-y-1.5">
            <label
              htmlFor="admin-login-password"
              className="block text-[0.68rem] font-sans tracking-[0.16em] uppercase text-[#543D30] font-semibold"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="admin-login-password"
                type={showPass ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FAF7F2]/60 focus:bg-white border border-[#D8CDC0] pl-4 pr-11 py-3 text-[#261811] font-sans text-sm placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#261811] rounded-[10px] transition-colors min-h-[46px]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#6B5A4D] hover:text-[#261811] rounded-md transition-colors cursor-pointer"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                title={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] py-3.5 px-6 font-sans text-xs tracking-[0.16em] uppercase font-semibold transition-all rounded-[10px] cursor-pointer disabled:opacity-50 min-h-[48px] shadow-sm flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-[#FAF7F2] border-t-transparent rounded-full animate-spin" />
              )}
              <span>{loading ? "Autenticando..." : "Entrar no Painel"}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#F0EAE0] flex items-center justify-center gap-4 text-[0.72rem] text-[#6B5A4D] font-sans">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#261811]" />
              Noivos &amp; Cerimonial
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Portaria &amp; Recepção
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

