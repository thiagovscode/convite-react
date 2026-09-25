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

  // Gera o payload do QR Code para o Check-in na portaria
  const validationCode = tokenOuId || `TT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
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
      width: 320,
      margin: 1.5,
      color: {
        dark: "#261811",
        light: "#FAF7F0",
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
    a.download = `passe-casamento-${convidado.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="py-2 space-y-4 animate-fade-in text-center">
      {/* Cartão Oficial de Entrada com Estética Editorial */}
      <div 
        ref={passCardRef}
        className="bg-[#FAF7F0] border-2 border-[#967D67] p-5 sm:p-6 text-center text-[#261811] shadow-lg max-w-[420px] mx-auto rounded-sm space-y-3 relative overflow-hidden"
      >
        <div className="border-b border-[#967D67] pb-3 space-y-1">
          <span className="font-display text-[0.65rem] tracking-[0.3em] uppercase text-[#543D30] font-bold block">
            Passe Oficial de Entrada
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-[#261811] font-semibold">
            Tainara &amp; Thiago
          </h3>
          <p className="font-serif italic text-xs text-[#543D30]">
            24 de Janeiro de 2027 • 16h30 • Espaço Balboa
          </p>
        </div>

        {/* Informações da Família */}
        <div className="text-left font-serif text-xs bg-[#EAE0D2] p-3 border border-[#967D67] space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[#543D30] uppercase font-display text-[0.65rem] font-bold">Convidado(a):</span>
            <strong className="text-[#261811] text-sm">{convidado}</strong>
          </div>
          <div className="flex justify-between items-baseline pt-1 border-t border-[#967D67]/40">
            <span className="text-[#543D30] uppercase font-display text-[0.65rem] font-bold">Pessoas Confirmadas:</span>
            <span className="font-bold text-[#261811]">{totalPessoas} ({adultos} pagantes, {criancasAte6Anos} menores de 7)</span>
          </div>

          {membrosConfirmados && membrosConfirmados.length > 0 && (
            <div className="pt-1.5 border-t border-[#967D67]/40">
              <span className="text-[#543D30] font-display text-[0.62rem] uppercase font-bold block mb-0.5">
                Nomes Autorizados na Recepção:
              </span>
              <p className="text-[0.78rem] text-[#261811] leading-tight">
                {membrosConfirmados.join(" • ")}
              </p>
            </div>
          )}
        </div>

        {/* QR Code Container */}
        <div className="py-2 flex flex-col items-center justify-center">
          {qrDataUrl ? (
            <div className="p-2.5 bg-white border-2 border-[#967D67] shadow-sm rounded-sm">
              <img 
                src={qrDataUrl} 
                alt={`QR Code de entrada para ${convidado}`} 
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-[#EAE0D2] text-xs font-serif text-[#543D30]">
              Gerando QR Code...
            </div>
          )}
          <span className="font-mono text-[0.72rem] tracking-widest text-[#543D30] mt-2 block font-bold">
            CÓDIGO: {validationCode}
          </span>
        </div>

        <p className="font-serif italic text-[0.82rem] text-[#543D30] leading-snug border-t border-[#967D67] pt-2.5">
          Apresente este QR Code na portaria no dia do evento (pode ser print da tela ou imagem salva).
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-[420px] mx-auto pt-1">
        <button
          type="button"
          onClick={handleDownloadQr}
          className="min-h-[44px] py-2.5 px-4 bg-[#261811] text-[#F8F4EC] font-display text-[0.72rem] tracking-[0.2em] uppercase font-bold hover:bg-[#160E0A] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          Salvar Imagem do QR Code
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] py-2.5 px-5 border-2 border-[#967D67] bg-[#EAE0D2] text-[#261811] font-display text-[0.72rem] tracking-[0.2em] uppercase font-bold hover:bg-[#D5C6B5] transition-colors"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}
