import React, { useRef, useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { ConvitePreDefinido } from "../../../services/convites";
import {
  registrarCheckinBackend,
  getFilaOfflineCheckins,
  sincronizarFilaOffline,
} from "../../../services/convites";
import { playCheckinSuccessSound, triggerHaptic } from "../utils/sound";

interface PortariaTabProps {
  onRefreshData?: () => void;
}

export function PortariaTab({ onRefreshData }: PortariaTabProps) {
  const [codigoInput, setCodigoInput] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [conviteAtual, setConviteAtual] = useState<ConvitePreDefinido | null>(null);
  const [resultadosBusca, setResultadosBusca] = useState<ConvitePreDefinido[]>([]);
  const [selecaoPresenca, setSelecaoPresenca] = useState<Record<string, boolean>>({});
  const [salvandoCheckin, setSalvandoCheckin] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroCheckin, setErroCheckin] = useState("");
  const [filaOffline, setFilaOffline] = useState(0);
  const [sincronizandoOffline, setSincronizandoOffline] = useState(false);

  const atualizarContadorOffline = () => {
    setFilaOffline(getFilaOfflineCheckins().length);
  };

  useEffect(() => {
    atualizarContadorOffline();

    const handleOnline = async () => {
      setSincronizandoOffline(true);
      await sincronizarFilaOffline();
      setSincronizandoOffline(false);
      atualizarContadorOffline();
      onRefreshData?.();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Câmera & Leitor
  const [cameraAberta, setCameraAberta] = useState(false);
  const [cameraIniciando, setCameraIniciando] = useState(false);
  const [cameraErro, setCameraErro] = useState("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const inputBuscaRef = useRef<HTMLInputElement | null>(null);

  const iniciarCamera = async () => {
    setCameraErro("");
    setCameraAberta(true);
    setCameraIniciando(true);
    setErroCheckin("");
    setMensagemSucesso("");

    setTimeout(async () => {
      try {
        const qrRegionId = "qr-reader-portaria-feature-container";
        const elem = document.getElementById(qrRegionId);
        if (!elem) {
          setCameraIniciando(false);
          return;
        }

        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
          } catch {}
        }

        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 };

        const onScanSuccess = async (decodedText: string) => {
          try {
            if (html5QrCode.isScanning) await html5QrCode.stop();
          } catch {}
          html5QrCodeRef.current = null;
          setCameraAberta(false);
          setCameraIniciando(false);
          processarCodigo(decodedText);
        };

        try {
          await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
        } catch {
          await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
        }
        setCameraIniciando(false);
      } catch {
        setCameraIniciando(false);
        setCameraErro("Câmera indisponível. Utilize a busca manual pelo nome ou código abaixo.");
      }
    }, 150);
  };

  const pararCamera = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
      } catch {}
      html5QrCodeRef.current = null;
    }
    setCameraAberta(false);
    setCameraIniciando(false);
  };

  const handleEscanearArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraErro("");
    setErroCheckin("");
    setLoadingBusca(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-portaria-feature-container", false);
      const decodedText = await html5QrCode.scanFile(file, true);
      processarCodigo(decodedText);
    } catch {
      setErroCheckin("Não foi possível identificar o QR Code na imagem enviada.");
    } finally {
      setLoadingBusca(false);
      e.target.value = "";
    }
  };

  const selecionarConvite = (c: ConvitePreDefinido) => {
    setConviteAtual(c);
    setResultadosBusca([]);
    pararCamera();

    const membros = c.membros || [];
    const membrosPresentes = membros.filter((m) => Boolean(m.presenteCheckin));
    const todosJaEntraram = membros.length > 0 && membrosPresentes.length === membros.length;

    const sel: Record<string, boolean> = {};
    membros.forEach((m) => {
      sel[m.id] = m.presenteCheckin !== undefined ? Boolean(m.presenteCheckin) : m.confirmadoRsvp === true;
    });
    setSelecaoPresenca(sel);

    if (todosJaEntraram) {
      const primeiroCheckin = membrosPresentes.find((m) => m.dataHoraCheckin)?.dataHoraCheckin;
      const horarioFormatado = primeiroCheckin
        ? new Date(primeiroCheckin).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "";
      setErroCheckin(
        `ALERTA: Entrada já registrada anteriormente para todos os membros deste convite${
          horarioFormatado ? ` às ${horarioFormatado}` : ""
        }!`
      );
    } else {
      setMensagemSucesso("Convite localizado com sucesso.");
    }
  };

  const processarCodigo = async (termoBruto: string) => {
    const termo = termoBruto.trim();
    if (!termo) return;

    setLoadingBusca(true);
    setErroCheckin("");
    setMensagemSucesso("");
    setResultadosBusca([]);

    let codigoLimpo = termo;
    let isQrCodeJson = false;

    if (termo.startsWith("{")) {
      try {
        const parsed = JSON.parse(termo);
        if (parsed.tipo === "CREDENCIAL_STAFF_CASAMENTO") {
          const { checkinMembroFornecedorBackend } = await import("../../../services/convites");
          const res = await checkinMembroFornecedorBackend(parsed.fornecedorId, parsed.membroId, true);
          setLoadingBusca(false);
          pararCamera();
          if (res.success) {
            playCheckinSuccessSound();
            triggerHaptic();
            setConviteAtual(null);
            const ficaAteFim = Boolean(
              parsed.permaneceAteFim ||
              res.fornecedor?.equipe?.find((m: any) => m.id === parsed.membroId)?.permaneceAteFim
            );
            const tagFim = ficaAteFim
              ? " [Permanece até o fim]"
              : "";
            setMensagemSucesso(
              `Entrada de Staff Confirmada: ${parsed.nome} (${parsed.funcao || "Equipe"}) · ${parsed.empresa}${tagFim}`
            );
            onRefreshData?.();
          } else {
            setErroCheckin(res.message || "Erro ao registrar check-in do fornecedor.");
          }
          return;
        }

        if (parsed.tipo === "CREDENCIAL_FORNECEDOR_CASAMENTO") {
          setLoadingBusca(false);
          pararCamera();
          const fId = parsed.fornecedorId || parsed.id;
          const { checkinMembroFornecedorBackend } = await import("../../../services/convites");
          if (Array.isArray(parsed.membros) && parsed.membros.length > 0 && fId) {
            for (const m of parsed.membros) {
              if (m.id) {
                await checkinMembroFornecedorBackend(fId, m.id, true);
              }
            }
            playCheckinSuccessSound();
            triggerHaptic();
            setMensagemSucesso(
              `Entrada de Equipe Confirmada: ${parsed.empresa} (${parsed.membros.length} profissionais credenciados)`
            );
            onRefreshData?.();
          } else {
            setMensagemSucesso(
              `Credencial da Empresa detectada: ${parsed.empresa}. Utilize a aba Fornecedores para gerenciar os membros.`
            );
          }
          return;
        }
        codigoLimpo = parsed.codigo || parsed.id || termo;
        isQrCodeJson = true;
      } catch {}
    } else if (termo.includes("http://") || termo.includes("https://")) {
      try {
        const url = new URL(termo);
        const fornecedorParam = url.searchParams.get("fornecedor");
        if (fornecedorParam) {
          setLoadingBusca(false);
          pararCamera();
          setMensagemSucesso(`Link de credencial de fornecedor detectado: ${fornecedorParam}.`);
          return;
        }
        codigoLimpo = url.searchParams.get("convite") || url.searchParams.get("codigo") || termo;
        isQrCodeJson = true;
      } catch {}
    }

    try {
      const { buscarConvitePorCodigo, buscarConvitesPorTermoBackend } = await import(
        "../../../services/convites"
      );

      // 1. Se for QR Code ou código limpo sem espaços, tenta busca direta por código
      if (isQrCodeJson || (!codigoLimpo.includes(" ") && codigoLimpo.length <= 30)) {
        const c = await buscarConvitePorCodigo(codigoLimpo);
        if (c) {
          setLoadingBusca(false);
          selecionarConvite(c);
          return;
        }
      }

      // 2. Busca abrangente por termo (nome de membro, família, telefone ou código)
      const lista = await buscarConvitesPorTermoBackend(termo);
      setLoadingBusca(false);

      if (lista.length === 1) {
        selecionarConvite(lista[0]);
      } else if (lista.length > 1) {
        setConviteAtual(null);
        setResultadosBusca(lista);
        setMensagemSucesso(
          `${lista.length} convites encontrados para "${termo}". Escolha o participante abaixo:`
        );
      } else {
        setConviteAtual(null);
        setErroCheckin(
          `Nenhum convidado ou convite encontrado para "${termo}". Verifique se o nome ou sobrenome foi digitado corretamente.`
        );
      }
    } catch {
      setLoadingBusca(false);
      setErroCheckin("Erro de conexão ao buscar convite no servidor.");
    }
  };

  const salvarPresenca = async (forcarTodos = false) => {
    if (!conviteAtual) return;
    setSalvandoCheckin(true);
    setErroCheckin("");
    setMensagemSucesso("");

    const presencas = (conviteAtual.membros || []).map((m) => ({
      membroId: m.id,
      presente: forcarTodos ? true : !!selecaoPresenca[m.id],
    }));

    const res = await registrarCheckinBackend(conviteAtual.codigo, presencas, "Portaria");
    setSalvandoCheckin(false);
    atualizarContadorOffline();

    if (res.success) {
      playCheckinSuccessSound();
      triggerHaptic();

      const presentesQtd = presencas.filter((p) => p.presente).length;
      const totalQtd = presencas.length;

      setMensagemSucesso(
        presentesQtd === totalQtd
          ? `✓ ENTRADA CONFIRMADA · Todos os ${presentesQtd} membros presentes!`
          : `✓ ENTRADA REGISTRADA · ${presentesQtd} de ${totalQtd} presentes`
      );

      if (res.convite) setConviteAtual(res.convite);
      onRefreshData?.();
    } else {
      setErroCheckin(res.message || "Erro ao registrar check-in.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#705E51] font-semibold mb-1">
          Portaria &amp; Acolhimento
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
          Controle de Entrada dos Convidados
        </h1>
      </div>

      {filaOffline > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-[8px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 font-sans shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>Modo de Contingência Offline:</strong> {filaOffline}{" "}
              {filaOffline === 1 ? "check-in gravado localmente" : "check-ins gravados localmente"} aguardando conexão com o servidor.
            </span>
          </div>
          <button
            type="button"
            disabled={sincronizandoOffline}
            onClick={async () => {
              setSincronizandoOffline(true);
              const resultado = await sincronizarFilaOffline();
              setSincronizandoOffline(false);
              atualizarContadorOffline();
              onRefreshData?.();
              if (resultado.sincronizados > 0) {
                setMensagemSucesso(`✓ ${resultado.sincronizados} check-in(s) sincronizado(s) com sucesso com o servidor!`);
              }
            }}
            className="px-3.5 py-1.5 bg-amber-900 text-white rounded-[6px] font-semibold text-[0.7rem] uppercase tracking-wider hover:bg-amber-950 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {sincronizandoOffline ? "Sincronizando..." : "Sincronizar Agora"}
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={cameraAberta ? pararCamera : iniciarCamera}
            className="inline-flex items-center justify-center gap-2 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] px-5 py-3 font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[8px] cursor-pointer min-h-[48px] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{cameraAberta ? "Fechar Câmera" : "Escanear QR Code"}</span>
          </button>

          <label className="inline-flex items-center justify-center gap-2 bg-[#FAF7F2] hover:bg-[#EFE8DC] border border-[#D8CDC0] text-[#543D30] px-4 py-3 font-sans text-xs tracking-[0.12em] uppercase font-medium rounded-[8px] cursor-pointer min-h-[48px] shrink-0">
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Foto do QR Code</span>
            <input type="file" accept="image/*" onChange={handleEscanearArquivo} className="hidden" />
          </label>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              processarCodigo(codigoInput);
            }}
            className="flex-1 flex gap-2"
          >
            <input
              ref={inputBuscaRef}
              type="text"
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value)}
              placeholder="Buscar por sobrenome, nome ou código..."
              className="flex-1 bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-3 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] focus:bg-white rounded-[8px] transition-colors"
            />
            <button
              type="submit"
              disabled={loadingBusca}
              className="bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] px-5 py-3 font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[8px] cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {loadingBusca ? "Buscando..." : "Localizar"}
            </button>
          </form>
        </div>

        {cameraAberta && (
          <div className="pt-2">
            <div
              id="qr-reader-portaria-feature-container"
              className="max-w-[340px] mx-auto overflow-hidden rounded-[8px] border border-[#D8CDC0]"
            />
            {cameraIniciando && (
              <p className="text-center text-xs font-serif italic text-[#8C7A6B] mt-2">
                Iniciando câmera do dispositivo...
              </p>
            )}
          </div>
        )}

        {cameraErro && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-[6px] text-xs text-amber-950 font-serif">
            {cameraErro}
          </div>
        )}

        {erroCheckin && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-[6px] text-xs text-rose-950 font-serif">
            {erroCheckin}
          </div>
        )}

        {mensagemSucesso && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-[6px] text-xs font-sans text-emerald-950 font-semibold flex items-center justify-between">
            <span>{mensagemSucesso}</span>
            <button
              type="button"
              onClick={() => {
                setConviteAtual(null);
                setCodigoInput("");
                setMensagemSucesso("");
                setResultadosBusca([]);
                inputBuscaRef.current?.focus();
              }}
              className="text-xs uppercase underline tracking-wider cursor-pointer ml-3"
            >
              Próximo Convidado
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE RESULTADOS QUANDO HOUVER MÚLTIPLOS CONVITES ENCONTRADOS */}
      {resultadosBusca.length > 0 && !conviteAtual && (
        <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#EAE0D5] pb-3">
            <span className="font-sans text-[0.66rem] tracking-[0.2em] uppercase text-[#8C7A6B] font-semibold block">
              Resultados da Busca ({resultadosBusca.length})
            </span>
            <span className="text-xs font-serif italic text-[#8C7A6B]">
              Selecione o participante ou família para abrir a ficha de entrada:
            </span>
          </div>

          <div className="divide-y divide-[#EAE0D5]">
            {resultadosBusca.map((c) => {
              const membrosPresentes = c.membros?.filter((m) => Boolean(m.presenteCheckin)) || [];
              const todosEntraram =
                c.membros && c.membros.length > 0 && membrosPresentes.length === c.membros.length;

              return (
                <div
                  key={c.id || c.codigo}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF7F2]/60 p-3 rounded-[8px] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <strong className="font-serif text-lg text-[#261811]">{c.familia}</strong>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        #{c.codigo}
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[#6B5A4D]">
                      <span className="text-[#8C7A6B]">Membros: </span>
                      {c.membros?.map((m, idx) => (
                        <span key={m.id || idx}>
                          {idx > 0 && ", "}
                          <strong className="text-[#261811] font-normal">{m.nome}</strong>
                          {m.papel && m.papel !== "Convidado" && (
                            <span className="text-[#8C7A6B] font-semibold"> [{m.papel}]</span>
                          )}
                          {m.presenteCheckin && (
                            <span className="text-emerald-800 font-semibold"> (Presente)</span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selecionarConvite(c)}
                    className={`px-4 py-2.5 text-xs font-sans tracking-wider uppercase font-semibold rounded-[6px] cursor-pointer whitespace-nowrap ${
                      todosEntraram
                        ? "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                        : "bg-[#261811] hover:bg-[#1A100B] text-white"
                    }`}
                  >
                    {todosEntraram ? "Ver Ficha (Já Entraram)" : "Abrir Ficha de Entrada →"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {conviteAtual && (
        <div className="bg-white border-2 border-[#261811] rounded-[12px] p-5 sm:p-8 shadow-[0_8px_30px_-8px_rgba(38,24,17,0.1)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE0D5] pb-4">
            <div>
              <span className="font-sans text-[0.66rem] tracking-[0.2em] uppercase text-[#8C7A6B] font-semibold block">
                Ficha de Entrada Oficial
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
                {conviteAtual.familia}
              </h2>
            </div>
            <span className="font-mono text-sm font-bold bg-[#FAF7F2] px-3 py-1 rounded-[6px] border border-[#D8CDC0]">
              #{conviteAtual.codigo}
            </span>
          </div>

          {/* BOTÃO MASTER DE 1 TOQUE: CONFIRMAR ENTRADA DE TODOS */}
          <div className="p-4 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[10px] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <strong className="font-serif text-lg text-[#261811] block">
                Entrada Rápida da Família
              </strong>
              <p className="font-serif italic text-xs text-[#6B5A4D]">
                Toque no botão para confirmar a entrada de todos os convidados de uma só vez:
              </p>
            </div>

            <button
              type="button"
              disabled={salvandoCheckin}
              onClick={() => salvarPresenca(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#1E6B37] hover:bg-[#16532A] text-white font-sans text-xs tracking-[0.16em] uppercase font-semibold rounded-[8px] shadow-sm cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
            >
              <span>✓</span>
              <span>{salvandoCheckin ? "Confirmando..." : "Confirmar Entrada de Todos"}</span>
            </button>
          </div>

          {/* Lista Nominal de Membros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-sans text-[#8C7A6B]">
              <span className="font-semibold uppercase tracking-wider">Membros do Convite:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s: Record<string, boolean> = {};
                    conviteAtual.membros?.forEach((m) => (s[m.id] = true));
                    setSelecaoPresenca(s);
                  }}
                  className="underline text-[#261811] cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    const s: Record<string, boolean> = {};
                    conviteAtual.membros?.forEach((m) => (s[m.id] = false));
                    setSelecaoPresenca(s);
                  }}
                  className="underline text-[#6B5A4D] cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#EAE0D5] border border-[#E8DFD5] rounded-[8px] overflow-hidden bg-white">
              {conviteAtual.membros?.map((m) => {
                const isSel = !!selecaoPresenca[m.id];
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelecaoPresenca((p) => ({ ...p, [m.id]: !p[m.id] }))}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSel ? "bg-emerald-50/50" : "hover:bg-[#FAF7F2]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => {}}
                        className="w-4 h-4 accent-[#261811] cursor-pointer"
                      />
                      <div>
                        <span className="font-serif text-base text-[#261811] font-medium block">
                          {m.nome}
                        </span>
                        <div className="flex items-center gap-2 text-[0.68rem] font-sans text-[#8C7A6B] flex-wrap mt-0.5">
                          {m.papel && m.papel !== "Convidado" && m.papel !== "Convidado comum" && (
                            <span className="bg-[#261811] text-[#FAF7F2] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[0.6rem]">
                              {m.papel}
                            </span>
                          )}
                          {m.criancaAte6Anos && <span className="text-amber-800 font-medium">Criança (≤ 6 anos)</span>}
                          {m.confirmadoRsvp === true && (
                            <span className="text-emerald-800 font-semibold">✓ Confirmou</span>
                          )}
                          {m.confirmadoRsvp === false && <span className="text-rose-800 font-bold">Recusou</span>}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[0.65rem] font-sans tracking-wider uppercase px-2.5 py-1 rounded-full font-semibold border ${
                        m.presenteCheckin
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      {m.presenteCheckin ? "Já no Local" : "Aguardando"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={salvandoCheckin}
                onClick={() => salvarPresenca(false)}
                className="px-6 py-3 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[8px] cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                Salvar Seleção Individual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
