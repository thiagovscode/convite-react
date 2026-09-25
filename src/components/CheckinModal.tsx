import React, { useState, useEffect } from "react";
import {
  buscarConvitePorCodigo,
  loginRecepcaoBackend,
  registrarCheckinBackend,
  buscarRelatorioAuditoriaBackend
} from "../services/convites";
import type { ConvitePreDefinido, MembroAutorizado, RelatorioAuditoria } from "../services/convites";

const RECEPCAO_AUTH_KEY = "CASAMENTO_RECEPCAO_AUTENTICADA";

export default function CheckinModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [tab, setTab] = useState<"leitor" | "auditoria">("leitor");

  // Login State
  const [userInput, setUserInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Busca e Checkin State
  const [codigoInput, setCodigoInput] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [conviteAtual, setConviteAtual] = useState<ConvitePreDefinido | null>(null);
  
  // Seleção individual de presença para a família atual
  // Map de membroId -> boolean (true = presente, false = ausente)
  const [selecaoPresenca, setSelecaoPresenca] = useState<Record<string, boolean>>({});
  const [salvandoCheckin, setSalvandoCheckin] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroCheckin, setErroCheckin] = useState("");

  // Relatório de Auditoria para o Buffet
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);

  useEffect(() => {
    const authSalva = localStorage.getItem(RECEPCAO_AUTH_KEY);
    if (authSalva === "true") {
      setIsAutenticado(true);
      carregarAuditoria();
    }

    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkin") === "true" || window.location.hash.includes("checkin=true")) {
        setIsOpen(true);
        document.body.style.overflow = "hidden";
      }
    };

    checkUrl();
    window.addEventListener("popstate", checkUrl);

    return () => {
      window.removeEventListener("popstate", checkUrl);
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    document.body.style.overflow = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("checkin");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  };

  const carregarAuditoria = async () => {
    setCarregandoAuditoria(true);
    const data = await buscarRelatorioAuditoriaBackend();
    if (data) {
      setRelatorio(data);
    }
    setCarregandoAuditoria(false);
  };

  const handleLoginRecepcao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const res = await loginRecepcaoBackend(userInput, passInput);
    setLoginLoading(false);

    if (res.success) {
      setIsAutenticado(true);
      localStorage.setItem(RECEPCAO_AUTH_KEY, "true");
      setUserInput("");
      setPassInput("");
      carregarAuditoria();
    } else {
      setLoginError(res.message || "Usuário ou senha incorretos.");
    }
  };

  const handleLogoutRecepcao = () => {
    localStorage.removeItem(RECEPCAO_AUTH_KEY);
    setIsAutenticado(false);
    setConviteAtual(null);
  };

  // Buscar convite por código, QR code ou texto
  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const termo = codigoInput.trim();
    if (!termo) return;

    setLoadingBusca(true);
    setErroCheckin("");
    setMensagemSucesso("");

    let codigoLimpo = termo;
    try {
      if (termo.startsWith("{")) {
        const parsed = JSON.parse(termo);
        codigoLimpo = parsed.codigo || termo;
      }
    } catch {
      // texto normal
    }

    const c = await buscarConvitePorCodigo(codigoLimpo);
    setLoadingBusca(false);

    if (c) {
      setConviteAtual(c);
      // Inicializa presença: se já tinha checkin gravado, usa o status; senão, default = true para quem confirmou RSVP
      const sel: Record<string, boolean> = {};
      c.membros?.forEach(m => {
        if (m.presenteCheckin !== undefined) {
          sel[m.id] = m.presenteCheckin;
        } else {
          // Default: se confirmou RSVP, pré-marca como presente para agilizar
          sel[m.id] = m.confirmadoRsvp !== false;
        }
      });
      setSelecaoPresenca(sel);
    } else {
      setConviteAtual(null);
      setErroCheckin(`Nenhum convite localizado com o código ou nome "${codigoLimpo}".`);
    }
  };

  const alternarPresencaMembro = (id: string) => {
    setSelecaoPresenca(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const marcarTodos = (presente: boolean) => {
    if (!conviteAtual?.membros) return;
    const sel: Record<string, boolean> = {};
    conviteAtual.membros.forEach(m => {
      sel[m.id] = presente;
    });
    setSelecaoPresenca(sel);
  };

  const salvarPresenca = async () => {
    if (!conviteAtual) return;
    setSalvandoCheckin(true);
    setErroCheckin("");
    setMensagemSucesso("");

    const presencas = (conviteAtual.membros || []).map(m => ({
      membroId: m.id,
      presente: !!selecaoPresenca[m.id]
    }));

    const res = await registrarCheckinBackend(conviteAtual.codigo, presencas, "Portaria");
    setSalvandoCheckin(false);

    if (res.success) {
      const presentesQtd = Object.values(selecaoPresenca).filter(Boolean).length;
      const ausentesQtd = presencas.length - presentesQtd;

      setMensagemSucesso(`Entrada registrada com sucesso! Presentes: ${presentesQtd} | Ausentes: ${ausentesQtd}`);
      carregarAuditoria();
      // Atualiza localmente no modal
      if (res.convite) {
        setConviteAtual(res.convite);
      }
    } else {
      setErroCheckin(res.message || "Erro ao salvar check-in.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-[#160E0A] bg-opacity-85 backdrop-blur-sm" onClick={close}></div>

      <div className="relative w-full max-w-[700px] my-auto bg-[#F8F4EC] border-2 border-[#967D67] shadow-2xl p-5 sm:p-7 z-10 text-[#261811] max-h-[92dvh] flex flex-col justify-between rounded-sm">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#967D67] pb-3 mb-4 shrink-0">
          <div>
            <span className="font-display tracking-[0.25em] uppercase text-[0.7rem] text-[#543D30] font-bold">
              Portaria &amp; Cerimonial
            </span>
            <h2 className="font-serif text-2xl text-[#261811] font-semibold">
              Recepção do Casamento
            </h2>
          </div>
          <button onClick={close} className="text-[#543D30] hover:text-[#261811] p-1 font-bold" aria-label="Fechar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. SE NÃO AUTENTICADO: LOGIN DA RECEPÇÃO */}
        {!isAutenticado ? (
          <form onSubmit={handleLoginRecepcao} className="p-5 border-2 border-[#967D67] bg-[#EAE0D2] space-y-4 max-w-[420px] mx-auto my-6 text-left rounded-sm">
            <div className="text-center pb-1">
              <h3 className="font-serif text-xl text-[#261811] font-semibold">Acesso da Portaria</h3>
              <p className="font-serif italic text-xs text-[#453126] mt-0.5">
                Digite as credenciais fornecidas previamente pelos noivos para iniciar a recepção dos convidados.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-100 border border-red-500 p-2.5 text-xs text-red-950 font-bold">
                {loginError}
              </div>
            )}

            <div>
              <label className="block font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] font-bold mb-1">
                Usuário da Recepção
              </label>
              <input
                type="text"
                required
                autoFocus
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="recepcao"
                className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
              />
            </div>

            <div>
              <label className="block font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] font-bold mb-1">
                Senha da Portaria
              </label>
              <input
                type="password"
                required
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] py-2.5 font-display text-xs tracking-widest uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? "Verificando..." : "Entrar na Portaria"}
            </button>
          </form>
        ) : (
          /* 2. RECONHECIMENTO E CONFERÊNCIA NOMINAL */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
            
            {/* Top Bar com Tabs e Logout */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67] pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("leitor")}
                  className={`px-3 py-1 font-display text-xs uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "leitor"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Conferir Convite / QR Code
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("auditoria"); carregarAuditoria(); }}
                  className={`px-3 py-1 font-display text-xs uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "auditoria"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Placar do Buffet
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[0.7rem] font-serif text-[#543D30]">
                  Operador: <strong className="text-[#261811]">Recepção</strong>
                </span>
                <button
                  type="button"
                  onClick={handleLogoutRecepcao}
                  className="text-[0.7rem] text-red-800 underline hover:text-red-950 font-bold"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* TAB 1: LEITOR & CHECK-IN NOMINAL */}
            {tab === "leitor" && (
              <div className="space-y-4">
                {/* Campo de Busca / Scanner */}
                <form onSubmit={handleBuscar} className="space-y-2">
                  <label className="block font-display text-[0.68rem] tracking-wider uppercase text-[#543D30] font-bold">
                    Código do Convite, Nome da Família ou Texto do QR Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      placeholder="Ex: fulana, padrinhos-joao ou aponte o leitor"
                      className="flex-1 bg-[#FAF7F0] border-2 border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811]"
                    />
                    <button
                      type="submit"
                      disabled={loadingBusca}
                      className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-4 py-2 font-display text-xs tracking-wider uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loadingBusca ? "Buscando..." : "Localizar"}
                    </button>
                  </div>
                </form>

                {erroCheckin && (
                  <div className="p-3 bg-red-100 border border-red-500 text-xs text-red-950 font-medium">
                    {erroCheckin}
                  </div>
                )}

                {mensagemSucesso && (
                  <div className="p-3 bg-emerald-100 border border-emerald-600 text-xs text-emerald-950 font-semibold">
                    {mensagemSucesso}
                  </div>
                )}

                {/* FICHA DO CONVITE LOCALIZADO */}
                {conviteAtual && (
                  <div className="border-2 border-[#967D67] bg-[#FAF7F0] p-4 space-y-4 rounded-sm">
                    <div className="flex flex-wrap justify-between items-start border-b border-[#967D67] pb-2">
                      <div>
                        <span className="font-display text-[0.65rem] tracking-widest uppercase text-[#543D30] font-bold">
                          Convite Localizado: #{conviteAtual.codigo}
                        </span>
                        <h3 className="font-serif text-xl font-bold text-[#261811]">
                          {conviteAtual.familia}
                        </h3>
                        {conviteAtual.telefone && (
                          <p className="font-serif text-xs text-[#543D30]">
                            Telefone: {conviteAtual.telefone}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 text-[0.65rem] font-display uppercase font-bold tracking-wider border ${
                          conviteAtual.status === "CONFIRMADO"
                            ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                            : conviteAtual.status === "RECUSADO"
                            ? "bg-red-100 border-red-500 text-red-900"
                            : "bg-amber-100 border-amber-500 text-amber-900"
                        }`}>
                          RSVP: {conviteAtual.status || "PENDENTE"}
                        </span>
                      </div>
                    </div>

                    {/* Instrução para o caso de faltas no dia */}
                    <div className="bg-[#EAE0D2] p-2.5 text-xs text-[#453126] font-serif border border-[#967D67]">
                      <strong>Instrução da Recepção:</strong> Marque apenas quem está fisicamente presente na portaria.
                      Se alguém faltou, desmarque a pessoa para abater da contagem do Buffet.
                    </div>

                    {/* Lista Nominal de Membros */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-serif font-bold text-[#543D30]">
                        <span>Membros Autorizados do Convite:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => marcarTodos(true)}
                            className="text-[#261811] underline hover:text-[#543D30] cursor-pointer"
                          >
                            Entraram Todos
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => marcarTodos(false)}
                            className="text-[#543D30] underline hover:text-[#261811] cursor-pointer"
                          >
                            Desmarcar Todos
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-[#EAE0D2] border border-[#967D67] bg-[#FFF]">
                        {conviteAtual.membros?.map((m) => {
                          const isPresente = !!selecaoPresenca[m.id];
                          return (
                            <div
                              key={m.id}
                              onClick={() => alternarPresencaMembro(m.id)}
                              className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                isPresente ? "bg-emerald-50/70" : "bg-red-50/40"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isPresente}
                                  onChange={() => alternarPresencaMembro(m.id)}
                                  className="w-4 h-4 accent-[#261811] cursor-pointer"
                                />
                                <div>
                                  <p className="font-serif text-sm font-semibold text-[#261811]">
                                    {m.nome}
                                    {m.titular && (
                                      <span className="ml-2 font-display text-[0.6rem] tracking-wider uppercase text-[#543D30]">
                                        (Titular)
                                      </span>
                                    )}
                                  </p>
                                  <p className="font-serif text-xs text-[#543D30]">
                                    {m.criancaAte6Anos
                                      ? "Criança (Menor de 7 anos - Isenta / Reduzida)"
                                      : "Adulto / Acima de 7 anos (Pagante Integral)"}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                {isPresente ? (
                                  <span className="inline-block px-2 py-0.5 font-display text-[0.65rem] tracking-wider uppercase font-bold bg-emerald-600 text-white rounded-sm">
                                    Presente
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 font-display text-[0.65rem] tracking-wider uppercase font-bold bg-[#8C2D19] text-white rounded-sm">
                                    Não Compareceu
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resumo da Ação e Botão de Confirmação */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#967D67]">
                      <div className="text-xs font-serif text-[#453126]">
                        Entrada calculada:{" "}
                        <strong className="text-[#261811]">
                          {Object.values(selecaoPresenca).filter(Boolean).length} presentes
                        </strong>{" "}
                        de {conviteAtual.membros?.length || 0} previstos.
                      </div>

                      <button
                        type="button"
                        onClick={salvarPresenca}
                        disabled={salvandoCheckin}
                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-5 py-2.5 font-display text-xs tracking-widest uppercase font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {salvandoCheckin ? "Salvando Entrada..." : "Confirmar Entrada na Festa"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PLACAR DE AUDITORIA PARA O BUFFET */}
            {tab === "auditoria" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-lg font-bold text-[#261811]">
                    Conferência Oficial para o Buffet
                  </h3>
                  <button
                    type="button"
                    onClick={carregarAuditoria}
                    disabled={carregandoAuditoria}
                    className="text-xs text-[#261811] underline hover:text-[#543D30] font-serif"
                  >
                    {carregandoAuditoria ? "Atualizando..." : "Recarregar Placar"}
                  </button>
                </div>

                {relatorio ? (
                  <div className="space-y-4">
                    {/* Grid de Métricas Principais */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-[#EAE0D2] border border-[#967D67] text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30] font-bold block">
                          Total Convidado
                        </span>
                        <strong className="font-serif text-2xl text-[#261811]">
                          {relatorio.totalConvidadosPrevistos}
                        </strong>
                        <span className="block text-[0.65rem] text-[#543D30]">
                          ({relatorio.totalAdultosPrevistos} ad / {relatorio.totalCriancasPrevistas} cr)
                        </span>
                      </div>

                      <div className="p-3 bg-[#EAE0D2] border border-[#967D67] text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30] font-bold block">
                          Confirmados RSVP
                        </span>
                        <strong className="font-serif text-2xl text-blue-950">
                          {relatorio.totalConfirmadosRsvp}
                        </strong>
                        <span className="block text-[0.65rem] text-[#543D30]">
                          ({relatorio.totalAdultosConfirmados} ad / {relatorio.totalCriancasConfirmadas} cr)
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-100 border-2 border-emerald-600 text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-emerald-950 font-bold block">
                          Presentes Reais
                        </span>
                        <strong className="font-serif text-2xl text-emerald-950">
                          {relatorio.totalPresentesReais}
                        </strong>
                        <span className="block text-[0.65rem] text-emerald-900 font-bold">
                          ({relatorio.totalAdultosPresentes} ad / {relatorio.totalCriancasPresentes} cr)
                        </span>
                      </div>

                      <div className="p-3 bg-red-100 border border-red-500 text-center">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-red-950 font-bold block">
                          Faltaram no Dia
                        </span>
                        <strong className="font-serif text-2xl text-red-950">
                          {relatorio.totalAusentesNoShow}
                        </strong>
                        <span className="block text-[0.65rem] text-red-900">
                          (No-Show confirmado)
                        </span>
                      </div>
                    </div>

                    {/* Explicação de Acerto de Contas */}
                    <div className="p-3 bg-[#FAF7F0] border border-[#967D67] text-xs font-serif text-[#453126]">
                      <strong>Métrica do Buffet:</strong> Cobrança final deve se basear nos <strong>{relatorio.totalPresentesReais} presentes reais</strong> ({relatorio.totalAdultosPresentes} adultos pagantes integrais e {relatorio.totalCriancasPresentes} crianças).
                    </div>

                    {/* Tabela de Famílias */}
                    <div className="max-h-[300px] overflow-y-auto border border-[#967D67] bg-[#FFF] text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#EAE0D2] font-display text-[0.65rem] uppercase tracking-wider text-[#261811] sticky top-0">
                          <tr>
                            <th className="p-2 border-b border-[#967D67]">Família</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Previstos</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Confirmados</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Presentes</th>
                            <th className="p-2 border-b border-[#967D67] text-center">Faltaram</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE0D2] font-serif">
                          {relatorio.familias.map((f) => (
                            <tr key={f.codigo} className="hover:bg-[#FAF7F0]">
                              <td className="p-2">
                                <strong className="text-[#261811]">{f.familia}</strong>
                                <span className="block text-[0.65rem] text-[#543D30]">#{f.codigo}</span>
                              </td>
                              <td className="p-2 text-center text-[#543D30]">{f.totalMembros}</td>
                              <td className="p-2 text-center text-blue-900 font-semibold">{f.confirmadosRsvp}</td>
                              <td className="p-2 text-center text-emerald-900 font-bold">{f.presentesCheckin}</td>
                              <td className="p-2 text-center text-red-900 font-semibold">{f.ausentesNoShow}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="font-serif italic text-sm text-[#543D30]">
                    Carregando dados da auditoria...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#967D67] pt-3 mt-4 flex justify-between items-center text-xs text-[#543D30] font-serif shrink-0">
          <span>Sistema Integrado com AWS &amp; Portaria</span>
          <button onClick={close} className="underline text-[#261811] hover:text-[#543D30] font-semibold cursor-pointer">
            Voltar ao Convite
          </button>
        </div>
      </div>
    </div>
  );
}
