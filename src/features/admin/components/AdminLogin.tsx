import React, { useState } from "react";

interface AdminLoginProps {
  onLogin: (username: string, pass: string) => Promise<void>;
  loading: boolean;
  error: string;
}

export function AdminLogin({ onLogin, loading, error }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-6 sm:py-10">
      <div className="w-full max-w-[420px] bg-white border border-[#E8DFD5] rounded-[12px] shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] p-6 sm:p-9 text-[#261811]">
        <div className="text-center border-b border-[#EAE0D5] pb-5 mb-6">
          <span className="font-sans text-[0.68rem] tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold block mb-1">
            Acesso Restrito
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light tracking-[-0.01em]">
            Painel Administrativo
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#6B5A4D] leading-relaxed mt-1.5">
            Tainara &amp; Thiago · 24.01.2027
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#FAF7F2] border-l-2 border-[#A85848] py-2.5 px-3 text-xs sm:text-sm text-[#543D30] font-serif rounded-[4px] text-left">
              {error}
            </div>
          )}

          <div className="text-left space-y-1">
            <label className="block text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold">
              Usuário
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-base placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#261811] rounded-[8px] transition-colors"
              placeholder="Digite seu usuário..."
            />
          </div>

          <div className="text-left space-y-1">
            <label className="block text-[0.66rem] font-sans tracking-[0.18em] uppercase text-[#8C7A6B] font-semibold">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-base placeholder:text-[#A8988B] placeholder:italic focus:outline-none focus:border-[#261811] rounded-[8px] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] py-3.5 px-6 font-sans text-xs tracking-[0.16em] uppercase font-semibold transition-all rounded-[8px] cursor-pointer disabled:opacity-50 min-h-[48px] shadow-sm"
            >
              {loading ? "Autenticando..." : "Entrar no Painel"}
            </button>
          </div>

          <p className="text-center text-[0.76rem] text-[#8C7A6B] font-serif italic pt-1">
            Acesso seguro para noivos, cerimonial e equipe de portaria.
          </p>
        </form>
      </div>
    </div>
  );
}
