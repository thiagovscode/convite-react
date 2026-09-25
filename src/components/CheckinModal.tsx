import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  buscarConvitePorCodigo,
  loginRecepcaoBackend,
  registrarCheckinBackend,
  buscarRelatorioAuditoriaBackend,
  buscarParticipantesCerimoniaBackend,
  checkinParticipanteBackend,
  buscarFornecedoresBackend,
  checkinMembroFornecedorBackend,
  adicionarMembroFornecedorBackend,
  cadastrarFornecedorBackend
} from "../services/convites";
import type {
  ConvitePreDefinido,
  MembroAutorizado,
  RelatorioAuditoria,
  ParticipanteCerimonia,
  FornecedorCasamento,
  MembroEquipeFornecedor
} from "../services/convites";

const RECEPCAO_AUTH_KEY = "CASAMENTO_RECEPCAO_AUTENTICADA";

export default function CheckinModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [tab, setTab] = useState<"leitor" | "participantes" | "fornecedores" | "auditoria">("leitor");

  // Login State
  const [userInput, setUserInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Leitor de Câmera / QR Code State
  const [cameraAberta, setCameraAberta] = useState(false);
  const [cameraIniciando, setCameraIniciando] = useState(false);
  const [cameraErro, setCameraErro] = useState("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const inputBuscaRef = useRef<HTMLInputElement | null>(null);

  // Busca e Checkin State
  const [codigoInput, setCodigoInput] = useState("");
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [conviteAtual, setConviteAtual] = useState<ConvitePreDefinido | null>(null);
  
  // Seleção individual de presença para a família atual
  const [selecaoPresenca, setSelecaoPresenca] = useState<Record<string, boolean>>({});
  const [salvandoCheckin, setSalvandoCheckin] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroCheckin, setErroCheckin] = useState("");

  // Relatório de Auditoria para o Buffet
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
  const [copiadoWhatsApp, setCopiadoWhatsApp] = useState(false);

  // Participantes da Cerimônia (Cortejo)
  const [participantes, setParticipantes] = useState<ParticipanteCerimonia[]>([]);
  const [carregandoParticipantes, setCarregandoParticipantes] = useState(false);
  const [filtroParticipantes, setFiltroParticipantes] = useState<string>("TODOS");
  const [familiasExpandidas, setFamiliasExpandidas] = useState<Record<string, boolean>>({});

  const formatarPapel = (papel: string, vinculo?: string): string => {
    const p = papel.trim();
    if (/noiv[oa]/i.test(p)) return p.toUpperCase();
    if (vinculo && !p.toLowerCase().includes(vinculo.toLowerCase())) {
      return `${p.toUpperCase()} (${vinculo.toUpperCase()})`;
    }
    return p.toUpperCase();
  };

  // Helper de extração de idade e classificação visual imediata (< 1s)
  const extrairIdade = (nome: string, idade?: number | string): string | null => {
    if (idade !== undefined && idade !== null && String(idade).trim() !== "") {
      return `${idade} anos`;
    }
    const m = nome.match(/\b(\d+)\s*anos?\b/i) || nome.match(/\((\d+)\)/);
    if (m) return `${m[1]} anos`;
    return null;
  };

  const verificarSeCrianca = (
    nome: string,
    papel?: string,
    criancaAte6Anos?: boolean,
    idade?: number | string
  ): boolean => {
    if (criancaAte6Anos === true) return true;
    if (idade !== undefined && Number(idade) <= 12) return true;
    const pLower = (papel || "").toLowerCase();
    if (["pajem", "daminha", "florista", "porta-aliança", "porta aliança", "porta alianças"].some(k => pLower.includes(k))) {
      return true;
    }
    const match = nome.match(/\b(\d+)\s*anos?\b/i) || nome.match(/\((\d+)\)/);
    if (match && Number(match[1]) <= 12) return true;
    return false;
  };

  const renderClassificacao = (
    nome: string,
    papel?: string,
    criancaAte6Anos?: boolean,
    idade?: number | string
  ) => {
    const isCrianca = verificarSeCrianca(nome, papel, criancaAte6Anos, idade);
    if (isCrianca) {
      const idadeStr = extrairIdade(nome, idade) || (criancaAte6Anos ? "0-6 anos" : "");
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[0.62rem] font-display uppercase tracking-wider font-bold bg-[#EAE0D2] text-[#543D30] border border-[#D5C6B5] rounded-[3px] select-none">
          CRIANÇA {idadeStr ? `· ${idadeStr}` : ""}
        </span>
      );
    }

    const isFeminino = papel && /madrinha|mãe|noiva|irmã|avó/i.test(papel);
    return (
      <span className="text-[0.65rem] font-display uppercase tracking-wider font-semibold text-[#8C7A6B]">
        {isFeminino ? "ADULTA" : "ADULTO"}
      </span>
    );
  };

  const formatarComposicao = (adultos: number, criancas: number) => {
    const total = adultos + criancas;
    const convTexto = total === 1 ? "1 convidado" : `${total} convidados`;
    const adTexto = adultos === 1 ? "1 adulto" : `${adultos} adultos`;
    const crTexto = criancas === 1 ? "1 criança" : `${criancas} crianças`;

    if (criancas === 0) {
      return `${convTexto} · ${adTexto}`;
    }
    if (adultos === 0) {
      return `${convTexto} · ${crTexto}`;
    }
    return `${convTexto} · ${adTexto} · ${crTexto}`;
  };

  const toggleFamiliaExpandida = (codigo: string) => {
    setFamiliasExpandidas(prev => ({
      ...prev,
      [codigo]: !prev[codigo]
    }));
  };

  // Fornecedores & Staff
  const [fornecedores, setFornecedores] = useState<FornecedorCasamento[]>([]);
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(false);
  const [filtroCategoriaFornecedor, setFiltroCategoriaFornecedor] = useState<string>("TODAS");
  const [modalNovoFornecedor, setModalNovoFornecedor] = useState(false);
  const [membroExtraNome, setMembroExtraNome] = useState<Record<string, string>>({});
  const [membroExtraFuncao, setMembroExtraFuncao] = useState<Record<string, string>>({});
  const [expandindoAddMembro, setExpandindoAddMembro] = useState<Record<string, boolean>>({});
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: "",
    categoria: "Música & Som",
    servico: "Orquestra",
    empresa: "",
    telefone: "",
    horarioPrevisto: "14:00",
    instrucaoChegada: "",
    chegadaAntecipada: false
  });

  const filtrarFornecedorPorCategoria = (f: FornecedorCasamento, categoriaFiltro: string): boolean => {
    if (categoriaFiltro === "TODAS" || !categoriaFiltro) return true;
    const catF = (f.categoria || "").toLowerCase();
    const servF = (f.servico || "").toLowerCase();
    const alvo = categoriaFiltro.toLowerCase();

    if (alvo.includes("foto")) return catF.includes("foto") || servF.includes("foto") || servF.includes("film");
    if (alvo.includes("música") || alvo.includes("musica")) return catF.includes("músic") || catF.includes("music") || servF.includes("som") || servF.includes("banda") || servF.includes("orquestra") || servF.includes("dj");
    if (alvo.includes("cerimônia") || alvo.includes("cerimonia")) return catF.includes("cerim") || servF.includes("cerim") || catF.includes("assessoria") || catF.includes("staff");
    if (alvo.includes("decoração") || alvo.includes("decoracao")) return catF.includes("decor") || servF.includes("decor") || catF.includes("flor");
    if (alvo.includes("buffet")) return catF.includes("buffet") || catF.includes("gastro") || servF.includes("buffet") || servF.includes("bar");
    if (alvo === "outros") {
      const principais = ["foto", "film", "músic", "music", "som", "banda", "orquestra", "dj", "cerim", "assessoria", "decor", "flor", "buffet", "gastro", "bar"];
      return !principais.some(k => catF.includes(k) || servF.includes(k));
    }
    return catF.includes(alvo) || servF.includes(alvo);
  };

  const carregarTodosDados = () => {
    carregarAuditoria();
    carregarParticipantes();
    carregarFornecedores();
  };

  useEffect(() => {
    const authSalva = localStorage.getItem(RECEPCAO_AUTH_KEY);
    if (authSalva === "true") {
      setIsAutenticado(true);
      carregarTodosDados();
    }

    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const isParam = params.get("checkin") === "true" ||
        params.get("recepcao") === "true" ||
        params.get("portaria") === "true";
      const isHash = window.location.hash.includes("checkin") ||
        window.location.hash.includes("recepcao") ||
        window.location.hash.includes("portaria");

      if (isParam || isHash) {
        setIsOpen(true);
        document.body.style.overflow = "hidden";
      }
    };

    const handleOpenRecepcaoEvent = () => {
      setIsOpen(true);
      document.body.style.overflow = "hidden";
    };

    checkUrl();
    window.addEventListener("popstate", checkUrl);
    window.addEventListener("open-recepcao-modal", handleOpenRecepcaoEvent);
    window.addEventListener("open-checkin-modal", handleOpenRecepcaoEvent);

    return () => {
      window.removeEventListener("popstate", checkUrl);
      window.removeEventListener("open-recepcao-modal", handleOpenRecepcaoEvent);
      window.removeEventListener("open-checkin-modal", handleOpenRecepcaoEvent);
    };
  }, []);

  const close = () => {
    pararLeitorCamera();
    setIsOpen(false);
    document.body.style.overflow = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("checkin");
    url.searchParams.delete("recepcao");
    url.searchParams.delete("portaria");
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

  const carregarParticipantes = async () => {
    setCarregandoParticipantes(true);
    const data = await buscarParticipantesCerimoniaBackend();
    if (data && data.participantes) {
      setParticipantes(data.participantes);
    }
    setCarregandoParticipantes(false);
  };

  const toggleCheckinParticipante = async (p: ParticipanteCerimonia) => {
    if (!p.id) return;
    const res = await checkinParticipanteBackend(p.id, !p.presenteCheckin);
    if (res.success && res.participante) {
      setParticipantes((prev: ParticipanteCerimonia[]) => prev.map((item: ParticipanteCerimonia) => item.id === p.id ? res.participante! : item));
    }
  };

  const carregarFornecedores = async () => {
    setCarregandoFornecedores(true);
    const data = await buscarFornecedoresBackend();
    if (data && data.fornecedores) {
      setFornecedores(data.fornecedores);
    }
    setCarregandoFornecedores(false);
  };

  const handleToggleMembroFornecedor = async (fornecedorId: string, membroId: string, statusAtual: boolean) => {
    const res = await checkinMembroFornecedorBackend(fornecedorId, membroId, !statusAtual);
    if (res.success && res.fornecedor) {
      setFornecedores((prev: FornecedorCasamento[]) => prev.map((f: FornecedorCasamento) => f.id === fornecedorId ? res.fornecedor! : f));
    }
  };

  const handleAdicionarMembroExtra = async (fornecedorId: string) => {
    const nome = membroExtraNome[fornecedorId]?.trim();
    if (!nome) return;
    const funcao = membroExtraFuncao[fornecedorId]?.trim() || "Equipe";
    const res = await adicionarMembroFornecedorBackend(fornecedorId, { nome, funcao });
    if (res.success && res.fornecedor) {
      setFornecedores((prev: FornecedorCasamento[]) => prev.map((f: FornecedorCasamento) => f.id === fornecedorId ? res.fornecedor! : f));
      setMembroExtraNome((prev: Record<string, string>) => ({ ...prev, [fornecedorId]: "" }));
      setMembroExtraFuncao((prev: Record<string, string>) => ({ ...prev, [fornecedorId]: "" }));
    }
  };

  const handleCadastrarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornecedor.empresa || !novoFornecedor.nome) return;
    const res = await cadastrarFornecedorBackend(novoFornecedor);
    if (res.success) {
      setModalNovoFornecedor(false);
      setNovoFornecedor({
        nome: "",
        categoria: "Música & Som",
        servico: "Orquestra",
        empresa: "",
        telefone: "",
        horarioPrevisto: "14:00",
        instrucaoChegada: "",
        chegadaAntecipada: false
      });
      carregarFornecedores();
    }
  };

  const gerarTextoFechamentoWhatsApp = () => {
    if (!relatorio) return "";
    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    let texto = `📋 *FECHAMENTO OFICIAL DA PORTARIA - CASAMENTO*\n`;
    texto += `📅 *Horário da Auditoria:* ${dataHoraStr}\n\n`;
    texto += `👥 *CONVIDADOS:*\n`;
    texto += `• Total Previsto: ${relatorio.totalConvidadosPrevistos} pessoas (${relatorio.totalAdultosPrevistos} adultos · ${relatorio.totalCriancasPrevistas} crianças)\n`;
    texto += `• Confirmados no RSVP: ${relatorio.totalConfirmadosRsvp} pessoas (${relatorio.totalAdultosConfirmados} adultos · ${relatorio.totalCriancasConfirmadas} crianças)\n`;
    texto += `• *Presentes Reais no Evento:* ${relatorio.totalPresentesReais} pessoas (${relatorio.totalAdultosPresentes} adultos · ${relatorio.totalCriancasPresentes} crianças)\n`;
    texto += `• Faltantes confirmados (No-Show): ${relatorio.totalAusentesNoShow} pessoas\n\n`;

    const totalStaffPresente = fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0), 0);
    texto += `🎧 *FORNECEDORES & EQUIPES NO LOCAL:*\n`;
    texto += `• Total de profissionais presentes: *${totalStaffPresente} pessoas*\n`;
    fornecedores.forEach((f: FornecedorCasamento) => {
      const presentesForn = f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0;
      const totalForn = f.equipe ? f.equipe.length : 0;
      texto += `  - ${f.empresa} (${f.servico}): ${presentesForn}/${totalForn} no local\n`;
    });

    texto += `\n_Relatório auditado pela equipe de recepção e portaria oficial do evento._`;
    return texto;
  };

  const handleCopiarWhatsApp = () => {
    const texto = gerarTextoFechamentoWhatsApp();
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoWhatsApp(true);
    setTimeout(() => setCopiadoWhatsApp(false), 3000);
  };

  const handleCompartilharWhatsApp = () => {
    const texto = gerarTextoFechamentoWhatsApp();
    if (!texto) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
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
      carregarTodosDados();
    } else {
      setLoginError(res.message || "Usuário ou senha incorretos.");
    }
  };

  const handleLogoutRecepcao = () => {
    localStorage.removeItem(RECEPCAO_AUTH_KEY);
    localStorage.removeItem("CASAMENTO_RECEPCAO_JWT_TOKEN");
    setIsAutenticado(false);
    setConviteAtual(null);
  };

  const pararLeitorCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        // ignora erro ao parar
      }
      html5QrCodeRef.current = null;
    }
    setCameraAberta(false);
    setCameraIniciando(false);
  };

  const iniciarLeitorCamera = async () => {
    setCameraErro("");
    setCameraAberta(true);
    setCameraIniciando(true);
    setErroCheckin("");
    setMensagemSucesso("");

    // Timeout para montagem do elemento no DOM
    setTimeout(async () => {
      try {
        const qrRegionId = "qr-reader-container";
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

        const config = {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          async (decodedText: string) => {
            // Reconhecimento automático do QR Code
            try {
              if (html5QrCode.isScanning) {
                await html5QrCode.stop();
              }
            } catch {}
            html5QrCodeRef.current = null;
            setCameraAberta(false);
            setCameraIniciando(false);
            processarCodigoOuQr(decodedText, "qr");
          },
          () => {
            // Frame ignorado durante leitura contínua
          }
        );
        setCameraIniciando(false);
      } catch (err: any) {
        console.error("Erro ao iniciar câmera:", err);
        setCameraIniciando(false);
        setCameraErro("Não foi possível acessar a câmera do dispositivo. Verifique as permissões de acesso ou utilize a busca manual.");
      }
    }, 150);
  };

  // Buscar convite por código, QR code ou texto
  const processarCodigoOuQr = async (termoBruto: string, origem: "qr" | "manual" = "manual") => {
    const termo = termoBruto.trim();
    if (!termo) return;

    setLoadingBusca(true);
    setErroCheckin("");
    setMensagemSucesso("");

    let codigoLimpo = termo;
    let isIngressoValido = true;

    if (termo.startsWith("{")) {
      try {
        const parsed = JSON.parse(termo);
        if (parsed.tipo && parsed.tipo !== "INGRESSO_CASAMENTO_TAINARA_THIAGO") {
          isIngressoValido = false;
        }
        codigoLimpo = parsed.codigo || parsed.id || termo;
      } catch {
        // payload json inválido
      }
    } else if (termo.includes("http://") || termo.includes("https://")) {
      try {
        const url = new URL(termo);
        const param = url.searchParams.get("convite") || url.searchParams.get("codigo") || url.searchParams.get("p");
        if (param) {
          codigoLimpo = param;
        } else {
          const parts = url.pathname.split("/").filter(Boolean);
          codigoLimpo = parts[parts.length - 1] || termo;
        }
      } catch {}
    }

    if (!isIngressoValido) {
      setLoadingBusca(false);
      setConviteAtual(null);
      setErroCheckin("Este QR Code não corresponde a um convite válido para este evento.");
      return;
    }

    const c = await buscarConvitePorCodigo(codigoLimpo);
    setLoadingBusca(false);

    if (c) {
      setConviteAtual(c);
      pararLeitorCamera();

      // Inicializa presença: se já tinha checkin gravado, usa o status; senão, default = true para quem confirmou RSVP
      const sel: Record<string, boolean> = {};
      c.membros?.forEach(m => {
        if (m.presenteCheckin !== undefined) {
          sel[m.id] = m.presenteCheckin;
        } else {
          sel[m.id] = m.confirmadoRsvp !== false;
        }
      });
      setSelecaoPresenca(sel);
      setMensagemSucesso("Convite localizado.");
    } else {
      setConviteAtual(null);
      if (origem === "qr") {
        setErroCheckin("Convite não encontrado. Confira se o QR Code pertence a este evento ou localize o convite manualmente.");
      } else {
        setErroCheckin("Convite não encontrado. Confira o nome ou código digitado e tente novamente.");
      }
    }
  };

  const alternarPresencaMembro = (id: string) => {
    setSelecaoPresenca((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const marcarTodos = (presente: boolean) => {
    if (!conviteAtual?.membros) return;
    const sel: Record<string, boolean> = {};
    conviteAtual.membros.forEach((m: MembroAutorizado) => {
      sel[m.id] = presente;
    });
    setSelecaoPresenca(sel);
  };

  const handleBuscarManual = (e: React.FormEvent) => {
    e.preventDefault();
    processarCodigoOuQr(codigoInput, "manual");
  };

  const handleVoltarParaLeitor = () => {
    pararLeitorCamera();
    setConviteAtual(null);
    setErroCheckin("");
    setMensagemSucesso("");
    setCodigoInput("");
  };

  const handleNovoEscaneamento = () => {
    setConviteAtual(null);
    setErroCheckin("");
    setMensagemSucesso("");
    setCodigoInput("");
    iniciarLeitorCamera();
  };

  const focarBuscaManual = () => {
    pararLeitorCamera();
    setErroCheckin("");
    setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 100);
  };

  const salvarPresenca = async () => {
    if (!conviteAtual) return;
    setSalvandoCheckin(true);
    setErroCheckin("");
    setMensagemSucesso("");

    const presencas = (conviteAtual.membros || []).map((m: MembroAutorizado) => ({
      membroId: m.id,
      presente: !!selecaoPresenca[m.id]
    }));

    const res = await registrarCheckinBackend(conviteAtual.codigo, presencas, "Portaria");
    setSalvandoCheckin(false);

    if (res.success) {
      const presentesQtd = Object.values(selecaoPresenca).filter(Boolean).length;
      const totalQtd = presencas.length;

      if (presentesQtd === totalQtd && totalQtd > 0) {
        setMensagemSucesso(`ENTRADA CONFIRMADA · ${presentesQtd} de ${totalQtd} presentes`);
      } else {
        setMensagemSucesso(`ENTRADA REGISTRADA · ${presentesQtd} de ${totalQtd} presentes`);
      }

      carregarAuditoria();
      carregarParticipantes();
      carregarFornecedores();

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

      <div className="relative w-full max-w-[760px] my-auto bg-[#F8F4EC] border-2 border-[#967D67] shadow-2xl p-4 sm:p-6 z-10 text-[#261811] max-h-[92dvh] flex flex-col justify-between rounded-sm">
        
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
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTab("leitor")}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "leitor"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Convites / QR
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("participantes"); pararLeitorCamera(); carregarParticipantes(); }}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "participantes"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Participantes ({participantes.filter((p: ParticipanteCerimonia) => p.presenteCheckin).length}/{participantes.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("fornecedores"); pararLeitorCamera(); carregarFornecedores(); }}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "fornecedores"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Fornecedores &amp; Staff ({fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0), 0)}/{fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.length : 0), 0)})
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("auditoria"); pararLeitorCamera(); carregarAuditoria(); }}
                  className={`px-2.5 py-1 font-display text-[0.68rem] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                    tab === "auditoria"
                      ? "bg-[#261811] text-[#F8F4EC]"
                      : "bg-[#EAE0D2] text-[#453126] hover:bg-[#DBCABA]"
                  }`}
                >
                  Buffet &amp; Auditoria
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
                {/* 1. SE NÃO HÁ CONVITE SELECIONADO: FLUXO DE LEITURA (QR COMO PRINCIPAL + BUSCA MANUAL COMO PLANO B) */}
                {!conviteAtual ? (
                  <div className="space-y-4">
                    {/* AÇÃO PRINCIPAL: ESCANEAR QR CODE */}
                    <div className="border border-[#967D67] bg-[#FAF7F0] p-4 sm:p-5 rounded-[4px] shadow-xs text-center space-y-3">
                      <div className="space-y-1">
                        <span className="font-display tracking-[0.22em] uppercase text-[0.65rem] text-[#8C7A6B] font-bold block">
                          Recepção Oficial · Entrada
                        </span>
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#261811]">
                          Escanear Convite
                        </h3>
                        <p className="font-serif italic text-xs sm:text-sm text-[#543D30]">
                          Aponte a câmera para o QR Code do passe de entrada.
                        </p>
                      </div>

                      {/* LEITOR DE CÂMERA ATIVO */}
                      {cameraAberta ? (
                        <div className="flex flex-col items-center justify-center space-y-3 pt-1">
                          <div className="relative w-full max-w-[320px] bg-[#160E0A] rounded-[4px] border-2 border-[#967D67] overflow-hidden shadow-md flex items-center justify-center min-h-[260px]">
                            {cameraIniciando && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#160E0A]/90 text-[#F8F4EC] gap-2 p-4 text-center">
                                <div className="w-7 h-7 border-2 border-[#D5C6B5] border-t-transparent rounded-full animate-spin"></div>
                                <span className="font-serif text-xs text-[#EAE0D2]">Iniciando leitor de câmera...</span>
                              </div>
                            )}
                            <div id="qr-reader-container" className="w-full h-full min-h-[260px]" />
                          </div>

                          <p className="text-[0.72rem] font-serif text-[#543D30] font-medium">
                            Posicione o QR Code dentro da área demarcada.
                          </p>

                          <button
                            type="button"
                            onClick={pararLeitorCamera}
                            className="text-xs font-display uppercase tracking-wider font-semibold text-[#543D30] hover:text-[#261811] underline py-1 cursor-pointer"
                          >
                            ✕ Cancelar / Fechar Câmera
                          </button>
                        </div>
                      ) : (
                        /* BOTÃO PRINCIPAL DE ABERTURA DA CÂMERA */
                        <div className="flex flex-col items-center justify-center py-2 sm:py-3">
                          <button
                            type="button"
                            onClick={iniciarLeitorCamera}
                            className="w-full sm:w-auto min-w-[260px] bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-6 py-3.5 font-display text-xs sm:text-sm tracking-[0.18em] uppercase font-bold transition-all shadow-sm hover:shadow-md rounded-[3px] flex items-center justify-center gap-2.5 cursor-pointer"
                          >
                            <svg className="w-5 h-5 text-[#EAE0D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Escanear QR Code
                          </button>
                        </div>
                      )}

                      {/* Mensagem de Erro de Acesso à Câmera */}
                      {cameraErro && (
                        <div className="p-3 bg-[#FAF0F0] border border-red-300 rounded-[3px] text-xs font-serif text-red-950 text-center">
                          {cameraErro}
                        </div>
                      )}

                      {/* Mensagem de Erro do Check-in / QR Code inválido */}
                      {erroCheckin && (
                        <div className="p-3.5 bg-[#FAF0F0] border border-red-400 rounded-[3px] space-y-2 text-center">
                          <p className="text-xs font-serif text-red-950 font-medium">
                            {erroCheckin}
                          </p>
                          {erroCheckin.includes("manualmente") && (
                            <button
                              type="button"
                              onClick={focarBuscaManual}
                              className="inline-block px-3 py-1 font-display text-[0.65rem] tracking-wider uppercase font-bold bg-[#261811] text-[#F8F4EC] rounded-[2px] hover:bg-[#3D281E] cursor-pointer"
                            >
                              Buscar Manualmente
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* DIVISÓRIA SUTIL: "OU" */}
                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#D5C6B5]" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-[#F8F4EC] px-4 font-display uppercase tracking-widest text-[0.65rem] text-[#8C7A6B] font-bold">
                          ou
                        </span>
                      </div>
                    </div>

                    {/* AÇÃO SECUNDÁRIA: BUSCA MANUAL (PLANO B) */}
                    <div className="border border-[#D5C6B5] bg-[#FAF7F0] p-3.5 rounded-[4px]">
                      <form onSubmit={handleBuscarManual} className="space-y-1.5">
                        <label className="block font-display text-[0.65rem] tracking-wider uppercase text-[#543D30] font-bold">
                          Buscar convite manualmente
                        </label>
                        <div className="flex gap-2">
                          <input
                            ref={inputBuscaRef}
                            type="text"
                            value={codigoInput}
                            onChange={(e) => setCodigoInput(e.target.value)}
                            placeholder="Nome da família, convidado ou código…"
                            className="flex-1 bg-[#FFF] border border-[#967D67] px-3 py-2 text-[#261811] font-serif text-sm focus:outline-none focus:border-[#261811] rounded-[3px]"
                          />
                          <button
                            type="submit"
                            disabled={loadingBusca}
                            className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-4 py-2 font-display text-xs tracking-wider uppercase font-bold transition-colors cursor-pointer disabled:opacity-50 rounded-[3px] shrink-0"
                          >
                            {loadingBusca ? "Buscando..." : "Buscar"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* 2. FICHA DO CONVITE LOCALIZADO (DESIGN EDITORIAL PREMIUM) */
                  <div className="border-2 border-[#967D67] bg-[#FAF7F0] p-4 sm:p-5 space-y-4 rounded-[4px] shadow-xs">
                    {/* Botão de Retorno Rápido / Próximo Convidado */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#D5C6B5]">
                      <button
                        type="button"
                        onClick={handleVoltarParaLeitor}
                        className="inline-flex items-center gap-1.5 text-xs font-display tracking-wider uppercase font-bold text-[#543D30] hover:text-[#261811] cursor-pointer"
                      >
                        <span>←</span>
                        <span>Escanear Outro Convite</span>
                      </button>
                      <span className="font-display text-[0.62rem] tracking-widest uppercase text-[#8C7A6B] font-semibold">
                        Passe #{conviteAtual.codigo}
                      </span>
                    </div>

                    {/* Cabeçalho Editorial do Passe */}
                    <div className="text-center pt-1 pb-1 space-y-1">
                      <span className="font-display tracking-[0.25em] uppercase text-[0.62rem] text-[#8C7A6B] font-bold block">
                        Tainara &amp; Thiago
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#261811]">
                        {conviteAtual.familia}
                      </h3>
                      {/* Composição imediata (< 1 segundo) */}
                      {(() => {
                        const membros = conviteAtual.membros || [];
                        const criancas = membros.filter(m => verificarSeCrianca(m.nome, m.papel, m.criancaAte6Anos, m.idade)).length;
                        const adultos = membros.length - criancas;
                        return (
                          <p className="font-serif text-xs sm:text-sm text-[#543D30] font-medium">
                            {formatarComposicao(adultos, criancas)}
                            {conviteAtual.telefone ? ` · Tel: ${conviteAtual.telefone}` : ""}
                          </p>
                        );
                      })()}
                      <div className="pt-1">
                        <span className={`inline-block px-2.5 py-0.5 text-[0.62rem] font-display uppercase font-bold tracking-wider rounded-[3px] border ${
                          conviteAtual.status === "CONFIRMADO"
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                            : conviteAtual.status === "RECUSADO"
                            ? "bg-red-50 border-red-400 text-red-900"
                            : "bg-amber-50 border-amber-400 text-amber-900"
                        }`}>
                          {conviteAtual.status === "CONFIRMADO"
                            ? "✓ RSVP Confirmado"
                            : conviteAtual.status === "RECUSADO"
                            ? "✕ RSVP Recusado"
                            : "⏳ RSVP Pendente"}
                        </span>
                      </div>
                    </div>

                    {/* Banner de Papel de Honra (Padrinhos / Pais dos Noivos) */}
                    {conviteAtual.papel && (
                      <div className="bg-[#261811] text-[#F8F4EC] p-2.5 rounded-[3px] flex flex-wrap items-center justify-between gap-2 text-xs font-serif shadow-xs">
                        <div>
                          <span className="font-display tracking-widest uppercase text-[0.62rem] text-[#D5C6B5] font-bold block">
                            Convidado de Honra Oficial
                          </span>
                          <strong className="text-sm font-semibold text-[#F8F4EC]">{conviteAtual.papel}</strong>
                        </div>
                        <span className="bg-[#3D281E] border border-[#967D67] px-2 py-0.5 text-[0.65rem] font-display uppercase tracking-wider font-bold text-[#F8F4EC] rounded-[2px]">
                          Cortejo / Honra
                        </span>
                      </div>
                    )}

                    {/* Mensagem de Sucesso com Botão de Escanear Próximo */}
                    {mensagemSucesso && (
                      <div className="p-3 bg-emerald-50 border border-emerald-600 rounded-[3px] flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-bold text-sm">✓</span>
                          <span className="font-display text-xs tracking-wider uppercase font-bold text-emerald-950">
                            {mensagemSucesso}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleNovoEscaneamento}
                          className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1 font-display text-[0.65rem] tracking-widest uppercase font-bold rounded-[2px] transition-colors cursor-pointer"
                        >
                          Escanear Próximo
                        </button>
                      </div>
                    )}

                    {/* Mensagem de Erro se houver */}
                    {erroCheckin && (
                      <div className="p-3 bg-red-100 border border-red-500 rounded-[3px] text-xs text-red-950 font-medium">
                        {erroCheckin}
                      </div>
                    )}

                    {/* Lista Nominal de Membros com hierarquia e clareza visual */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-serif font-bold text-[#543D30]">
                        <span>Membros Autorizados do Convite:</span>
                        <div className="flex gap-2 text-[0.72rem]">
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

                      <div className="divide-y divide-[#EAE0D2] border border-[#967D67] bg-[#FFF] rounded-[3px] overflow-hidden">
                        {conviteAtual.membros?.map((m: MembroAutorizado) => {
                          const isPresente = !!selecaoPresenca[m.id];
                          return (
                            <div
                              key={m.id}
                              onClick={() => alternarPresencaMembro(m.id)}
                              className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                                isPresente ? "bg-emerald-50/70" : "bg-white hover:bg-[#FAF7F0]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isPresente}
                                  onChange={() => alternarPresencaMembro(m.id)}
                                  className="w-4 h-4 accent-[#261811] cursor-pointer"
                                />
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-serif text-sm font-bold text-[#261811]">
                                      {m.nome}
                                    </span>
                                    {renderClassificacao(m.nome, m.papel, m.criancaAte6Anos, m.idade)}
                                    {m.papel && (
                                      <span className="px-1.5 py-0.2 font-display text-[0.6rem] uppercase tracking-wider font-bold bg-[#261811] text-[#F8F4EC] rounded-[2px] border border-[#967D67]">
                                        {m.papel}
                                      </span>
                                    )}
                                    {m.titular && !m.papel && (
                                      <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#8C7A6B]">
                                        (Titular)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {m.confirmadoRsvp !== false ? (
                                      <span className="text-[0.68rem] font-serif text-emerald-900 font-medium">
                                        ✓ RSVP Confirmado
                                      </span>
                                    ) : (
                                      <span className="text-[0.68rem] font-serif text-amber-900 font-medium">
                                        ⏳ RSVP Pendente
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {isPresente ? (
                                  <span className="inline-block px-2.5 py-1 font-display text-[0.65rem] tracking-wider uppercase font-bold bg-[#166534] text-white rounded-[3px] shadow-2xs">
                                    Presente ✓
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-1 font-display text-[0.65rem] tracking-wider uppercase font-semibold bg-[#FAF7F0] text-[#543D30] border border-[#967D67]/40 rounded-[3px]">
                                    Aguardando
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
                      {(() => {
                        const presentesIds = Object.entries(selecaoPresenca).filter(([_, v]) => v).map(([id]) => id);
                        const membrosPresentes = (conviteAtual.membros || []).filter(m => presentesIds.includes(m.id));
                        const crPresentes = membrosPresentes.filter(m => verificarSeCrianca(m.nome, m.papel, m.criancaAte6Anos, m.idade)).length;
                        const adPresentes = membrosPresentes.length - crPresentes;
                        return (
                          <div className="text-xs font-serif text-[#453126]">
                            Entrada calculada:{" "}
                            <strong className="text-[#261811]">
                              {membrosPresentes.length} presentes
                            </strong>{" "}
                            de {conviteAtual.membros?.length || 0} previstos
                            {membrosPresentes.length > 0 && ` (${adPresentes} adultos · ${crPresentes} crianças)`}.
                          </div>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={salvarPresenca}
                        disabled={salvandoCheckin}
                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-5 py-2.5 font-display text-xs tracking-widest uppercase font-bold transition-colors cursor-pointer disabled:opacity-50 rounded-[3px]"
                      >
                        {salvandoCheckin ? "Salvando Entrada..." : "Confirmar Entrada na Festa"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PARTICIPANTES DA CERIMÔNIA (CORTEJO & PARES) */}
            {tab === "participantes" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67] pb-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#261811]">
                      Cortejo &amp; Participantes da Cerimônia
                    </h3>
                    <p className="font-serif italic text-xs text-[#543D30]">
                      Link dos pares pelo convite e conferência nominal na portaria.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.65rem] font-display uppercase tracking-wider text-[#453126] font-bold">
                      Filtrar:
                    </span>
                    <select
                      value={filtroParticipantes}
                      onChange={(e) => setFiltroParticipantes(e.target.value)}
                      className="bg-[#FAF7F0] border border-[#967D67] text-xs font-serif px-2.5 py-1 text-[#261811] focus:outline-none rounded-[2px]"
                    >
                      <option value="TODOS">Todos os Participantes</option>
                      <option value="ADULTOS">Apenas Adultos</option>
                      <option value="CRIANCAS">Apenas Crianças</option>
                      <option value="CONFIRMADOS">RSVP Confirmados</option>
                      <option value="PENDENTES">RSVP Pendentes</option>
                      <option value="PRESENTES">Já Chegaram (Presentes)</option>
                      <option value="AUSENTES">Faltam Chegar</option>
                    </select>
                  </div>
                </div>

                {/* Métricas do Cortejo com Contadores Automáticos e Decomposição */}
                {(() => {
                  const total = participantes.length;
                  const criancasTotal = participantes.filter(p => verificarSeCrianca(p.nome, p.papel, p.criancaAte6Anos, p.idade)).length;
                  const adultosTotal = total - criancasTotal;

                  const presentes = participantes.filter(p => p.presenteCheckin);
                  const chegaramTotal = presentes.length;
                  const criancasChegaram = presentes.filter(p => verificarSeCrianca(p.nome, p.papel, p.criancaAte6Anos, p.idade)).length;
                  const adultosChegaram = chegaramTotal - criancasChegaram;

                  const ausentes = participantes.filter(p => !p.presenteCheckin);
                  const faltamTotal = ausentes.length;
                  const criancasFaltam = ausentes.filter(p => verificarSeCrianca(p.nome, p.papel, p.criancaAte6Anos, p.idade)).length;
                  const adultosFaltam = faltamTotal - criancasFaltam;

                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-[#FAF7F0] border border-[#D5C6B5] rounded-[3px]">
                        <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                          Total no Cortejo
                        </span>
                        <strong className="font-serif text-2xl text-[#261811] block leading-tight">{total}</strong>
                        <span className="block text-[0.62rem] text-[#543D30] font-serif">
                          {adultosTotal} {adultosTotal === 1 ? "adulto" : "adultos"} · {criancasTotal} {criancasTotal === 1 ? "criança" : "crianças"}
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-[3px]">
                        <span className="block font-display text-[0.6rem] uppercase tracking-wider text-emerald-900 font-bold">
                          Já Chegaram
                        </span>
                        <strong className="font-serif text-2xl text-emerald-950 block leading-tight">{chegaramTotal}</strong>
                        <span className="block text-[0.62rem] text-emerald-800 font-serif">
                          {criancasChegaram === 0
                            ? `${adultosChegaram} ${adultosChegaram === 1 ? "adulto" : "adultos"}`
                            : `${adultosChegaram} ad · ${criancasChegaram} cr`}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF7F0] border border-[#D5C6B5] rounded-[3px]">
                        <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                          Faltam Chegar
                        </span>
                        <strong className="font-serif text-2xl text-amber-900 block leading-tight">{faltamTotal}</strong>
                        <span className="block text-[0.62rem] text-[#543D30] font-serif">
                          {adultosFaltam} {adultosFaltam === 1 ? "adulto" : "adultos"} · {criancasFaltam} {criancasFaltam === 1 ? "criança" : "crianças"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Lista de Participantes: Hierarquia Vertical Curta e Clara */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {participantes
                    .filter((p: ParticipanteCerimonia) => {
                      const isCrianca = verificarSeCrianca(p.nome, p.papel, p.criancaAte6Anos, p.idade);
                      const isConfirmado = Boolean(p.confirmadoRsvp);
                      const isPresente = Boolean(p.presenteCheckin);

                      switch (filtroParticipantes) {
                        case "ADULTOS": return !isCrianca;
                        case "CRIANCAS": return isCrianca;
                        case "CONFIRMADOS": return isConfirmado;
                        case "PENDENTES": return !isConfirmado;
                        case "PRESENTES": return isPresente;
                        case "AUSENTES": return !isPresente;
                        case "TODOS":
                        default: return true;
                      }
                    })
                    .map((p: ParticipanteCerimonia) => {
                      const isPresente = Boolean(p.presenteCheckin);
                      const isConfirmado = Boolean(p.confirmadoRsvp);

                      // Busca do par
                      const normalizarNome = (txt?: string) => txt ? txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
                      const parObj = p.par ? participantes.find((outro: ParticipanteCerimonia) => {
                        if (outro.id && (p as any).parId && outro.id === (p as any).parId) return true;
                        const n1 = normalizarNome(outro.nome);
                        const n2 = normalizarNome(p.par);
                        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
                      }) : null;

                      const parPresente = parObj ? Boolean(parObj.presenteCheckin) : false;
                      const parNome = p.par || (parObj ? parObj.nome : null);

                      return (
                        <div
                          key={p.id || p.nome}
                          className={`p-3.5 border transition-all flex flex-wrap items-center justify-between gap-3 rounded-[3px] ${
                            isPresente
                              ? "bg-emerald-50/50 border-emerald-300"
                              : "bg-[#FAF7F0] border-[#967D67]/50 hover:border-[#261811]"
                          }`}
                        >
                          {/* Lado Esquerdo: Informações em Hierarquia Vertical Curta */}
                          <div className="space-y-1.5 flex-1 min-w-[240px]">
                            {/* 1. Nome do Participante */}
                            <h4 className="font-serif text-base font-bold text-[#261811] leading-tight">
                              {p.nome}
                            </h4>

                            {/* 2. Papel no Casamento · Classificação ADULTO/CRIANÇA */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-display text-[0.68rem] uppercase tracking-wider font-bold text-[#453126]">
                                {formatarPapel(p.papel, p.vinculo)}
                              </span>
                              <span className="text-[#967D67]">·</span>
                              {renderClassificacao(p.nome, p.papel, p.criancaAte6Anos, p.idade)}
                            </div>

                            {/* 3. Status de RSVP */}
                            <div className="pt-0.5">
                              {isConfirmado ? (
                                <span className="font-serif text-xs font-semibold text-emerald-900 flex items-center gap-1">
                                  <span>✓</span> RSVP CONFIRMADO
                                </span>
                              ) : (
                                <span className="font-serif text-xs font-medium text-amber-900 flex items-center gap-1">
                                  <span>⏳</span> RSVP PENDENTE
                                </span>
                              )}
                            </div>

                            {/* 4. Par / Acompanhante (Secundário) */}
                            {parNome && (
                              <div className="text-xs font-serif text-[#543D30] pt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>Par: <strong className="text-[#261811]">{parNome}</strong></span>
                                  <span>·</span>
                                  {isPresente && parPresente ? (
                                    <span className="text-emerald-900 font-medium">✓ Par completo no local</span>
                                  ) : isPresente && !parPresente ? (
                                    <span className="text-amber-900 font-medium">⏳ Aguardando {parNome} chegar</span>
                                  ) : !isPresente && parPresente ? (
                                    <span className="text-teal-900 font-medium">✓ {parNome} já está no local</span>
                                  ) : (
                                    <span className="text-[#786C62]">⏳ Ambos a caminho</span>
                                  )}

                                  {parObj?.telefone && !parPresente && (
                                    <a
                                      href={`https://wa.me/55${parObj.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[0.65rem] text-emerald-800 underline font-sans font-medium hover:text-emerald-950 ml-1"
                                      title={`Cobrar ${parNome} via WhatsApp`}
                                    >
                                      WhatsApp
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 5. Telefone e Convite (Secundário) */}
                            {(p.telefone || p.codigoConvite) && (
                              <div className="text-xs font-serif text-[#786C62] pt-0.5">
                                {p.telefone && (
                                  <span>
                                    Tel. <a href={`tel:${p.telefone.replace(/[^0-9]/g, '')}`} className="underline text-[#261811] font-medium">{p.telefone}</a>
                                  </span>
                                )}
                                {p.codigoConvite && (
                                  <span className="ml-2 font-mono text-[0.65rem] text-[#967D67]">
                                    #{p.codigoConvite}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Lado Direito: Botão de Chegada e Horário */}
                          <div className="flex flex-col items-end gap-1 shrink-0 self-center">
                            <button
                              type="button"
                              onClick={() => toggleCheckinParticipante(p)}
                              className={`px-4 py-2.5 font-display text-xs tracking-wider uppercase font-bold rounded-[3px] transition-all cursor-pointer ${
                                isPresente
                                  ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                                  : "bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC]"
                              }`}
                            >
                              {isPresente ? "PRESENTE ✓ · DESMARCAR" : "MARCAR CHEGADA"}
                            </button>

                            {isPresente && p.dataHoraEntrada && (
                              <span className="text-[0.68rem] font-serif text-emerald-900">
                                Entrada: {new Date(p.dataHoraEntrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: FORNECEDORES & CONTATOS DE EMERGÊNCIA */}
            {tab === "fornecedores" && (
              <div className="space-y-4">
                {/* Header & Filtro de Categorias */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#967D67] pb-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#261811]">
                      Fornecedores &amp; Staff
                    </h3>
                    <p className="font-serif italic text-xs text-[#543D30]">
                      Controle nominal de chegada de equipes técnicas e profissionais do evento.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.65rem] font-display uppercase tracking-wider text-[#453126] font-bold">
                        Categoria:
                      </span>
                      <select
                        value={filtroCategoriaFornecedor}
                        onChange={(e) => setFiltroCategoriaFornecedor(e.target.value)}
                        className="bg-[#FAF7F0] border border-[#967D67] text-xs font-serif px-2 py-1 text-[#261811] focus:outline-none rounded-[2px]"
                      >
                        <option value="TODAS">Todas</option>
                        <option value="Foto & Vídeo">Foto &amp; Vídeo</option>
                        <option value="Música & Som">Música &amp; Som</option>
                        <option value="Cerimônia">Cerimônia</option>
                        <option value="Decoração">Decoração</option>
                        <option value="Buffet">Buffet</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalNovoFornecedor(true)}
                      className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1 font-display text-[0.65rem] tracking-wider uppercase font-bold rounded-[2px] transition-colors cursor-pointer"
                    >
                      + Cadastrar
                    </button>
                  </div>
                </div>

                {/* Resumo Superior: 3 Cards Elegantes */}
                {(() => {
                  const totalEmpresas = fornecedores.length;
                  const totalEsperados = fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.length : 0), 0);
                  const totalNoLocal = fornecedores.reduce((acc: number, f: FornecedorCasamento) => acc + (f.equipe ? f.equipe.filter((m: MembroEquipeFornecedor) => m.presente).length : 0), 0);

                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-[#FAF7F0] border border-[#D5C6B5] rounded-[3px]">
                        <strong className="font-serif text-2xl text-[#261811] block leading-none mb-1">
                          {totalEmpresas}
                        </strong>
                        <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                          Empresas Contratadas
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-[3px]">
                        <strong className="font-serif text-2xl text-emerald-950 block leading-none mb-1">
                          {totalNoLocal}
                        </strong>
                        <span className="block font-display text-[0.6rem] uppercase tracking-wider text-emerald-900 font-bold">
                          No Local
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF7F0] border border-[#D5C6B5] rounded-[3px]">
                        <strong className="font-serif text-2xl text-[#261811] block leading-none mb-1">
                          {totalEsperados}
                        </strong>
                        <span className="block font-display text-[0.6rem] uppercase tracking-wider text-[#543D30] font-bold">
                          Profissionais Esperados
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal Cadastro de Fornecedor */}
                {modalNovoFornecedor && (
                  <form onSubmit={handleCadastrarFornecedor} className="p-4 bg-[#FAF7F0] border border-[#967D67] space-y-3 text-xs rounded-[3px] shadow-xs">
                    <div className="flex justify-between items-center font-display text-xs font-bold uppercase text-[#261811] border-b border-[#D5C6B5] pb-1.5">
                      <span>Cadastrar Nova Empresa / Fornecedor</span>
                      <button type="button" onClick={() => setModalNovoFornecedor(false)} className="text-[#543D30] hover:text-red-900 font-bold">✕ Fechar</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Nome da Empresa</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Studio Lumière"
                          value={novoFornecedor.empresa}
                          onChange={e => setNovoFornecedor({...novoFornecedor, empresa: e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2.5 py-1 text-[#261811] rounded-[2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Categoria</label>
                        <select
                          value={novoFornecedor.categoria}
                          onChange={e => setNovoFornecedor({...novoFornecedor, categoria: e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2 py-1 text-[#261811] focus:outline-none rounded-[2px]"
                        >
                          <option value="Foto & Vídeo">Foto &amp; Vídeo</option>
                          <option value="Música & Som">Música &amp; Som</option>
                          <option value="Cerimônia">Cerimônia</option>
                          <option value="Buffet & Gastronomia">Buffet &amp; Gastronomia</option>
                          <option value="Decoração & Cenografia">Decoração</option>
                          <option value="Cerimonial & Assessoria">Cerimonial &amp; Assessoria</option>
                          <option value="Estrutura & Iluminação">Estrutura &amp; Iluminação</option>
                          <option value="Beleza & Estilo">Beleza &amp; Estilo</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Serviço / Especialidade</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Fotografia & Vídeo"
                          value={novoFornecedor.servico}
                          onChange={e => setNovoFornecedor({...novoFornecedor, servico: e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2.5 py-1 text-[#261811] rounded-[2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Responsável Principal</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Camila"
                          value={novoFornecedor.nome}
                          onChange={e => setNovoFornecedor({...novoFornecedor, nome: e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2.5 py-1 text-[#261811] rounded-[2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Telefone / WhatsApp</label>
                        <input
                          type="text"
                          placeholder="(11) 98222-3344"
                          value={novoFornecedor.telefone}
                          onChange={e => setNovoFornecedor({...novoFornecedor, telefone: e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2.5 py-1 text-[#261811] rounded-[2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Horário Previsto de Entrada</label>
                        <input
                          type="text"
                          placeholder="Ex: 14h00"
                          value={novoFornecedor.horarioPrevisto}
                          onChange={e => setNovoFornecedor({...novoFornecedor, horarioPrevisto: e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2.5 py-1 text-[#261811] rounded-[2px]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[0.65rem] font-display uppercase text-[#543D30] font-bold mb-0.5">Observação de Chegada Antecipada (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: Início da cobertura às 14h00"
                          value={novoFornecedor.instrucaoChegada}
                          onChange={e => setNovoFornecedor({...novoFornecedor, instrucaoChegada: e.target.value, chegadaAntecipada: !!e.target.value})}
                          className="w-full bg-white border border-[#967D67] px-2.5 py-1 text-[#261811] rounded-[2px]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t border-[#D5C6B5]">
                      <button
                        type="button"
                        onClick={() => setModalNovoFornecedor(false)}
                        className="px-3 py-1 text-xs font-serif text-[#543D30] hover:text-[#261811]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-4 py-1.5 font-display text-[0.68rem] tracking-wider uppercase font-bold rounded-[2px] cursor-pointer"
                      >
                        Salvar Fornecedor
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Fornecedores com Hierarquia Clara e Limpa */}
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {fornecedores
                    .filter((f: FornecedorCasamento) => filtrarFornecedorPorCategoria(f, filtroCategoriaFornecedor))
                    .map((f: FornecedorCasamento) => {
                      const equipe = f.equipe || [];
                      const totalPresentes = equipe.filter((m: MembroEquipeFornecedor) => m.presente).length;
                      const totalPrevistos = equipe.length;

                      return (
                        <div
                          key={f.id || f.empresa}
                          className="p-4 border border-[#967D67]/60 bg-[#FAF7F0] space-y-3 rounded-[4px] shadow-2xs"
                        >
                          {/* Topo: Nome da Empresa (Destaque Principal) e Categoria/Serviço */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="font-serif text-lg font-bold text-[#261811] leading-snug">
                                {f.empresa || f.nome}
                              </h4>
                              <p className="font-serif text-xs text-[#543D30] mt-0.5">
                                {f.servico || f.categoria || "Serviço"} · {f.papel || "Fornecedor"}
                                {f.nome && f.nome !== f.empresa ? ` · Resp: ${f.nome}` : ""}
                              </p>
                            </div>

                            {/* Resumo da Equipe Discreto */}
                            <div className="text-right shrink-0">
                              <span className={`inline-block px-2.5 py-1 font-serif text-xs rounded-[3px] border ${
                                totalPresentes === totalPrevistos && totalPrevistos > 0
                                  ? "bg-emerald-100/90 text-emerald-950 border-emerald-300 font-semibold"
                                  : totalPresentes > 0
                                  ? "bg-[#EAE0D2] text-[#453126] border-[#D5C6B5] font-semibold"
                                  : "bg-[#FAF7F0] text-[#543D30] border-[#D5C6B5]"
                              }`}>
                                {totalPrevistos} profissionais previstos · {totalPresentes} no local
                              </span>
                            </div>
                          </div>

                          {/* Linha Intermediária: Chegada Antecipada e Contato */}
                          {(f.instrucaoChegada || f.horarioPrevisto || f.telefone) && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs font-serif text-[#543D30]">
                              {f.instrucaoChegada ? (
                                <div className="flex items-center gap-1.5 bg-[#EAE0D2]/50 px-2.5 py-1 rounded-[3px] border border-[#D5C6B5]/70">
                                  <span className="font-display text-[0.62rem] uppercase tracking-wider font-bold text-[#453126]">
                                    CHEGADA ANTECIPADA
                                  </span>
                                  <span>·</span>
                                  <span>{f.instrucaoChegada}</span>
                                </div>
                              ) : f.horarioPrevisto ? (
                                <span className="text-[#543D30] text-[0.72rem]">
                                  Previsão de entrada: <strong>{f.horarioPrevisto}</strong>
                                </span>
                              ) : <div />}

                              {f.telefone && (
                                <div className="flex items-center gap-2">
                                  <span>Contato: <strong className="text-[#261811]">{f.telefone}</strong></span>
                                  <a
                                    href={`https://wa.me/55${f.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[2px] font-display text-[0.6rem] uppercase tracking-wider font-bold transition-colors"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Equipe: Check-in Individual dos Profissionais */}
                          <div className="border-t border-[#EAE0D2] pt-3 space-y-2">
                            <span className="font-display text-[0.65rem] uppercase tracking-widest text-[#543D30] font-bold block">
                              EQUIPE · CHECK-IN INDIVIDUAL
                            </span>

                            {equipe.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {equipe.map((m: MembroEquipeFornecedor) => {
                                  const isPresente = Boolean(m.presente);
                                  return (
                                    <div
                                      key={m.id}
                                      onClick={() => f.id && handleToggleMembroFornecedor(f.id, m.id, isPresente)}
                                      className={`p-2.5 border rounded-[3px] cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                        isPresente
                                          ? "bg-emerald-50/70 border-emerald-300"
                                          : "bg-white border-[#D5C6B5] hover:border-[#967D67]"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isPresente}
                                          onChange={() => {}}
                                          className="w-4 h-4 accent-emerald-700 cursor-pointer shrink-0"
                                        />
                                        <div className="truncate">
                                          <p className="font-serif text-sm font-bold text-[#261811] leading-tight truncate">
                                            {m.nome}
                                          </p>
                                          <p className="font-serif text-xs text-[#543D30] leading-tight mt-0.5 truncate">
                                            {m.funcao || "Profissional"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        {isPresente ? (
                                          <span className="inline-block px-2 py-0.5 font-display text-[0.6rem] tracking-wider uppercase font-bold bg-emerald-700 text-white rounded-[2px]">
                                            NO LOCAL
                                          </span>
                                        ) : (
                                          <span className="inline-block px-2 py-0.5 font-display text-[0.6rem] tracking-wider uppercase font-semibold bg-[#EAE0D2] text-[#543D30] border border-[#D5C6B5] rounded-[2px]">
                                            AGUARDANDO
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="font-serif italic text-xs text-[#543D30]">
                                Nenhum profissional cadastrado para esta equipe.
                              </p>
                            )}

                            {/* Adicionar Profissional com Entrada Discreta e Secundária */}
                            {f.id && (
                              <div className="pt-1">
                                {!expandindoAddMembro[f.id] ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandindoAddMembro(prev => ({ ...prev, [f.id!]: true }))}
                                    className="text-xs font-serif text-[#261811] hover:text-[#543D30] underline font-medium cursor-pointer"
                                  >
                                    + Adicionar profissional
                                  </button>
                                ) : (
                                  <div className="p-2.5 bg-[#FAF7F0] border border-[#D5C6B5] rounded-[3px] space-y-2 text-xs">
                                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                      <input
                                        type="text"
                                        autoFocus
                                        placeholder="Nome do profissional"
                                        value={membroExtraNome[f.id] || ""}
                                        onChange={(e) => setMembroExtraNome({ ...membroExtraNome, [f.id!]: e.target.value })}
                                        className="flex-1 bg-white border border-[#967D67] px-2.5 py-1 text-xs text-[#261811] font-serif focus:outline-none rounded-[2px]"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Função (ex: Assistente)"
                                        value={membroExtraFuncao[f.id] || ""}
                                        onChange={(e) => setMembroExtraFuncao({ ...membroExtraFuncao, [f.id!]: e.target.value })}
                                        className="w-full sm:w-36 bg-white border border-[#967D67] px-2.5 py-1 text-xs text-[#261811] font-serif focus:outline-none rounded-[2px]"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setExpandindoAddMembro(prev => ({ ...prev, [f.id!]: false }))}
                                        className="px-2.5 py-1 font-serif text-xs text-[#543D30] hover:text-[#261811] cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await handleAdicionarMembroExtra(f.id!);
                                          setExpandindoAddMembro(prev => ({ ...prev, [f.id!]: false }));
                                        }}
                                        className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1 font-display text-[0.62rem] uppercase tracking-wider font-bold rounded-[2px] cursor-pointer"
                                      >
                                        Salvar Profissional
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 4: PLACAR DE AUDITORIA PARA O BUFFET */}
            {tab === "auditoria" && (
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#967D67] pb-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#261811]">
                      Conferência Oficial para o Buffet
                    </h3>
                    <p className="font-serif italic text-xs text-[#543D30]">
                      Auditoria nominal de presenças em tempo real para fechamento da recepção.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopiarWhatsApp}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 font-display text-xs tracking-wider uppercase font-bold rounded-[3px] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {copiadoWhatsApp ? "✓ Texto Copiado!" : "Copiar p/ WhatsApp"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCompartilharWhatsApp}
                      className="bg-[#261811] hover:bg-[#3D281E] text-[#F8F4EC] px-3 py-1.5 font-display text-xs tracking-wider uppercase font-bold rounded-[3px] transition-colors cursor-pointer"
                    >
                      Abrir no WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={carregarAuditoria}
                      disabled={carregandoAuditoria}
                      className="text-xs text-[#261811] underline hover:text-[#543D30] font-serif ml-2"
                    >
                      {carregandoAuditoria ? "Atualizando..." : "Recarregar"}
                    </button>
                  </div>
                </div>

                {relatorio ? (
                  <div className="space-y-4">
                    {/* Grid de Métricas Principais com Decomposição Discreta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-[#EAE0D2] border border-[#967D67] text-center rounded-[3px]">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30] font-bold block">
                          Total Convidado
                        </span>
                        <strong className="font-serif text-2xl text-[#261811]">
                          {relatorio.totalConvidadosPrevistos}
                        </strong>
                        <span className="block text-[0.65rem] text-[#543D30]">
                          ({relatorio.totalAdultosPrevistos} adultos · {relatorio.totalCriancasPrevistas} crianças)
                        </span>
                      </div>

                      <div className="p-3 bg-[#EAE0D2] border border-[#967D67] text-center rounded-[3px]">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-[#543D30] font-bold block">
                          Confirmados RSVP
                        </span>
                        <strong className="font-serif text-2xl text-blue-950">
                          {relatorio.totalConfirmadosRsvp}
                        </strong>
                        <span className="block text-[0.65rem] text-[#543D30]">
                          ({relatorio.totalAdultosConfirmados} adultos · {relatorio.totalCriancasConfirmadas} crianças)
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-100 border-2 border-emerald-600 text-center rounded-[3px]">
                        <span className="font-display text-[0.6rem] tracking-wider uppercase text-emerald-950 font-bold block">
                          Presentes Reais
                        </span>
                        <strong className="font-serif text-2xl text-emerald-950">
                          {relatorio.totalPresentesReais}
                        </strong>
                        <span className="block text-[0.65rem] text-emerald-900 font-bold">
                          ({relatorio.totalAdultosPresentes} adultos · {relatorio.totalCriancasPresentes} crianças)
                        </span>
                      </div>

                      <div className="p-3 bg-red-100 border border-red-500 text-center rounded-[3px]">
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

                    {/* Explicação Operacional Elegante (Sem termos de cobrança comercial) */}
                    <div className="p-3 bg-[#FAF7F0] border border-[#967D67] text-xs font-serif text-[#453126] rounded-[3px]">
                      <strong>Conferência da Recepção:</strong> Contagem real auditada de <strong>{relatorio.totalPresentesReais} presentes</strong> no evento ({relatorio.totalAdultosPresentes} adultos e {relatorio.totalCriancasPresentes} crianças).
                    </div>

                    {/* Tabela de Famílias com Composição Direta e Detalhamento Expansível */}
                    <div className="max-h-[360px] overflow-y-auto border border-[#967D67] bg-[#FFF] text-xs rounded-[3px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#EAE0D2] font-display text-[0.65rem] uppercase tracking-wider text-[#261811] sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 border-b border-[#967D67]">Família</th>
                            <th className="p-2.5 border-b border-[#967D67]">Composição</th>
                            <th className="p-2.5 border-b border-[#967D67] text-center">RSVP</th>
                            <th className="p-2.5 border-b border-[#967D67] text-center">Presentes</th>
                            <th className="p-2.5 border-b border-[#967D67] text-center">Faltaram</th>
                            <th className="p-2.5 border-b border-[#967D67] text-center">Membros</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE0D2] font-serif">
                          {relatorio.familias.map((f: any) => {
                            const isExpandido = Boolean(familiasExpandidas[f.codigo]);
                            const membros = f.membros || [];
                            const criancas = membros.filter((m: MembroAutorizado) => verificarSeCrianca(m.nome, m.papel, m.criancaAte6Anos)).length;
                            const adultos = (f.totalMembros || membros.length) - criancas;

                            return (
                              <React.Fragment key={f.codigo}>
                                <tr
                                  onClick={() => toggleFamiliaExpandida(f.codigo)}
                                  className="hover:bg-[#FAF7F0] cursor-pointer transition-colors"
                                >
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <strong className="text-[#261811]">{f.familia}</strong>
                                      {f.papel && (
                                        <span className="px-1.5 py-0.2 bg-[#261811] text-[#F8F4EC] border border-[#967D67] rounded-[2px] text-[0.58rem] font-display uppercase tracking-wider font-bold">
                                          {f.papel}
                                        </span>
                                      )}
                                    </div>
                                    <span className="block text-[0.65rem] text-[#8C7A6B]">#{f.codigo}</span>
                                  </td>
                                  <td className="p-2.5 text-[#543D30] font-medium text-[0.72rem]">
                                    {formatarComposicao(adultos > 0 ? adultos : 0, criancas)}
                                  </td>
                                  <td className="p-2.5 text-center text-blue-900 font-semibold">{f.confirmadosRsvp}</td>
                                  <td className="p-2.5 text-center text-emerald-900 font-bold">{f.presentesCheckin}</td>
                                  <td className="p-2.5 text-center text-red-900 font-semibold">{f.ausentesNoShow}</td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFamiliaExpandida(f.codigo);
                                      }}
                                      className="px-2 py-0.5 bg-[#FAF7F0] hover:bg-[#EAE0D2] border border-[#967D67] text-[0.65rem] font-display uppercase tracking-wider rounded-[2px] text-[#261811]"
                                    >
                                      {isExpandido ? "Recolher ▲" : "Ver Lista ▼"}
                                    </button>
                                  </td>
                                </tr>

                                {/* Linha Expansível com Detalhamento Individual */}
                                {isExpandido && (
                                  <tr className="bg-[#FAF7F0]/90">
                                    <td colSpan={6} className="p-3 border-b border-[#D5C6B5]">
                                      <div className="space-y-1.5 pl-2 border-l-2 border-[#967D67]">
                                        <span className="block font-display text-[0.62rem] uppercase tracking-wider text-[#543D30] font-bold">
                                          Membros da Família ({membros.length}):
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                          {membros.map((m: MembroAutorizado) => {
                                            const isPres = m.presenteCheckin;
                                            const isConf = m.confirmadoRsvp !== false;

                                            return (
                                              <div
                                                key={m.id || m.nome}
                                                className="p-2 bg-white border border-[#D5C6B5] rounded-[2px] flex items-center justify-between gap-2"
                                              >
                                                <div className="space-y-0.5">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-serif text-xs font-bold text-[#261811]">
                                                      {m.nome}
                                                    </span>
                                                    {renderClassificacao(m.nome, m.papel, m.criancaAte6Anos)}
                                                  </div>
                                                  <div className="flex items-center gap-2 text-[0.62rem]">
                                                    <span className={isConf ? "text-emerald-900 font-semibold" : "text-amber-900"}>
                                                      {isConf ? "✓ RSVP Confirmado" : "⏳ RSVP Pendente"}
                                                    </span>
                                                  </div>
                                                </div>

                                                <div>
                                                  {isPres ? (
                                                    <span className="inline-block px-1.5 py-0.2 bg-emerald-600 text-white rounded-[2px] font-display text-[0.58rem] uppercase font-bold tracking-wider">
                                                      Presente
                                                    </span>
                                                  ) : (
                                                    <span className="inline-block px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-[2px] font-display text-[0.58rem] uppercase font-medium tracking-wider">
                                                      Ausente
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
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
