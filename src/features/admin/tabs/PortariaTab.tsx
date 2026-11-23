import React, { useRef, useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { ConvitePreDefinido } from "../../../services/convites";
import {
  registrarCheckinBackend,
  getFilaOfflineCheckins,
  sincronizarFilaOffline,
  buscarRelatorioAuditoriaBackend,
  checkinMembroFornecedorBackend,
  validarCredencialQrBackend,
  registrarPresencaQrBackend,
} from "../../../services/convites";
import { playCheckinSuccessSound, triggerHaptic } from "../utils/sound";

interface PortariaTabProps {
  onRefreshData?: () => void;
}

export function PortariaTab({ onRefreshData }: PortariaTabProps) {
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoInputDebounced, setCodigoInputDebounced] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [conviteAtual, setConviteAtual] = useState<ConvitePreDefinido | null>(null);
  const [resultadosBusca, setResultadosBusca] = useState<ConvitePreDefinido[]>([]);
  const [selecaoPresenca, setSelecaoPresenca] = useState<Record<string, boolean>>({});
  const [salvandoCheckin, setSalvandoCheckin] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroCheckin, setErroCheckin] = useState("");
  const [filaOffline, setFilaOffline] = useState(0);
  const [sincronizandoOffline, setSincronizandoOffline] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const ultimoCodigoProcessadoRef = useRef("");
  const processarCodigoRef = useRef<(termo: string) => Promise<void>>(async () => {});

  const atualizarContadorOffline = () => {
    setFilaOffline(getFilaOfflineCheckins().length);
  };

  useEffect(() => {
    atualizarContadorOffline();
    // Pré-carrega silenciosamente a lista completa no cache local para busca offline imediata se o 4G/Wi-Fi oscilar
    void buscarRelatorioAuditoriaBackend();

    const tentarSincronizarFila = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (getFilaOfflineCheckins().length === 0) return;
      setSincronizandoOffline(true);
      await sincronizarFilaOffline();
      setSincronizandoOffline(false);
      atualizarContadorOffline();
      onRefreshData?.();
    };

    const handleOnline = () => {
      void tentarSincronizarFila();
      void buscarRelatorioAuditoriaBackend();
    };

    const intervalOffline = window.setInterval(() => {
      void tentarSincronizarFila();
    }, 30000);

    window.addEventListener("online", handleOnline);
    return () => {
      window.clearInterval(intervalOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!codigoInput.trim()) {
      ultimoCodigoProcessadoRef.current = "";
      setCodigoInputDebounced("");
      return;
    }

    const timeoutId = window.setTimeout(() => setCodigoInputDebounced(codigoInput.trim()), 450);
    return () => window.clearTimeout(timeoutId);
  }, [codigoInput]);

  useEffect(() => {
    if (!codigoInputDebounced || codigoInputDebounced.length < 2 || loadingBusca || cameraAberta) {
      return;
    }

    if (ultimoCodigoProcessadoRef.current === codigoInputDebounced) return;
    ultimoCodigoProcessadoRef.current = codigoInputDebounced;
    void processarCodigoRef.current(codigoInputDebounced);
  }, [codigoInputDebounced, loadingBusca, cameraAberta]);

  // Câmera & Leitor
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

  const formatarHoraPortaria = (dataIso?: string) => {
    if (!dataIso) return "";
    try {
      const match = dataIso.match(/[T ](\d{2}):(\d{2})/);
      if (match && !dataIso.endsWith("Z")) {
        return `${match[1]}:${match[2]}`;
      }
      const d = new Date(dataIso);
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch {
      return "";
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
      // Se já está marcado como presente, mantém marcado.
      // Se não, sugere marcado apenas se confirmou RSVP
      sel[m.id] = m.presenteCheckin !== undefined ? Boolean(m.presenteCheckin) : m.confirmadoRsvp === true;
    });
    setSelecaoPresenca(sel);

    if (todosJaEntraram) {
      const primeiroCheckin = membrosPresentes.find((m) => m.dataHoraCheckin)?.dataHoraCheckin;
      const horarioFormatado = formatarHoraPortaria(primeiroCheckin);
      setErroCheckin(
        `Atenção: Todos os ${membros.length} membros deste convite já registraram entrada${
          horarioFormatado ? ` às ${horarioFormatado}` : ""
        }. Você ainda pode ajustar a presença caso necessário.`
      );
    } else if (membrosPresentes.length > 0) {
      setMensagemSucesso(
        `Convite localizado. ${membrosPresentes.length} de ${membros.length} membros já entraram. Marque os demais que estão chegando agora e confirme!`
      );
    } else {
      setMensagemSucesso("Convite localizado com sucesso. Selecione os membros presentes e confirme.");
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
        if (parsed?.tokenQr) {
          const validacao = await validarCredencialQrBackend(String(parsed.tokenQr));
          setLoadingBusca(false);
          pararCamera();

          if (!validacao.success || !validacao.valida) {
            setErroCheckin(validacao.message || "Credencial QR inválida para o evento atual.");
            return;
          }

          const presenca = await registrarPresencaQrBackend(
            String(parsed.tokenQr),
            "Portaria",
            "Registro via leitura de QR"
          );

          if (presenca.success) {
            playCheckinSuccessSound();
            triggerHaptic();
            setConviteAtual(null);
            setMensagemSucesso(
              `Credencial validada com sucesso: ${presenca.nomePessoa || validacao.nomePessoa || "Participante"} (${presenca.tipo || validacao.tipo || "Participante"})`
            );
            onRefreshData?.();
          } else {
            setErroCheckin(presenca.message || "Não foi possível registrar a presença via QR.");
          }
          return;
        }

        if (parsed.tipo === "CREDENCIAL_STAFF_CASAMENTO") {
          if (typeof parsed.fornecedorId !== "string" || typeof parsed.membroId !== "string") {
            setLoadingBusca(false);
            pararCamera();
            setErroCheckin("A credencial não contém os identificadores necessários. Solicite uma nova credencial.");
            return;
          }

          const res = await checkinMembroFornecedorBackend(parsed.fornecedorId, parsed.membroId, true);
          setLoadingBusca(false);
          pararCamera();
          if (res.success) {
            playCheckinSuccessSound();
            triggerHaptic();
            setConviteAtual(null);
            const fornecedor = res.fornecedor;
            const membro = fornecedor?.equipe?.find((item) => item.id === parsed.membroId);
            const ficaAteFim = Boolean(membro?.permaneceAteFim);
            const tagFim = ficaAteFim ? " [Permanece até o fim]" : "";
            const nomePessoa = membro?.nome || "Profissional credenciado";
            const funcao = membro?.funcao || "Equipe";
            const empresa = fornecedor?.empresa ? ` · ${fornecedor.empresa}` : "";
            setMensagemSucesso(
              `Entrada de Staff Confirmada: ${nomePessoa} (${funcao})${empresa}${tagFim}`
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
          if (Array.isArray(parsed.membros) && parsed.membros.length > 0 && typeof fId === "string") {
            const membrosConfirmados: string[] = [];
            let empresa = "";

            for (const membroCredencial of parsed.membros) {
              if (typeof membroCredencial?.id !== "string") continue;

              const res = await checkinMembroFornecedorBackend(fId, membroCredencial.id, true);
              if (!res.success) {
                setErroCheckin(
                  `Não foi possível concluir o check-in da equipe. ${res.message}`
                );
                return;
              }

              const fornecedor = res.fornecedor;
              const membroConfirmado = fornecedor?.equipe?.find(
                (item) => item.id === membroCredencial.id
              );
              if (membroConfirmado) {
                membrosConfirmados.push(membroConfirmado.nome);
              }
              if (fornecedor?.empresa) empresa = fornecedor.empresa;
            }

            if (membrosConfirmados.length === 0) {
              setErroCheckin("O servidor não retornou os membros confirmados desta equipe.");
              return;
            }

            playCheckinSuccessSound();
            triggerHaptic();
            setMensagemSucesso(
              `Entrada de Equipe Confirmada: ${empresa || "empresa credenciada"} (${membrosConfirmados.length} profissionais)`
            );
            onRefreshData?.();
          } else {
            setMensagemSucesso(
              "Credencial da empresa detectada. Utilize a aba Fornecedores para gerenciar os membros."
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

    if (termo.length > 8 && !termo.includes(" ")) {
      const validacaoQr = await validarCredencialQrBackend(termo);
      if (validacaoQr.success && validacaoQr.valida) {
        const presenca = await registrarPresencaQrBackend(termo, "Portaria", "Registro via leitura de QR");
        setLoadingBusca(false);
        pararCamera();
        if (presenca.success) {
          playCheckinSuccessSound();
          triggerHaptic();
          setConviteAtual(null);
          setMensagemSucesso(
            `Credencial validada pelo backend: ${presenca.nomePessoa || validacaoQr.nomePessoa || "Participante"} (${presenca.tipo || validacaoQr.tipo || "Participante"})`
          );
          onRefreshData?.();
          return;
        }
        setErroCheckin(presenca.message || "Não foi possível confirmar a presença pela credencial.");
        return;
      }
    }

    try {
      const { buscarConvitePorCodigo, buscarConvitesPorTermoBackend } = await import(
        "../../../services/convites"
      );

      if (isQrCodeJson || (!codigoLimpo.includes(" ") && codigoLimpo.length <= 30)) {
        const c = await buscarConvitePorCodigo(codigoLimpo);
        if (c) {
          setLoadingBusca(false);
          selecionarConvite(c);
          return;
        }
      }

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
  processarCodigoRef.current = processarCodigo;

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
          ? `ENTRADA CONFIRMADA · Todos os ${presentesQtd} membros presentes!`
          : `ENTRADA ATUALIZADA · ${presentesQtd} de ${totalQtd} membros confirmados no local.`
      );

      if (res.convite) {
        setConviteAtual(res.convite);
        const novaSel: Record<string, boolean> = {};
        res.convite.membros?.forEach((m: any) => {
          novaSel[m.id] = Boolean(m.presenteCheckin);
        });
        setSelecaoPresenca(novaSel);
      } else {
        const novaSel: Record<string, boolean> = {};
        presencas.forEach((p) => {
          novaSel[p.membroId] = p.presente;
        });
        setSelecaoPresenca(novaSel);
      }
      onRefreshData?.();
    } else {
      setErroCheckin(res.message || "Erro ao registrar check-in.");
    }
  };

  const totalSelecionadosAtualmente = conviteAtual?.membros
    ? conviteAtual.membros.filter((m) => !!selecaoPresenca[m.id]).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E8DFD5] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#6B5A4D] font-semibold mb-1">
            Portaria &amp; Acolhimento
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
            Controle de Entrada dos Convidados
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-sans text-[#543D30] bg-white px-3 py-1.5 rounded-full border border-[#E8DFD5] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          Leitor QR Code &amp; Busca Nominal Ativos
        </span>
      </div>

      {filaOffline > 0 && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-300 rounded-[10px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 font-sans shadow-xs"
        >
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
                setMensagemSucesso(`${resultado.sincronizados} check-in(s) sincronizado(s) com sucesso com o servidor!`);
              }
            }}
            className="px-3.5 py-1.5 bg-amber-900 text-white rounded-[8px] font-semibold text-[0.7rem] uppercase tracking-wider hover:bg-amber-950 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {sincronizandoOffline ? "Sincronizando..." : "Sincronizar Agora"}
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2.5 shrink-0">
            <button
              type="button"
              onClick={cameraAberta ? pararCamera : iniciarCamera}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[10px] cursor-pointer min-h-[48px] transition-all shadow-xs ${
                cameraAberta
                  ? "bg-rose-800 hover:bg-rose-900 text-white"
                  : "bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{cameraAberta ? "Fechar Câmera" : "Escanear QR Code"}</span>
            </button>

            <label className="inline-flex items-center justify-center gap-2 bg-[#FAF7F2] hover:bg-[#EFE8DC] border border-[#D8CDC0] text-[#543D30] px-4 py-3 font-sans text-xs tracking-[0.12em] uppercase font-semibold rounded-[10px] cursor-pointer min-h-[48px] shrink-0 transition-colors">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Foto do QR Code</span>
              <span className="sm:hidden">Foto QR</span>
              <input type="file" accept="image/*" onChange={handleEscanearArquivo} className="hidden" />
            </label>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ultimoCodigoProcessadoRef.current = codigoInput.trim();
              processarCodigo(codigoInput);
            }}
            className="flex-1 flex gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputBuscaRef}
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                placeholder="Buscar convidado por nome, sobrenome ou código..."
                aria-label="Buscar convidado por nome, sobrenome ou código"
                className="w-full h-full min-h-[48px] bg-[#FAF7F2] focus:bg-white border border-[#D8CDC0] pl-4 pr-9 py-3 text-[#261811] font-sans text-sm focus:outline-none focus:border-[#261811] rounded-[10px] transition-colors"
              />
              {codigoInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCodigoInput("");
                    inputBuscaRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B5A4D] hover:text-[#261811] text-xs font-bold p-1.5 cursor-pointer"
                  aria-label="Limpar campo de busca"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loadingBusca}
              className="bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] px-5 py-3 font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[10px] cursor-pointer disabled:opacity-50 min-h-[48px] shrink-0 shadow-xs"
            >
              {loadingBusca ? "Buscando..." : "Localizar"}
            </button>
          </form>
        </div>

        {cameraAberta && (
          <div className="pt-2">
            <div
              id="qr-reader-portaria-feature-container"
              className="max-w-[340px] mx-auto overflow-hidden rounded-[12px] border-2 border-[#261811]"
            />
            {cameraIniciando && (
              <p className="text-center text-xs font-serif italic text-[#6B5A4D] mt-2">
                Iniciando câmera do dispositivo...
              </p>
            )}
          </div>
        )}

        {cameraErro && (
          <div role="alert" className="p-3.5 bg-amber-50 border border-amber-300 rounded-[8px] text-xs text-amber-950 font-sans">
            {cameraErro}
          </div>
        )}

        {erroCheckin && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-300 rounded-[8px] text-xs text-rose-950 font-sans font-medium">
            {erroCheckin}
          </div>
        )}

        {mensagemSucesso && (
          <div
            role="status"
            className="p-4 bg-emerald-50 border border-emerald-300 rounded-[10px] text-xs sm:text-sm font-sans text-emerald-950 font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
          >
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
              className="self-start sm:self-auto text-xs uppercase bg-emerald-800 hover:bg-emerald-950 text-white px-3.5 py-1.5 rounded-[6px] tracking-wider cursor-pointer shrink-0 transition-colors"
            >
              Próximo Convidado →
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE RESULTADOS QUANDO HOUVER MÚLTIPLOS CONVITES ENCONTRADOS */}
      {resultadosBusca.length > 0 && !conviteAtual && (
        <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#EAE0D5] pb-3">
            <span className="font-sans text-[0.68rem] tracking-[0.18em] uppercase text-[#543D30] font-semibold block">
              Resultados da Busca ({resultadosBusca.length})
            </span>
            <span className="text-xs font-serif italic text-[#6B5A4D]">
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
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF7F2]/70 p-3 rounded-[10px] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <strong className="font-serif text-lg text-[#261811]">{c.familia}</strong>
                      <span className="font-mono text-xs bg-[#FAF7F2] border border-[#D8CDC0] px-2 py-0.5 rounded text-[#261811] font-semibold">
                        #{c.codigo}
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[#543D30] leading-relaxed">
                      <span className="text-[#6B5A4D] font-medium">Membros: </span>
                      {c.membros?.map((m, idx) => (
                        <span key={m.id || idx}>
                          {idx > 0 && ", "}
                          <strong className="text-[#261811] font-medium">{m.nome}</strong>
                          {m.papel && m.papel !== "Convidado" && (
                            <span className="text-[#6B5A4D] font-semibold"> [{m.papel}]</span>
                          )}
                          {m.presenteCheckin && (
                            <span className="text-emerald-800 font-semibold"> (✓ No Salão)</span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selecionarConvite(c)}
                    className={`px-4 py-2.5 text-xs font-sans tracking-wider uppercase font-semibold rounded-[8px] cursor-pointer whitespace-nowrap min-h-[40px] ${
                      todosEntraram
                        ? "bg-stone-100 text-stone-700 border border-stone-300 hover:bg-stone-200"
                        : "bg-[#261811] hover:bg-[#1A100B] text-white shadow-xs"
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
        <div className="bg-white border-2 border-[#261811] rounded-[14px] p-5 sm:p-8 shadow-[0_8px_30px_-8px_rgba(38,24,17,0.12)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE0D5] pb-4">
            <div>
              <span className="font-sans text-[0.66rem] tracking-[0.2em] uppercase text-[#6B5A4D] font-semibold block">
                Ficha de Entrada Oficial
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
                {conviteAtual.familia}
              </h2>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="font-mono text-sm font-bold bg-[#FAF7F2] px-3 py-1.5 rounded-[8px] border border-[#D8CDC0]">
                #{conviteAtual.codigo}
              </span>
              <button
                type="button"
                onClick={() => setConviteAtual(null)}
                className="text-xs font-sans text-[#6B5A4D] hover:text-[#261811] px-2.5 py-1.5 rounded-[8px] border border-transparent hover:border-[#D8CDC0] cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>

          {/* BOTÃO MASTER DE 1 TOQUE: CONFIRMAR ENTRADA DE TODOS */}
          <div className="p-4 sm:p-5 bg-emerald-50/60 border border-emerald-200 rounded-[12px] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <strong className="font-serif text-lg sm:text-xl text-[#261811] block">
                Entrada Rápida da Família Completa
              </strong>
              <p className="font-sans text-xs text-[#543D30] mt-0.5">
                Confirme a entrada de todos os {conviteAtual.membros?.length || 0} membros deste convite com 1 toque:
              </p>
            </div>

            <button
              type="button"
              disabled={salvandoCheckin}
              onClick={() => salvarPresenca(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#1E6B37] hover:bg-[#16532A] text-white font-sans text-xs tracking-[0.16em] uppercase font-semibold rounded-[10px] shadow-sm cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2 shrink-0"
            >
              <span>✓</span>
              <span>{salvandoCheckin ? "Confirmando..." : "Confirmar Entrada de Todos"}</span>
            </button>
          </div>

          {/* Lista Nominal de Membros */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-[#543D30]">
              <span className="font-semibold uppercase tracking-wider">
                Seleção Individual ({totalSelecionadosAtualmente} de {conviteAtual.membros?.length || 0} marcados):
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const s: Record<string, boolean> = {};
                    conviteAtual.membros?.forEach((m) => (s[m.id] = true));
                    setSelecaoPresenca(s);
                  }}
                  className="font-semibold underline text-[#261811] cursor-pointer"
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
                  className="underline text-[#6B5A4D] hover:text-[#261811] cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#EAE0D5] border border-[#E8DFD5] rounded-[10px] overflow-hidden bg-white">
              {conviteAtual.membros?.map((m) => {
                const isSel = !!selecaoPresenca[m.id];
                return (
                  <div
                    key={m.id}
                    role="checkbox"
                    aria-checked={isSel}
                    tabIndex={0}
                    onClick={() => setSelecaoPresenca((p) => ({ ...p, [m.id]: !p[m.id] }))}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setSelecaoPresenca((p) => ({ ...p, [m.id]: !p[m.id] }));
                      }
                    }}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                      isSel ? "bg-emerald-50/60" : "hover:bg-[#FAF7F2]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="checkbox"
                        checked={isSel}
                        tabIndex={-1}
                        onChange={() => {}}
                        className="w-5 h-5 accent-[#261811] cursor-pointer rounded"
                      />
                      <div>
                        <span className="font-serif text-base sm:text-lg text-[#261811] font-medium block leading-snug">
                          {m.nome}
                        </span>
                        <div className="flex items-center gap-2 text-[0.7rem] font-sans text-[#6B5A4D] flex-wrap mt-0.5">
                          {m.papel && m.papel !== "Convidado" && m.papel !== "Convidado comum" && (
                            <span className="bg-[#261811] text-[#FAF7F2] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[0.6rem]">
                              {m.papel}
                            </span>
                          )}
                          {m.criancaAte6Anos && <span className="text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">Criança (≤ 6 anos)</span>}
                          {m.confirmadoRsvp === true && (
                            <span className="text-emerald-800 font-semibold">✓ Confirmou RSVP</span>
                          )}
                          {m.confirmadoRsvp === false && <span className="text-rose-800 font-bold">✕ Recusou RSVP</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[0.66rem] font-sans tracking-wider uppercase px-3 py-1 rounded-full font-semibold border ${
                          m.presenteCheckin
                            ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                            : "bg-stone-100 text-stone-700 border-stone-300"
                        }`}
                      >
                        {m.presenteCheckin ? "✓ Já no Local" : "Aguardando"}
                      </span>
                      {m.presenteCheckin && m.dataHoraCheckin && (
                        <span className="text-[0.65rem] font-sans text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {formatarHoraPortaria(m.dataHoraCheckin)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <span className="text-xs font-serif italic text-[#6B5A4D]">
                Marque ou desmarque individualmente quem está entrando agora e confirme abaixo.
              </span>
              <button
                type="button"
                disabled={salvandoCheckin}
                onClick={() => salvarPresenca(false)}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#261811] hover:bg-[#1A100B] text-[#FAF7F2] font-sans text-xs tracking-[0.14em] uppercase font-semibold rounded-[10px] cursor-pointer disabled:opacity-50 min-h-[48px] shadow-xs"
              >
                {salvandoCheckin
                  ? "Registrando..."
                  : `Confirmar Membros Selecionados (${totalSelecionadosAtualmente})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
