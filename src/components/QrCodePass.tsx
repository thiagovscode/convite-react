import React, { useEffect, useState, useRef } from "react";
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
  const passCardRef = useRef<HTMLDivElement>(null);

  // Código de acesso limpo e exclusivo (ex: TN-4827 ou código do convite)
  const validationCode = tokenOuId 
    ? tokenOuId.toUpperCase() 
    : `TN-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const qrPayload = JSON.stringify({
    tipo: "INGRESSO_CASAMENTO_TAINARA_THIAGO",
    codigo: validationCode,
    titular: convidado,
    total: totalPessoas,
    adultos: adultos,
    criancas: criancasAte6Anos,
    membros: membrosConfirmados || [convidado],
    dataEvento: "2027-01-24",
    local: "Espaço Balboa, Mairiporã - SP"
  });

  useEffect(() => {
    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 1.5,
      color: {
        dark: "#261811",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Erro ao gerar QR Code:", err));
  }, [qrPayload]);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `passe-casamento-${convidado.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="py-1 space-y-5 animate-fade-in text-center max-w-[390px] mx-auto w-full">
      {/* Peça de Papelaria Digital — Passe de Casamento Editorial */}
      <div 
        ref={passCardRef}
        className="bg-[#FAF7F2] border border-[#D8CDC0] px-6 py-7 sm:px-7 sm:py-8 text-center text-[#261811] shadow-[0_12px_32px_-12px_rgba(22,14,10,0.12)] rounded-[4px] space-y-5 relative"
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
            24 de Janeiro de 2027 · 16h30 · Espaço Balboa
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
        </div>

        {/* QR Code Container com Respiro Generoso */}
        <div className="pt-1 pb-1 flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-white border border-[#D8CDC0] rounded-[3px] shadow-[0_2px_8px_-3px_rgba(22,14,10,0.06)]">
            {qrDataUrl ? (
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
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-[390px] mx-auto pt-1">
        <button
          type="button"
          onClick={handleDownloadQr}
          className="min-h-[42px] py-2 px-5 bg-[#261811] text-[#FAF7F2] font-sans text-[0.72rem] tracking-[0.16em] uppercase hover:bg-[#1C110B] transition-colors rounded-[3px] cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Salvar Imagem
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[42px] py-2 px-6 border border-[#D8CDC0] bg-transparent text-[#543D30] font-sans text-[0.72rem] tracking-[0.16em] uppercase hover:bg-[#EAE0D5]/50 transition-colors rounded-[3px] cursor-pointer"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}
