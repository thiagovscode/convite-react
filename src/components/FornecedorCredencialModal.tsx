import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import type { FornecedorCasamento, MembroEquipeFornecedor } from "../services/convites";
import {
  buscarFornecedorPublico,
  emitirCredencialQrFornecedorBackend,
} from "../services/convites";

export default function FornecedorCredencialModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [fornecedor, setFornecedor] = useState<FornecedorCasamento | null>(null);
  const [erro, setErro] = useState("");

  // Membro selecionado para gerar o QR code individual
  const [membroSelecionado, setMembroSelecionado] = useState<MembroEquipeFornecedor | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [gerandoQr, setGerandoQr] = useState(false);
  const [erroQr, setErroQr] = useState("");
  const [salvoFeedback, setSalvoFeedback] = useState(false);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Detecta se a URL contém ?fornecedor= ou #fornecedor=
  useEffect(() => {
    const checarUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const paramFornecedor = params.get("fornecedor");
      const hash = window.location.hash;
      let idEncontrado: string | null = null;

      if (paramFornecedor && paramFornecedor.trim()) {
        idEncontrado = paramFornecedor.trim();
      } else if (hash.includes("fornecedor=")) {
        const match = hash.match(/fornecedor=([^&]+)/);
        if (match && match[1]) idEncontrado = decodeURIComponent(match[1]);
      }

      if (idEncontrado) {
        setFornecedorId(idEncontrado);
        setIsOpen(true);
        document.body.style.overflow = "hidden";
      }
    };

    checarUrl();
    window.addEventListener("popstate", checarUrl);
    window.addEventListener("hashchange", checarUrl);
    return () => {
      window.removeEventListener("popstate", checarUrl);
      window.removeEventListener("hashchange", checarUrl);
    };
  }, []);

  // Busca dados do fornecedor quando o id é detectado
  useEffect(() => {
    if (!fornecedorId) return;

    let ativo = true;
    setLoading(true);
    setErro("");

    buscarFornecedorPublico(fornecedorId).then((data) => {
      if (!ativo) return;
      setLoading(false);
      if (data) {
        setFornecedor(data);
        // Se a equipe tiver apenas 1 membro, já o seleciona por padrão
        if (data.equipe && data.equipe.length === 1) {
          setMembroSelecionado(data.equipe[0]);
        }
      } else {
        setErro("Credencial de fornecedor não localizada ou link expirado.");
      }
    });

    return () => {
      ativo = false;
    };
  }, [fornecedorId]);

  // O backend emite o token; o navegador gera a imagem do QR Code.
  useEffect(() => {
    if (!fornecedor?.id || !membroSelecionado) {
      setQrDataUrl("");
      setErroQr("");
      setGerandoQr(false);
      return;
    }

    let ativo = true;
    setQrDataUrl("");
    setErroQr("");
    setGerandoQr(true);

    emitirCredencialQrFornecedorBackend(fornecedor.id, membroSelecionado.id)
      .then(async (result) => {
        if (!ativo) return;
        if (!result.success || !result.tokenQr) {
          setErroQr(result.message || "Não foi possível emitir a credencial.");
          return;
        }

        try {
          const url = await QRCode.toDataURL(result.tokenQr, {
            width: 320,
            margin: 1.5,
            color: { dark: "#261811", light: "#FFFFFF" },
            errorCorrectionLevel: "H",
          });
          if (ativo) setQrDataUrl(url);
        } catch {
          if (ativo) setErroQr("Não foi possível gerar a imagem do QR Code neste dispositivo.");
        }
      })
      .catch(() => {
        if (ativo) setErroQr("Não foi possível gerar a credencial. Tente novamente.");
      })
      .finally(() => {
        if (ativo) setGerandoQr(false);
      });

    return () => {
      ativo = false;
    };
  }, [fornecedor, membroSelecionado]);

  const handleClose = () => {
    setIsOpen(false);
    document.body.style.overflow = "";

    const url = new URL(window.location.href);
    url.searchParams.delete("fornecedor");
    if (url.hash.includes("fornecedor")) {
      url.hash = "";
    }
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !membroSelecionado) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `credencial-${membroSelecionado.nome.toLowerCase().replace(/\s+/g, "-")}-casamento.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FAF7F2] border border-[#E8DFD5] rounded-[16px] max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-auto">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#8C7A6B] hover:text-[#261811] text-xl font-bold p-1 cursor-pointer"
          aria-label="Fechar"
        >
          ✕
        </button>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#261811] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-serif italic text-xs text-[#8C7A6B]">Carregando credencial de acesso...</p>
          </div>
        ) : erro ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm font-serif text-rose-800">{erro}</p>
            <button
              type="button"
              onClick={handleClose}
              className="bg-[#261811] text-white text-xs px-4 py-2 rounded font-sans uppercase tracking-wider"
            >
              Voltar ao Início
            </button>
          </div>
        ) : fornecedor ? (
          <>
            {/* Header da Empresa */}
            <div className="text-center space-y-1 border-b border-[#E8DFD5] pb-4">
              <span className="text-[0.62rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold block">
                Credencial Oficial de Staff &amp; Fornecedor
              </span>
              <h2 className="font-serif text-2xl text-[#261811] font-light">{fornecedor.empresa}</h2>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="text-[0.64rem] font-sans px-2.5 py-0.5 rounded-full bg-white border border-[#E8DFD5] text-[#543D30]">
                  {fornecedor.categoria}
                </span>
                <span className="text-[0.64rem] font-sans px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                  Chegada: {fornecedor.horarioPrevisto || "A combinar"}
                </span>
              </div>
            </div>

            {/* Informações do Evento e Instruções */}
            <div className="bg-white border border-[#E8DFD5] rounded-[10px] p-3.5 space-y-1.5 text-xs font-sans text-[#543D30]">
              <p><strong>Local:</strong> Espaço Balboa · Mairiporã - SP</p>
              <p><strong>Data:</strong> 24 de Janeiro de 2027</p>
              {fornecedor.instrucaoChegada && (
                <p className="italic text-[0.72rem] text-[#8C7A6B] pt-1 border-t border-[#F0EAE0]">
                  <strong>Instrução de Acesso:</strong> {fornecedor.instrucaoChegada}
                </p>
              )}
            </div>

            {/* Seleção do Membro */}
            <div className="space-y-2">
              <label className="text-[0.68rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold block">
                Selecione seu nome para gerar o seu QR Code:
              </label>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {fornecedor.equipe && fornecedor.equipe.length > 0 ? (
                  fornecedor.equipe.map((m) => {
                    const isSelected = membroSelecionado?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMembroSelecionado(m)}
                        className={`text-xs font-sans px-3 py-1.5 rounded-[6px] border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#261811] text-white border-[#261811] font-semibold shadow-xs"
                            : "bg-white text-[#261811] border-[#D8CDC0] hover:border-[#261811]"
                        }`}
                      >
                        {m.nome} {m.funcao ? `(${m.funcao})` : ""}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs italic text-[#8C7A6B] font-serif">
                    Nenhum membro cadastrado ainda.
                  </span>
                )}
              </div>
            </div>

            {membroSelecionado && (gerandoQr || erroQr) && (
              <div className="rounded-[12px] border border-[#E8DFD5] bg-white px-4 py-8 text-center" role={erroQr ? "alert" : undefined}>
                {erroQr ? (
                  <>
                    <p className="text-sm text-rose-800">{erroQr}</p>
                    <button
                      type="button"
                      onClick={() => setMembroSelecionado({ ...membroSelecionado })}
                      className="mt-3 text-xs font-semibold text-[#261811] underline"
                    >
                      Tentar novamente
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#261811] border-t-transparent" />
                    <p className="text-sm text-[#6B5A4D]">Preparando credencial e QR Code...</p>
                  </>
                )}
              </div>
            )}

            {/* Passe / QR Code Individual */}
            {membroSelecionado && qrDataUrl && (
              <div className="bg-white border-2 border-[#261811] rounded-[14px] p-4 text-center space-y-3 shadow-md animate-fade-in">
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#261811]">
                    {membroSelecionado.nome}
                  </h3>
                  <span className="text-[0.66rem] font-sans uppercase tracking-wider text-[#8C7A6B] block">
                    {membroSelecionado.funcao || "Equipe"} · {fornecedor.empresa}
                  </span>
                  {membroSelecionado.permaneceAteFim && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-full text-[0.62rem] font-sans font-semibold uppercase tracking-wider">
                      <span>Permanece até o fim</span>
                    </div>
                  )}
                </div>

                <div className="p-2 bg-white rounded-[10px] inline-block shadow-xs border border-[#E8DFD5]">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code de ${membroSelecionado.nome}`}
                    className="w-48 h-48 mx-auto object-contain"
                  />
                </div>

                <p className="text-[0.68rem] font-sans text-[#8C7A6B]">
                  Apresente este QR Code na portaria de serviços do salão para liberar sua entrada.
                </p>

                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="w-full bg-[#261811] text-[#FAF7F2] text-xs font-sans uppercase tracking-wider font-semibold py-2.5 rounded-[6px] hover:bg-[#3D271D] transition-colors cursor-pointer"
                  >
                    {salvoFeedback ? "Imagem Baixada com Sucesso" : "Baixar Meu QR Code"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
