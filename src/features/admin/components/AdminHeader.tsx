import React from "react";
import type { Tab, UserRole } from "../types";

interface AdminHeaderProps {
  isLogged: boolean;
  userRole: UserRole;
  activeTab: Tab;
  tabsDisponiveis: { id: Tab; label: string }[];
  onSelectTab: (tab: Tab) => void;
  onLogout: () => void;
  onClose: () => void;
}

export function AdminHeader({
  isLogged,
  activeTab,
  tabsDisponiveis,
  onSelectTab,
  onLogout,
  onClose,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFD5] px-3 sm:px-8 py-3 transition-all shadow-xs">
      <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        {/* Marca & Botão de Retorno */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.14em] uppercase text-[#6B5A4D] hover:text-[#261811] transition-colors py-1.5 px-2.5 rounded-[6px] hover:bg-[#EFE9DD] cursor-pointer font-medium"
            title="Voltar ao convite"
          >
            <span className="text-base leading-none">←</span>
            <span className="hidden sm:inline">Voltar ao Convite</span>
            <span className="sm:hidden">Convite</span>
          </button>
          <div className="h-4 w-px bg-[#D8CDC0]" />
          <span className="font-serif text-base sm:text-lg text-[#261811] font-normal tracking-wide">
            Painel Administrativo
          </span>
          <span className="hidden md:inline font-serif italic text-xs text-[#8C7A6B]">
            · Tainara &amp; Thiago
          </span>
        </div>

        {/* Abas e Ações de Usuário Autenticado */}
        {isLogged && (
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {tabsDisponiveis.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTab(t.id)}
                className={`text-[0.66rem] sm:text-[0.72rem] font-sans tracking-[0.12em] uppercase px-2.5 sm:px-3 py-1.5 rounded-[6px] transition-all cursor-pointer font-medium ${
                  activeTab === t.id
                    ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                    : "text-[#6B5A4D] hover:text-[#261811] hover:bg-[#EFE9DD]"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="h-4 w-px bg-[#D8CDC0] mx-0.5" />

            <button
              type="button"
              onClick={onLogout}
              className="text-[0.66rem] sm:text-[0.68rem] font-sans tracking-[0.12em] uppercase px-2 sm:px-2.5 py-1 text-rose-700 hover:text-rose-900 bg-rose-50/60 hover:bg-rose-100 border border-rose-200/80 rounded-[6px] transition-all cursor-pointer font-medium"
            >
              Sair
            </button>
          </div>
        )}

        {/* Botão Fechar no Mobile */}
        <button
          type="button"
          onClick={onClose}
          className="sm:hidden text-[#8C7A6B] hover:text-[#261811] p-1.5 rounded-[6px] hover:bg-[#EFE9DD] transition-colors cursor-pointer"
          aria-label="Fechar painel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
