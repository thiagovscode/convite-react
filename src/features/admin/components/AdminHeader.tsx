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
    <header className="sticky top-0 z-40 bg-[#FBFBFA]/95 backdrop-blur-md border-b border-[#E6E2DB] px-3.5 sm:px-8 py-3 transition-all shadow-xs">
      <div className="max-w-[1240px] mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Marca & Retorno */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-sans text-[#6B645C] hover:text-[#1A1816] transition-colors py-1 px-2.5 rounded-md hover:bg-[#EFECE6] cursor-pointer font-medium"
            title="Voltar ao convite"
          >
            <span className="text-sm leading-none">←</span>
            <span className="hidden sm:inline">Voltar ao convite</span>
            <span className="sm:hidden">Voltar</span>
          </button>
          <div className="h-3.5 w-px bg-[#DCD6CC]" />
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-base sm:text-lg text-[#1A1816] font-normal tracking-tight">
              Gestão do Casamento
            </span>
            <span className="hidden md:inline font-serif italic text-xs text-[#8C7355]">
              Tainara &amp; Thiago
            </span>
          </div>
        </div>

        {/* Navegação por Abas */}
        {isLogged && (
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {tabsDisponiveis.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTab(t.id)}
                className={`text-xs font-sans px-3 py-1.5 rounded-md transition-all cursor-pointer font-medium ${
                  activeTab === t.id
                    ? "bg-[#1A1816] text-[#FAF9F5] shadow-xs"
                    : "text-[#6B645C] hover:text-[#1A1816] hover:bg-[#EFECE6]"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="h-3.5 w-px bg-[#DCD6CC] mx-1" />

            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-sans px-2.5 py-1 text-[#8C382A] hover:text-[#5E1F14] hover:bg-[#FAF0EE] rounded-md transition-all cursor-pointer font-medium"
            >
              Sair
            </button>
          </div>
        )}

        {/* Botão Fechar no Mobile */}
        <button
          type="button"
          onClick={onClose}
          className="sm:hidden text-[#6B645C] hover:text-[#1A1816] p-1.5 rounded-md hover:bg-[#EFECE6] transition-colors cursor-pointer"
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
