import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { FornecedorCasamento, MembroEquipeFornecedor } from "../../../services/convites";
import {
  cadastrarFornecedorBackend,
  excluirFornecedorBackend,
  adicionarMembroFornecedorBackend,
  removerMembroFornecedorBackend,
  checkinMembroFornecedorBackend,
} from "../../../services/convites";
import { playCheckinSuccessSound, triggerHaptic } from "../utils/sound";
import type { UserRole } from "../types";

interface FornecedoresTabProps {
  userRole?: UserRole;
  fornecedores: FornecedorCasamento[];
  onFornecedoresChange: React.Dispatch<React.SetStateAction<FornecedorCasamento[]>>;
  onRefreshAuditoria?: () => void;
  onRefreshFornecedores: () => void;
}

const CATEGORIAS_PADRAO = [
  "Música & Cerimônia",
  "Foto & Vídeo",
  "Buffet & Gastronomia",
  "Decoração & Cenografia",
  "Cerimonial & Staff",
  "Bolo & Doces Finos",
  "Cabelo & Maquiagem",
  "Som, Iluminação & DJ",
  "Transporte & Valet",
  "Segurança & Apoio",
  "Outros",
];

export function FornecedoresTab({
  userRole = "admin",
  fornecedores,
  onFornecedoresChange,
  onRefreshAuditoria,
  onRefreshFornecedores,
}: FornecedoresTabProps) {
  const isNoivos = userRole === "admin";

  // Estados de Criação / Edição
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");

  const [novoFornecedor, setNovoFornecedor] = useState({
    empresa: "",
    nome: "",
    categoria: "Foto & Vídeo",
    servico: "",
    telefone: "",
    horarioPrevisto: "14:00",
    instrucaoChegada: "",
    chegadaAntecipada: false,
    membrosEquipe: "", // Texto com nomes separados por vírgula ou linha
  });

  // Estado do Modal de Credencial & QR Code
  const [fornecedorCredencial, setFornecedorCredencial] = useState<FornecedorCasamento | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Estado para adicionar membro rápido inline
  const [fornecedorAdicionandoMembro, setFornecedorAdicionandoMembro] = useState<string | null>(null);
  const [novoMembroNome, setNovoMembroNome] = useState("");
  const [novoMembroFuncao, setNovoMembroFuncao] = useState("");

  // Estado de confirmação de exclusão
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState<FornecedorCasamento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Filtro de busca de fornecedor
  const [busca, setBusca] = useState("");

  // Gera o QR Code dinamicamente ao abrir o modal de credencial
  useEffect(() => {
    if (!fornecedorCredencial) {
      setQrCodeDataUrl("");
      return;
    }

    const payload = JSON.stringify({
      tipo: "CREDENCIAL_FORNECEDOR_CASAMENTO",
      id: fornecedorCredencial.id,
      empresa: fornecedorCredencial.empresa,
      responsavel: fornecedorCredencial.nome,
      categoria: fornecedorCredencial.categoria,
      horarioPrevisto: fornecedorCredencial.horarioPrevisto,
      evento: "Casamento Tainara & Thiago · 24.01.2027",
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: "#261811",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Erro ao gerar QR Code de fornecedor:", err));
  }, [fornecedorCredencial]);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornecedor.empresa.trim()) {
      setErroForm("O nome da empresa é obrigatório.");
      return;
    }

    setSalvando(true);
    setErroForm("");

    // Converte os membros digitados em lista estruturada
    const membrosList: { nome: string; funcao?: string }[] = [];
    if (novoFornecedor.membrosEquipe.trim()) {
      const linhas = novoFornecedor.membrosEquipe
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      linhas.forEach((m) => membrosList.push({ nome: m, funcao: "Equipe" }));
    }

    const payload: Partial<FornecedorCasamento> = {
      empresa: novoFornecedor.empresa.trim(),
      nome: novoFornecedor.nome.trim() || novoFornecedor.empresa.trim(),
      categoria: novoFornecedor.categoria,
      servico: novoFornecedor.servico.trim() || novoFornecedor.categoria,
      telefone: novoFornecedor.telefone.trim(),
      horarioPrevisto: novoFornecedor.horarioPrevisto.trim() || "A definir",
      instrucaoChegada: novoFornecedor.instrucaoChegada.trim(),
      chegadaAntecipada: novoFornecedor.chegadaAntecipada,
      equipe: membrosList.map((m, idx) => ({
        id: `membro-${idx + 1}-${Date.now().toString(36)}`,
        nome: m.nome,
        funcao: m.funcao || "Equipe",
        presente: false,
      })),
    };

    const res = await cadastrarFornecedorBackend(payload);
    setSalvando(false);

    if (res.success) {
      setSucessoMsg(`Fornecedor ${novoFornecedor.empresa} cadastrado com sucesso!`);
      setTimeout(() => setSucessoMsg(""), 4000);
      setModalNovo(false);
      setNovoFornecedor({
        empresa: "",
        nome: "",
        categoria: "Foto & Vídeo",
        servico: "",
        telefone: "",
        horarioPrevisto: "14:00",
        instrucaoChegada: "",
        chegadaAntecipada: false,
        membrosEquipe: "",
      });
      onRefreshFornecedores();
    } else {
      setErroForm(res.message || "Erro ao salvar fornecedor.");
    }
  };

  const handleExcluirFornecedor = async () => {
    if (!fornecedorParaExcluir?.id) return;
    setExcluindo(true);
    const res = await excluirFornecedorBackend(fornecedorParaExcluir.id);
    setExcluindo(false);
    if (res.success) {
      setFornecedorParaExcluir(null);
      onRefreshFornecedores();
    }
  };

  const handleAdicionarMembro = async (fornecedorId: string) => {
    if (!novoMembroNome.trim()) return;
    const res = await adicionarMembroFornecedorBackend(fornecedorId, {
      nome: novoMembroNome.trim(),
      funcao: novoMembroFuncao.trim() || "Equipe",
    });
    if (res.success && res.fornecedor) {
      onFornecedoresChange((prev) =>
        prev.map((f) => (f.id === fornecedorId ? res.fornecedor! : f))
      );
      setNovoMembroNome("");
      setNovoMembroFuncao("");
      setFornecedorAdicionandoMembro(null);
    }
  };

  const handleRemoverMembro = async (fornecedorId: string, membroId: string) => {
    const res = await removerMembroFornecedorBackend(fornecedorId, membroId);
    if (res.success && res.fornecedor) {
      onFornecedoresChange((prev) =>
        prev.map((f) => (f.id === fornecedorId ? res.fornecedor! : f))
      );
    }
  };

  const handleToggleMembro = async (
    fornecedorId: string,
    membroId: string,
    statusAtual: boolean
  ) => {
    const res = await checkinMembroFornecedorBackend(fornecedorId, membroId, !statusAtual);
    if (res.success && res.fornecedor) {
      playCheckinSuccessSound();
      triggerHaptic();
      onFornecedoresChange((prev) =>
        prev.map((f) => (f.id === fornecedorId ? res.fornecedor! : f))
      );
      onRefreshAuditoria?.();
    }
  };

  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const getLinkFornecedor = (f: FornecedorCasamento) => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/$/, "");
    return `${origin}${path}?fornecedor=${encodeURIComponent(f.id || "")}`;
  };

  const handleCopiarLink = (f: FornecedorCasamento) => {
    const link = getLinkFornecedor(f);
    const msg = `*CREDENCIAL DA EQUIPE · CASAMENTO TAINARA & THIAGO*\nOlá, equipe ${f.empresa}!\nAcessem o link abaixo para visualizar as instruções de chegada e baixar o QR Code individual de cada profissional para a portaria:\n${link}`;
    navigator.clipboard.writeText(msg);
    setCopiadoId(f.id || f.empresa);
    setTimeout(() => setCopiadoId(null), 3000);
  };

  const enviarWhatsAppCredencial = (f: FornecedorCasamento) => {
    const link = getLinkFornecedor(f);
    const tel = (f.telefone || "").replace(/\D/g, "");
    const msg = `*CREDENCIAL DA EQUIPE · CASAMENTO TAINARA & THIAGO*\nOlá, ${f.nome}!\n\nConfirmamos a participação da equipe *${f.empresa}* (${f.categoria}) no nosso casamento.\n\n⏰ Horário Previsto: ${f.horarioPrevisto || "A combinar"}\n📍 Local: Espaço Balboa · Mairiporã - SP\n\n👉 Compartilhe o link abaixo com sua equipe. Cada membro poderá selecionar o próprio nome e baixar o QR Code individual para apresentar na portaria:\n${link}\n\nObrigado por fazer parte desse dia tão especial!`;
    window.open(`https://wa.me/${tel ? `55${tel}` : ""}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const fornecedoresFiltrados = fornecedores.filter((f) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      f.empresa?.toLowerCase().includes(q) ||
      f.nome?.toLowerCase().includes(q) ||
      f.categoria?.toLowerCase().includes(q) ||
      f.telefone?.toLowerCase().includes(q) ||
      f.equipe?.some((m) => m.nome.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
            {isNoivos ? "Gestão de Equipes & Contratos" : "Portaria & Chegada"}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
            Fornecedores &amp; Profissionais
          </h1>
        </div>

        {isNoivos && (
          <button
            type="button"
            onClick={() => setModalNovo(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#261811] text-[#FAF7F2] text-xs font-sans tracking-wider uppercase px-4 py-2.5 rounded-[6px] font-semibold cursor-pointer hover:bg-[#3D271D] transition-colors shadow-xs"
          >
            <span>+</span> Novo Fornecedor
          </button>
        )}
      </div>

      {sucessoMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-[8px] text-xs font-sans flex items-center justify-between">
          <span>✓ {sucessoMsg}</span>
          <button
            type="button"
            onClick={() => setSucessoMsg("")}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Busca */}
      <div className="bg-white border border-[#E8DFD5] rounded-[10px] p-3 shadow-xs">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por empresa, responsável, categoria ou profissional da equipe..."
          className="w-full bg-[#FAF7F2] border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
        />
      </div>

      {/* Lista de Fornecedores */}
      <div className="space-y-4">
        {fornecedoresFiltrados.map((f) => {
          const presentesNaEquipe = f.equipe?.filter((m) => m.presente).length || 0;
          const totalEquipe = f.equipe?.length || 0;

          return (
            <div
              key={f.id || f.empresa}
              className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 shadow-[0_4px_25px_-6px_rgba(38,24,17,0.05)] space-y-4"
            >
              {/* Topo do Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EAE0] pb-3.5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-lg font-medium text-[#261811]">{f.empresa}</h2>
                    <span className="text-[0.62rem] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-[#FAF7F2] text-[#8C7A6B] border border-[#E8DFD5]">
                      {f.categoria || "Geral"}
                    </span>
                    {f.chegadaAntecipada && (
                      <span className="text-[0.62rem] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                        ⚡ Chegada Antecipada
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-sans text-[#6B5A4D]">
                    Resp: <strong className="text-[#261811]">{f.nome}</strong> · Horário:{" "}
                    <strong className="text-[#261811]">{f.horarioPrevisto || "A definir"}</strong>
                    {f.telefone && ` · 📞 ${f.telefone}`}
                  </p>
                  {f.instrucaoChegada && (
                    <p className="text-xs italic text-[#8C7A6B] font-serif bg-[#FAF7F2] px-2.5 py-1 rounded border-l-2 border-[#8C7A6B]">
                      "{f.instrucaoChegada}"
                    </p>
                  )}
                </div>

                {/* Ações do Card */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopiarLink(f)}
                    className={`text-xs font-sans px-3 py-1.5 rounded-[6px] border font-semibold cursor-pointer transition-colors ${
                      copiadoId === (f.id || f.empresa)
                        ? "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold"
                        : "bg-[#FAF7F2] border-[#D8CDC0] text-[#261811] hover:border-[#261811]"
                    }`}
                    title="Copiar link para a equipe acessar e baixar seus próprios QR Codes"
                  >
                    {copiadoId === (f.id || f.empresa) ? "✓ Link Copiado!" : "🔗 Copiar Link da Equipe"}
                  </button>

                  {f.telefone && (
                    <button
                      type="button"
                      onClick={() => enviarWhatsAppCredencial(f)}
                      className="text-xs font-sans px-3 py-1.5 rounded-[6px] border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-semibold cursor-pointer"
                      title="Enviar credencial e detalhes no WhatsApp do fornecedor"
                    >
                      💬 WhatsApp
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFornecedorCredencial(f)}
                    className="text-xs font-sans px-3 py-1.5 rounded-[6px] border border-[#D8CDC0] bg-[#FAF7F2] text-[#261811] hover:border-[#261811] font-semibold cursor-pointer"
                    title="Exibir QR Code e credencial de acesso"
                  >
                    🏷️ QR Code
                  </button>

                  {isNoivos && f.id && (
                    <button
                      type="button"
                      onClick={() => setFornecedorParaExcluir(f)}
                      className="text-xs font-sans px-2.5 py-1.5 rounded-[6px] border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                      title="Excluir fornecedor"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Equipe / Profissionais */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.66rem] font-sans uppercase tracking-wider text-[#8C7A6B] font-semibold">
                    Equipe Credenciada ({presentesNaEquipe}/{totalEquipe} presentes)
                  </span>
                  {isNoivos && (
                    <button
                      type="button"
                      onClick={() => {
                        setFornecedorAdicionandoMembro(
                          fornecedorAdicionandoMembro === f.id ? null : f.id || null
                        );
                        setNovoMembroNome("");
                        setNovoMembroFuncao("");
                      }}
                      className="text-[0.68rem] font-sans text-[#261811] hover:underline cursor-pointer font-semibold"
                    >
                      + Adicionar Membro
                    </button>
                  )}
                </div>

                {/* Formulário inline para adicionar membro */}
                {isNoivos && fornecedorAdicionandoMembro === f.id && (
                  <div className="flex flex-wrap items-center gap-2 p-2.5 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[8px]">
                    <input
                      type="text"
                      placeholder="Nome do profissional"
                      value={novoMembroNome}
                      onChange={(e) => setNovoMembroNome(e.target.value)}
                      className="bg-white border border-[#D8CDC0] text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-[#261811] flex-1 min-w-[140px]"
                    />
                    <input
                      type="text"
                      placeholder="Função (ex: Assistente, Iluminação)"
                      value={novoMembroFuncao}
                      onChange={(e) => setNovoMembroFuncao(e.target.value)}
                      className="bg-white border border-[#D8CDC0] text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-[#261811] w-44"
                    />
                    <button
                      type="button"
                      onClick={() => f.id && handleAdicionarMembro(f.id)}
                      className="bg-[#261811] text-white text-xs px-3 py-1.5 rounded font-semibold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFornecedorAdicionandoMembro(null)}
                      className="text-xs text-[#6B5A4D] px-2 py-1 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Lista de Membros da Equipe */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {f.equipe && f.equipe.length > 0 ? (
                    f.equipe.map((m: MembroEquipeFornecedor) => (
                      <div
                        key={m.id}
                        className={`inline-flex items-center gap-1.5 text-[0.68rem] font-sans px-2.5 py-1 rounded border transition-colors ${
                          m.presente
                            ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-semibold"
                            : "bg-[#FAF7F2] border-[#D8CDC0] text-[#543D30]"
                        }`}
                      >
                        {isNoivos ? (
                          <span
                            className="select-none"
                            title={m.presente ? "Presente (Check-in via Recepção)" : "Aguardando entrada"}
                          >
                            {m.presente ? "✓ " : "○ "}
                            {m.nome} {m.funcao ? `(${m.funcao})` : ""}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (f.id) handleToggleMembro(f.id, m.id, !!m.presente);
                            }}
                            className="cursor-pointer hover:opacity-80"
                            title="Clique para alternar presença na portaria"
                          >
                            {m.presente ? "✓ " : "○ "}
                            {m.nome} {m.funcao ? `(${m.funcao})` : ""}
                          </button>
                        )}

                        {isNoivos && f.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoverMembro(f.id!, m.id)}
                            className="text-[#8C7A6B] hover:text-rose-700 font-bold ml-1 cursor-pointer"
                            title="Remover este membro"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs italic text-[#8C7A6B] font-serif">
                      Nenhum profissional listado para esta equipe.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!fornecedoresFiltrados.length && (
          <div className="py-12 text-center text-xs font-serif italic text-[#8C7A6B] bg-white border border-[#E8DFD5] rounded-[12px]">
            Nenhum fornecedor encontrado com os termos pesquisados.
          </div>
        )}
      </div>

      {/* Modal: Novo Fornecedor */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-[#261811] rounded-[14px] p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8DFD5] pb-3">
              <div>
                <p className="text-[0.62rem] font-sans tracking-[0.2em] uppercase text-[#8C7A6B] font-semibold">
                  Novo Contrato
                </p>
                <h3 className="font-serif text-xl text-[#261811]">Cadastrar Fornecedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovo(false)}
                className="text-[#8C7A6B] hover:text-[#261811] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {erroForm && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-sans">
                {erroForm}
              </div>
            )}

            <form onSubmit={handleCadastrar} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                    Nome da Empresa / Profissional *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lumière Fotografia"
                    value={novoFornecedor.empresa}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, empresa: e.target.value })}
                    className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                    Categoria
                  </label>
                  <select
                    value={novoFornecedor.categoria}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, categoria: e.target.value })}
                    className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                  >
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                    Responsável Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Oliveira"
                    value={novoFornecedor.nome}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })}
                    className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={novoFornecedor.telefone}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })}
                    className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                    Horário Previsto
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 13h30"
                    value={novoFornecedor.horarioPrevisto}
                    onChange={(e) => setNovoFornecedor({ ...novoFornecedor, horarioPrevisto: e.target.value })}
                    className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                  Membros da Equipe (Opcional - separe por vírgula ou nova linha)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Carlos (Fotógrafo), Mariana (Assistente), Roberto (Iluminação)"
                  value={novoFornecedor.membrosEquipe}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, membrosEquipe: e.target.value })}
                  className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[0.66rem] font-sans uppercase tracking-wider text-[#6B5A4D] font-semibold">
                  Instruções de Acesso / Chegada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrar pela lateral de serviços para montagem de instrumentos"
                  value={novoFornecedor.instrucaoChegada}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, instrucaoChegada: e.target.value })}
                  className="w-full bg-white border border-[#D8CDC0] p-2 text-xs rounded focus:outline-none focus:border-[#261811]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chegadaAntecipada"
                  checked={novoFornecedor.chegadaAntecipada}
                  onChange={(e) => setNovoFornecedor({ ...novoFornecedor, chegadaAntecipada: e.target.checked })}
                  className="accent-[#261811] cursor-pointer"
                />
                <label htmlFor="chegadaAntecipada" className="text-xs font-sans text-[#261811] cursor-pointer">
                  Requer entrada antecipada no salão
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-4 py-2 text-xs text-[#6B5A4D] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-[#261811] text-[#FAF7F2] text-xs font-sans uppercase tracking-wider font-semibold px-5 py-2 rounded-[6px] cursor-pointer hover:bg-[#3D271D]"
                >
                  {salvando ? "Salvando..." : "Salvar Fornecedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Credencial Digital & QR Code */}
      {fornecedorCredencial && (
        <div className="fixed inset-0 z-[100000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-[#261811] rounded-[16px] p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-[#E8DFD5] pb-2">
              <span className="text-[0.62rem] font-sans tracking-[0.2em] uppercase text-[#8C7A6B] font-semibold">
                Credencial de Acesso
              </span>
              <button
                type="button"
                onClick={() => setFornecedorCredencial(null)}
                className="text-[#8C7A6B] hover:text-[#261811] font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-xl text-[#261811]">{fornecedorCredencial.empresa}</h3>
              <p className="text-xs font-sans text-[#8C7A6B]">
                {fornecedorCredencial.categoria} · {fornecedorCredencial.nome}
              </p>
            </div>

            <div className="p-3 bg-white border border-[#E8DFD5] rounded-[12px] inline-block shadow-xs">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code de Acesso do Fornecedor"
                  className="w-56 h-56 mx-auto object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs font-sans text-[#8C7A6B]">
                  Gerando QR Code...
                </div>
              )}
            </div>

            <div className="text-xs font-sans text-[#6B5A4D] space-y-0.5">
              <p>Horário Previsto: <strong>{fornecedorCredencial.horarioPrevisto || "A definir"}</strong></p>
              {fornecedorCredencial.instrucaoChegada && (
                <p className="italic text-[0.72rem] text-[#8C7A6B]">
                  "{fornecedorCredencial.instrucaoChegada}"
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => enviarWhatsAppCredencial(fornecedorCredencial)}
                className="w-full bg-emerald-700 text-white text-xs font-sans uppercase tracking-wider font-semibold py-2.5 rounded-[6px] hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                💬 Enviar no WhatsApp do Fornecedor
              </button>

              <button
                type="button"
                onClick={() => setFornecedorCredencial(null)}
                className="w-full text-xs font-sans text-[#8C7A6B] hover:text-[#261811] py-1 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Fornecedor */}
      {fornecedorParaExcluir && (
        <div className="fixed inset-0 z-[100000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-[#261811] rounded-[14px] p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-lg text-[#261811]">Excluir Fornecedor</h3>
            <p className="text-xs font-sans text-[#6B5A4D]">
              Tem certeza que deseja remover o fornecedor{" "}
              <strong className="text-[#261811]">{fornecedorParaExcluir.empresa}</strong> e toda a sua equipe credenciada?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DFD5]">
              <button
                type="button"
                onClick={() => setFornecedorParaExcluir(null)}
                className="px-3 py-1.5 text-xs text-[#6B5A4D] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={handleExcluirFornecedor}
                className="bg-rose-700 text-white text-xs px-4 py-1.5 rounded font-semibold cursor-pointer hover:bg-rose-800"
              >
                {excluindo ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
