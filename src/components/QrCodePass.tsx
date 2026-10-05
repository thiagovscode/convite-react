import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";

interface QrCodePassProps {
  convidado: string;
  telefone?: string;
  totalPessoas: number;
  adultos: number;
  criancasAte6Anos: number;
  membrosConfirmados?: string[];
  tokenOuId?: string;
  onClose: () => void;
}

export default function QrCodePass({
  convidado,
  totalPessoas,
  adultos,
  criancasAte6Anos,
  membrosConfirmados,
  tokenOuId,
  onClose,
}: QrCodePassProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const passCardRef = useRef<HTMLDivElement>(null);

  // Código de acesso limpo e estável (ex: TN-4827 ou código do convite)
  const validationCode = useMemo(() => {
    return tokenOuId && tokenOuId.trim()
      ? tokenOuId.trim().toUpperCase()
      : `TN-${Math.floor(1000 + Math.random() * 9000)}`;
  }, [tokenOuId]);

  const membrosLista = useMemo(() => {
    if (membrosConfirmados && membrosConfirmados.length > 0) {
      return membrosConfirmados;
    }
    return [convidado];
  }, [membrosConfirmados, convidado]);

  const qrPayload = useMemo(() => {
    return JSON.stringify({
      tipo: "INGRESSO_CASAMENTO_TAINARA_THIAGO",
      codigo: validationCode,
      convidado: convidado,
      total: totalPessoas,
      adultos: adultos,
      criancas: criancasAte6Anos,
      membros: membrosLista,
      dataEvento: "2027-01-24",
      local: "Espaço Balboa, Mairiporã - SP"
    });
  }, [validationCode, convidado, totalPessoas, adultos, criancasAte6Anos, membrosLista]);

  useEffect(() => {
    // 1. Gera SVG nativo imediato (100% infalível, dispensa canvas e não perde nitidez)
    QRCode.toString(qrPayload, {
      type: "svg",
      margin: 1.5,
      color: {
        dark: "#261811",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((svg) => setQrSvg(svg))
      .catch((err) => console.error("Erro ao gerar SVG do QR Code:", err));

    // 2. Gera DataURL para compartilhamento e download na galeria de fotos
    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 1.5,
      color: {
        dark: "#261811",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Erro ao gerar PNG do QR Code:", err));
  }, [qrPayload]);

  const [salvando, setSalvando] = useState(false);
  const [salvoFeedback, setSalvoFeedback] = useState(false);

  const handleDownloadQr = async () => {
    if (!qrDataUrl) return;
    setSalvando(true);

    const fileName = `passe-casamento-${convidado.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;

    try {
      // Converte dataURL para Blob/File permitindo salvar direto no app Fotos do iPhone via Web Share
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Passe de Entrada - Tainara & Thiago",
          text: `Passe de entrada de ${convidado} para o casamento de Tainara & Thiago.`
        });
        setSalvoFeedback(true);
        setTimeout(() => setSalvoFeedback(false), 4000);
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setSalvando(false);
        return;
      }
    } finally {
      setSalvando(false);
    }

    // Fallback: download com Blob URL nativo (salva na galeria/fotos no Android e arquivos no desktop)
    const resBlob = await fetch(qrDataUrl);
    const blob = await resBlob.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 4000);
  };

  return (
    <div className="py-1 space-y-4 animate-fade-in text-center max-w-[390px] mx-auto w-full">
      {/* Peça de Papelaria Digital — Passe de Casamento Editorial */}
      <div 
        ref={passCardRef}
        className="bg-[#FAF7F2] border border-[#D8CDC0] px-4 py-6 sm:px-7 sm:py-8 text-center text-[#261811] shadow-[0_12px_32px_-12px_rgba(22,14,10,0.12)] rounded-[8px] space-y-4 relative w-full"
      >
        {/* Cabeçalho / Título Editorial */}
        <div className="space-y-1.5 border-b border-[#EAE0D5] pb-4">
          <span className="font-sans text-[0.58rem] tracking-[0.28em] uppercase text-[#8C7A6B] font-medium block">
            PASSE DE ENTRADA
          </span>
          <h3 className="font-serif text-2xl sm:text-[1.75rem] text-[#261811] font-light tracking-wide leading-tight">
            Tainara &amp; Thiago
          </h3>
          <p className="font-serif italic text-[0.8rem] text-[#8C7A6B] tracking-wide pt-0.5">
            24 de Janeiro de 2027 · 15h30 · Espaço Balboa
          </p>
        </div>

        {/* Informações Essenciais do Convidado (Sem listas individuais nem dados financeiros) */}
        <div className="bg-[#F7F2EC] border border-[#E8DEC8] p-4 rounded-[3px] text-left space-y-2.5">
          <div>
            <span className="font-sans text-[0.58rem] tracking-[0.2em] uppercase text-[#8C7A6B] font-medium block">
              CONVIDADO(A)
            </span>
            <p className="font-serif text-[1.05rem] text-[#261811] font-normal leading-snug mt-0.5">
              {convidado}
            </p>
          </div>

          <div className="pt-2 border-t border-[#E8DEC8]/80 flex justify-between items-baseline">
            <span className="font-sans text-[0.58rem] tracking-[0.2em] uppercase text-[#8C7A6B] font-medium">
              PRESENÇAS CONFIRMADAS
            </span>
            <span className="font-serif text-[1.1rem] text-[#261811] font-normal">
              {totalPessoas}
            </span>
          </div>

          {membrosLista && membrosLista.length > 0 && (
            <div className="pt-2.5 border-t border-[#E8DEC8]/80 space-y-1">
              <span className="font-sans text-[0.58rem] tracking-[0.2em] uppercase text-[#8C7A6B] font-medium block">
                MEMBROS DO CONVITE
              </span>
              <ul className="text-xs font-serif text-[#261811] space-y-0.5">
                {membrosLista.map((nome, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-[#8C7A6B] text-[0.65rem]">✦</span>
                    <span>{nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* QR Code Container com Respiro Generoso */}
        <div className="pt-1 pb-1 flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-white border border-[#D8CDC0] rounded-[3px] shadow-[0_2px_8px_-3px_rgba(22,14,10,0.06)] flex items-center justify-center">
            {qrSvg ? (
              <div 
                className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt={`QR Code de entrada para ${convidado}`} 
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center bg-[#FAF7F2] text-xs font-serif text-[#8C7A6B]">
                Gerando QR Code…
              </div>
            )}
          </div>

          <span className="font-mono text-[0.68rem] tracking-[0.22em] uppercase text-[#8C7A6B] block">
            CÓDIGO DE ACESSO: <strong className="text-[#261811] font-normal">{validationCode}</strong>
          </span>
        </div>

        {/* Instrução Delicada e Discreta */}
        <p className="font-serif italic text-[0.78rem] text-[#8C7A6B] leading-relaxed border-t border-[#EAE0D5] pt-3 px-2">
          Apresente este QR Code na entrada do evento. Pode ser exibido diretamente pelo celular.
        </p>
      </div>

      {/* Botões de Ação com Estilo Editorial */}
      <div className="space-y-2 max-w-[390px] mx-auto pt-1 w-full">
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center w-full">
          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={salvando}
            className="flex-1 min-h-[44px] py-2.5 px-5 bg-[#261811] text-[#FAF7F2] font-sans text-xs tracking-[0.14em] uppercase hover:bg-[#1C110B] transition-all rounded-[6px] cursor-pointer flex items-center justify-center gap-2 font-semibold shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{salvando ? "Abrindo..." : salvoFeedback ? "Salvo com Sucesso!" : "Salvar na Galeria / Fotos"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] py-2.5 px-6 border border-[#D8CDC0] bg-transparent text-[#543D30] font-sans text-xs tracking-[0.14em] uppercase hover:bg-[#EAE0D5]/50 transition-colors rounded-[6px] cursor-pointer font-medium"
          >
            Concluir
          </button>
        </div>
        <p className="text-[0.7rem] font-serif text-[#8C7A6B] italic leading-snug px-2">
          Dica para iPhone e Android: Toque em <strong>"Salvar na Galeria / Fotos"</strong> e escolha <strong>"Salvar Imagem"</strong> (ou Salvar no Dispositivo) para guardar direto na sua galeria de fotos. Você também pode segurar o dedo sobre a imagem do QR Code.
        </p>
      </div>
    </div>
  );
}
