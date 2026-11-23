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
  userRole,
  activeTab,
  tabsDisponiveis,
  onSelectTab,
  onLogout,
  onClose,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFD5] transition-all shadow-[0_2px_12px_-4px_rgba(38,24,17,0.05)]">
      <div className="max-w-[1200px] mx-auto px-3.5 sm:px-8">
        {/* Top Row: Brand, Profile Indicator & Actions */}
        <div className="flex items-center justify-between gap-2 py-3">
          {/* Marca & Botão de Retorno */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-sans tracking-[0.12em] uppercase text-[#543D30] hover:text-[#261811] transition-colors py-1.5 px-2.5 rounded-[8px] bg-white/80 hover:bg-[#EFE9DD] border border-[#E5DCD0] cursor-pointer font-semibold shrink-0 min-h-[34px]"
              title="Voltar ao convite"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Voltar ao Convite</span>
              <span className="sm:hidden">Convite</span>
            </button>

            <div className="h-4 w-px bg-[#D8CDC0] shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-serif text-base sm:text-lg text-[#261811] font-medium tracking-wide truncate">
                Painel Administrativo
              </span>
              <span className="hidden lg:inline font-serif italic text-xs text-[#6B5A4D] shrink-0">
                · Tainara &amp; Thiago
              </span>
            </div>
          </div>

          {/* Desktop Tabs (Inline on large screens) & User Profile / Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {isLogged && (
              <>
                <span
                  className={`hidden md:inline-flex items-center gap-1.5 text-[0.64rem] font-sans tracking-[0.14em] uppercase px-2.5 py-1 rounded-full font-semibold border ${
                    userRole === "recepcao"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-[#EFE9DD]/80 text-[#543D30] border-[#D8CDC0]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      userRole === "recepcao" ? "bg-emerald-600" : "bg-[#261811]"
                    }`}
                  />
                  {userRole === "recepcao" ? "Recepção & Portaria" : "Noivos & Cerimonial"}
                </span>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 text-[0.68rem] font-sans tracking-[0.12em] uppercase px-2.5 py-1.5 text-rose-800 hover:text-rose-950 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 rounded-[8px] transition-all cursor-pointer font-semibold min-h-[34px]"
                  title="Encerrar sessão"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sair</span>
                </button>
              </>
            )}

            {/* Botão Fechar no Mobile quando deslogado */}
            {!isLogged && (
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden text-[#6B5A4D] hover:text-[#261811] p-1.5 rounded-[8px] hover:bg-[#EFE9DD] transition-colors cursor-pointer"
                aria-label="Fechar painel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Row (Scrollable on mobile, clean segmented bar on desktop) */}
        {isLogged && (
          <nav
            aria-label="Navegação do painel administrativo"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 pt-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 border-t border-[#EAE0D5]/70 sm:border-t-0"
          >
            {tabsDisponiveis.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTab(t.id)}
                  className={`text-[0.68rem] sm:text-[0.72rem] font-sans tracking-[0.12em] uppercase px-3.5 py-2 rounded-[8px] transition-all cursor-pointer font-semibold whitespace-nowrap shrink-0 min-h-[36px] flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#261811] text-[#FAF7F2] shadow-xs"
                      : "text-[#543D30] bg-white/60 hover:bg-[#EFE9DD] hover:text-[#261811] border border-[#E8DFD5]"
                  }`}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}

