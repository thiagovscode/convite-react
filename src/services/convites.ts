import { getApiBaseUrl } from './api';

export interface MembroAutorizado {
  id: string;
  nome: string;
  criancaAte6Anos: boolean; // true = menor de 7 anos (0 a 6 anos); false = adulto / >= 7 anos
  titular?: boolean;
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  dataHoraCheckin?: string;
  recepcionista?: string;
  papel?: string; // Ex: Padrinho, Madrinha, Pai dos Noivos, Mãe dos Noivos, etc.
  vinculo?: string; // Ex: Noivo, Noiva, Casal
}

export interface ParticipanteCerimonia {
  id?: string;
  nome: string;
  papel: string; // Madrinha, Padrinho, Pai dos Noivos, etc.
  vinculo?: string; // Noivo, Noiva
  par?: string; // Nome do par no cortejo (ex: Mariana Alencar)
  telefone?: string;
  codigoConvite?: string;
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  dataHoraEntrada?: string;
}

export interface MembroEquipeFornecedor {
  id: string;
  nome: string;
  funcao?: string; // Maestro, Violino, Fotógrafo Principal, Assistente, etc.
  presente: boolean;
  dataHoraEntrada?: string;
}

export interface FornecedorCasamento {
  id?: string;
  nome: string; // Responsável principal (ex: Luciano)
  responsavel?: string;
  papel?: string; // "Fornecedor"
  servico: string; // Orquestra, Fotografia, Som e DJ, Cerimonial, Buffet, etc.
  empresa: string; // Ex: Harmonia Musical
  telefone?: string; // Contato de emergência da equipe
  horarioPrevisto?: string; // Ex: "14:00"
  instrucaoChegada?: string; // Ex: "Chegada antecipada para afinação e montagem"
  chegadaAntecipada?: boolean; // Destaca que precisa entrar mais cedo
  equipe: MembroEquipeFornecedor[];
}

export interface ConvitePreDefinido {
  id?: string;
  codigo: string;          // Ex: "fulana", "fam-silva"
  familia: string;         // Ex: "Família Silva" ou "Fulana da Silva e Família"
  telefone?: string;
  email?: string;
  status?: string;         // PENDENTE, CONFIRMADO, RECUSADO
  papel?: string;          // Ex: Padrinhos dos Noivos, Pais do Noivo
  membros: MembroAutorizado[];
  confirmado?: boolean;
  dataConfirmacao?: string;
}

export interface RelatorioAuditoria {
  totalConvidadosPrevistos: number;
  totalAdultosPrevistos: number;
  totalCriancasPrevistas: number;

  totalConfirmadosRsvp: number;
  totalAdultosConfirmados: number;
  totalCriancasConfirmadas: number;

  totalPresentesReais: number;
  totalAdultosPresentes: number;
  totalCriancasPresentes: number;

  totalAusentesNoShow: number;
  totalAguardandoChegada: number;
  totalRecusados: number;

  familias: Array<{
    id?: string;
    codigo: string;
    familia: string;
    statusRsvp: string;
    telefone?: string;
    papel?: string;
    vinculo?: string;
    totalMembros: number;
    confirmadosRsvp: number;
    presentesCheckin: number;
    ausentesNoShow: number;
    membros: MembroAutorizado[];
  }>;
}

// Lista padrão / fallback local
const STORAGE_KEY = 'CONVITES_PRE_DEFINIDOS_CASAMENTO';

const convitesPadrao: ConvitePreDefinido[] = [
  {
    codigo: "fulana",
    familia: "Fulana da Silva e Família",
    telefone: "(11) 98888-7777",
    status: "PENDENTE",
    membros: [
      { id: "1", nome: "Fulana da Silva", criancaAte6Anos: false, titular: true },
      { id: "2", nome: "Lucas Silva (Filho)", criancaAte6Anos: true, titular: false },
      { id: "3", nome: "Matheus Silva (Filho)", criancaAte6Anos: false, titular: false }
    ]
  },
  {
    codigo: "padrinhos-joao",
    familia: "João e Mariana (Padrinhos)",
    telefone: "(11) 97777-6666",
    status: "PENDENTE",
    papel: "Padrinhos dos Noivos",
    membros: [
      { id: "p1", nome: "João Pedro Santos", criancaAte6Anos: false, titular: true, papel: "Padrinho" },
      { id: "p2", nome: "Mariana Alencar", criancaAte6Anos: false, titular: false, papel: "Madrinha" }
    ]
  },
  {
    codigo: "fam-vasconcelos",
    familia: "Família Vasconcelos (Pais do Noivo)",
    telefone: "(11) 99999-5555",
    status: "PENDENTE",
    papel: "Pais do Noivo",
    membros: [
      { id: "v1", nome: "Carlos Vasconcelos", criancaAte6Anos: false, titular: true, papel: "Pai do Noivo" },
      { id: "v2", nome: "Clara Vasconcelos", criancaAte6Anos: false, titular: false, papel: "Mãe do Noivo" },
      { id: "v3", nome: "Sofia Vasconcelos", criancaAte6Anos: true, titular: false, papel: "Daminha / Família" }
    ]
  }
];

export function carregarConvitesPreDefinidos(): ConvitePreDefinido[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Erro ao carregar convites do storage:", e);
  }
  return convitesPadrao;
}

export function salvarConvitesPreDefinidos(convites: ConvitePreDefinido[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convites));
  } catch (e) {
    console.error("Erro ao salvar convites no storage:", e);
  }
}

// 1. Busca convite pelo código (com fallback para storage offline)
export async function buscarConvitePorCodigo(codigo: string): Promise<ConvitePreDefinido | null> {
  const limpo = codigo.toLowerCase().trim();
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/convites/${encodeURIComponent(limpo)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.codigo) return data;
    }
  } catch {
    // Continua para o storage local caso o backend esteja indisponível
  }

  const lista = carregarConvitesPreDefinidos();
  return lista.find(c => c.codigo.toLowerCase() === limpo) || null;
}

// 2. Login da equipe de recepção
export async function loginRecepcaoBackend(username: string, password: string): Promise<{ success: boolean; token?: string; message?: string }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, token: data.token };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message || "Credenciais inválidas" };
  } catch {
    // Autenticação local offline
    if (username.trim().toLowerCase() === "recepcao" && (password === "recepcao2027" || password === "admin123")) {
      return { success: true, token: "TOKEN_OFFLINE_RECEPCAO" };
    }
    return { success: false, message: "Não foi possível conectar ao servidor." };
  }
}

// 3. Registrar check-in individual por membro
export async function registrarCheckinBackend(
  codigo: string,
  presencas: Array<{ membroId: string; presente: boolean }>,
  operador: string = "Recepção"
): Promise<{ success: boolean; message: string; convite?: any }> {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/recepcao/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        presencas,
        recepcionista: operador
      })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || "Check-in realizado com sucesso", convite: data.convite };
    }
  } catch {
    // Fallback offline
  }

  // Atualiza localmente no storage offline
  const lista = carregarConvitesPreDefinidos();
  const convite = lista.find(c => c.codigo.toLowerCase() === codigo.toLowerCase());
  if (convite && convite.membros) {
    const mapa = new Map(presencas.map(p => [p.membroId, p.presente]));
    convite.membros.forEach(m => {
      if (mapa.has(m.id)) {
        m.presenteCheckin = mapa.get(m.id);
        m.dataHoraCheckin = m.presenteCheckin ? new Date().toISOString() : undefined;
        m.recepcionista = operador;
      }
    });
    salvarConvitesPreDefinidos(lista);
    return { success: true, message: "Check-in salvo localmente (offline)", convite };
  }

  return { success: false, message: "Convite não encontrado." };
}

// 4. Obter relatório geral de auditoria (para Buffet e Noivos)
export async function buscarRelatorioAuditoriaBackend(): Promise<RelatorioAuditoria | null> {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/recepcao/auditoria`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  // Monta resumo a partir do storage offline
  const lista = carregarConvitesPreDefinidos();
  let previstos = 0, adultosPrev = 0, criancasPrev = 0;
  let rsvp = 0, adultosRsvp = 0, criancasRsvp = 0;
  let presentes = 0, adultosPres = 0, criancasPres = 0;
  let ausentes = 0, aguardando = 0, recusados = 0;

  lista.forEach(c => {
    if (c.status === "RECUSADO") recusados++;
    c.membros?.forEach(m => {
      previstos++;
      if (m.criancaAte6Anos) criancasPrev++; else adultosPrev++;

      if (m.confirmadoRsvp) {
        rsvp++;
        if (m.criancaAte6Anos) criancasRsvp++; else adultosRsvp++;

        if (m.presenteCheckin === true) {
          presentes++;
          if (m.criancaAte6Anos) criancasPres++; else adultosPres++;
        } else if (m.presenteCheckin === false) {
          ausentes++;
        } else {
          aguardando++;
        }
      }
    });
  });

  return {
    totalConvidadosPrevistos: previstos,
    totalAdultosPrevistos: adultosPrev,
    totalCriancasPrevistas: criancasPrev,
    totalConfirmadosRsvp: rsvp,
    totalAdultosConfirmados: adultosRsvp,
    totalCriancasConfirmadas: criancasRsvp,
    totalPresentesReais: presentes,
    totalAdultosPresentes: adultosPres,
    totalCriancasPresentes: criancasPres,
    totalAusentesNoShow: ausentes,
    totalAguardandoChegada: aguardando,
    totalRecusados: recusados,
    familias: lista.map(c => ({
      codigo: c.codigo,
      familia: c.familia,
      statusRsvp: c.status || "PENDENTE",
      telefone: c.telefone,
      papel: c.papel,
      totalMembros: c.membros?.length || 0,
      confirmadosRsvp: c.membros?.filter(m => m.confirmadoRsvp).length || 0,
      presentesCheckin: c.membros?.filter(m => m.presenteCheckin === true).length || 0,
      ausentesNoShow: c.membros?.filter(m => m.presenteCheckin === false).length || 0,
      membros: c.membros || []
    }))
  };
}

export function adicionarOuAtualizarConvite(convite: ConvitePreDefinido) {
  const lista = carregarConvitesPreDefinidos();
  const idx = lista.findIndex(c => c.codigo.toLowerCase() === convite.codigo.toLowerCase());
  if (idx >= 0) {
    lista[idx] = convite;
  } else {
    lista.push(convite);
  }
  salvarConvitesPreDefinidos(lista);
}

export function removerConvite(codigo: string) {
  const lista = carregarConvitesPreDefinidos().filter(c => c.codigo.toLowerCase() !== codigo.toLowerCase());
  salvarConvitesPreDefinidos(lista);
}

// ==========================================
// 5. PARTICIPANTES DA CERIMÔNIA (CORTEJO)
// ==========================================
const PARTICIPANTES_STORAGE_KEY = 'PARTICIPANTES_CERIMONIA_CASAMENTO';

const participantesPadrao: ParticipanteCerimonia[] = [
  { id: "part-1", nome: "Maria Santos", papel: "Madrinha", vinculo: "Noivo", par: "Lucas Santos", telefone: "(11) 98777-1111", codigoConvite: "padrinhos-joao", confirmadoRsvp: true, presenteCheckin: false },
  { id: "part-2", nome: "João Pedro Santos", papel: "Padrinho", vinculo: "Noivo", par: "Mariana Alencar", telefone: "(11) 97777-6666", codigoConvite: "padrinhos-joao", confirmadoRsvp: true, presenteCheckin: false },
  { id: "part-3", nome: "Mariana Alencar", papel: "Madrinha", vinculo: "Noiva", par: "João Pedro Santos", telefone: "(11) 97777-6666", codigoConvite: "padrinhos-joao", confirmadoRsvp: false, presenteCheckin: false },
  { id: "part-4", nome: "Carlos Vasconcelos", papel: "Pai do Noivo", vinculo: "Noivo", par: "Clara Vasconcelos", telefone: "(11) 99999-5555", codigoConvite: "fam-vasconcelos", confirmadoRsvp: true, presenteCheckin: false },
  { id: "part-5", nome: "Clara Vasconcelos", papel: "Mãe do Noivo", vinculo: "Noivo", par: "Carlos Vasconcelos", telefone: "(11) 99999-5555", codigoConvite: "fam-vasconcelos", confirmadoRsvp: true, presenteCheckin: false }
];

export function carregarParticipantesOffline(): ParticipanteCerimonia[] {
  try {
    const raw = localStorage.getItem(PARTICIPANTES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao carregar participantes offline:", e);
  }
  return participantesPadrao;
}

export function salvarParticipantesOffline(lista: ParticipanteCerimonia[]) {
  try {
    localStorage.setItem(PARTICIPANTES_STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error("Erro ao salvar participantes offline:", e);
  }
}

export async function buscarParticipantesCerimoniaBackend(): Promise<{ total: number; confirmadosRsvp: number; presentes: number; participantes: ParticipanteCerimonia[] }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/participantes`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback offline
  }

  const list = carregarParticipantesOffline();
  return {
    total: list.length,
    confirmadosRsvp: list.filter(p => p.confirmadoRsvp).length,
    presentes: list.filter(p => p.presenteCheckin).length,
    participantes: list
  };
}

export async function checkinParticipanteBackend(id: string, presente?: boolean): Promise<{ success: boolean; message: string; participante?: ParticipanteCerimonia }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/participantes/${encodeURIComponent(id)}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presente !== undefined ? { presente } : {})
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback offline
  }

  const list = carregarParticipantesOffline();
  const part = list.find(p => p.id === id);
  if (part) {
    part.presenteCheckin = presente !== undefined ? presente : !part.presenteCheckin;
    part.dataHoraEntrada = part.presenteCheckin ? new Date().toISOString() : undefined;
    salvarParticipantesOffline(list);
    return { success: true, message: "Status do participante atualizado offline", participante: part };
  }
  return { success: false, message: "Participante não localizado" };
}

// ==========================================
// 6. FORNECEDORES & CONTATOS DE EMERGÊNCIA
// ==========================================
const FORNECEDORES_STORAGE_KEY = 'FORNECEDORES_CASAMENTO';

const fornecedoresPadrao: FornecedorCasamento[] = [
  {
    id: "forn-1",
    nome: "Luciano",
    responsavel: "Luciano",
    papel: "Fornecedor",
    servico: "Orquestra",
    empresa: "Harmonia Musical",
    telefone: "(11) 98111-2233",
    horarioPrevisto: "14:00",
    instrucaoChegada: "Chegada antecipada às 14:00 para afinação e montagem de instrumentos acústicos",
    chegadaAntecipada: true,
    equipe: [
      { id: "f1-1", nome: "Luciano", funcao: "Maestro / Responsável", presente: false },
      { id: "f1-2", nome: "Amanda", funcao: "Violino", presente: false },
      { id: "f1-3", nome: "Felipe", funcao: "Violoncelo", presente: false },
      { id: "f1-4", nome: "Mariana", funcao: "Teclado", presente: false }
    ]
  },
  {
    id: "forn-2",
    nome: "Camila",
    responsavel: "Camila",
    papel: "Fornecedor",
    servico: "Fotografia & Vídeo",
    empresa: "Studio Lumière",
    telefone: "(11) 98222-3344",
    horarioPrevisto: "14:30",
    instrucaoChegada: "Chegada antecipada para início da cobertura de making-of e decoração",
    chegadaAntecipada: true,
    equipe: [
      { id: "f2-1", nome: "Camila", funcao: "Fotógrafa Principal", presente: false },
      { id: "f2-2", nome: "Pedro", funcao: "Cinegrafista", presente: false },
      { id: "f2-3", nome: "Lucas", funcao: "Assistente de Luz", presente: false }
    ]
  },
  {
    id: "forn-3",
    nome: "DJ Rodrigo",
    responsavel: "DJ Rodrigo",
    papel: "Fornecedor",
    servico: "Som e Iluminação",
    empresa: "Beat & Light",
    telefone: "(11) 98333-4455",
    horarioPrevisto: "13:00",
    instrucaoChegada: "Montagem técnica antecipada de som de pista e iluminação cênica",
    chegadaAntecipada: true,
    equipe: [
      { id: "f3-1", nome: "DJ Rodrigo", funcao: "DJ e Operador", presente: false },
      { id: "f3-2", nome: "Tiago", funcao: "Técnico de Som", presente: false }
    ]
  }
];

export function carregarFornecedoresOffline(): FornecedorCasamento[] {
  try {
    const raw = localStorage.getItem(FORNECEDORES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao carregar fornecedores offline:", e);
  }
  return fornecedoresPadrao;
}

export function salvarFornecedoresOffline(lista: FornecedorCasamento[]) {
  try {
    localStorage.setItem(FORNECEDORES_STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error("Erro ao salvar fornecedores offline:", e);
  }
}

export async function buscarFornecedoresBackend(): Promise<{
  totalEmpresas: number;
  totalMembrosEquipe: number;
  totalMembrosPresentes: number;
  fornecedores: FornecedorCasamento[];
}> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/fornecedores`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback offline
  }

  const list = carregarFornecedoresOffline();
  let totalMembros = 0;
  let totalPresentes = 0;
  list.forEach(f => {
    if (f.equipe) {
      totalMembros += f.equipe.length;
      totalPresentes += f.equipe.filter(m => m.presente).length;
    }
  });

  return {
    totalEmpresas: list.length,
    totalMembrosEquipe: totalMembros,
    totalMembrosPresentes: totalPresentes,
    fornecedores: list
  };
}

export async function checkinMembroFornecedorBackend(
  fornecedorId: string,
  membroId: string,
  presente?: boolean
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/fornecedores/${encodeURIComponent(fornecedorId)}/membros/${encodeURIComponent(membroId)}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presente !== undefined ? { presente } : {})
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback offline
  }

  const list = carregarFornecedoresOffline();
  const forn = list.find(f => f.id === fornecedorId);
  if (forn && forn.equipe) {
    const membro = forn.equipe.find(m => m.id === membroId);
    if (membro) {
      membro.presente = presente !== undefined ? presente : !membro.presente;
      membro.dataHoraEntrada = membro.presente ? new Date().toISOString() : undefined;
      salvarFornecedoresOffline(list);
      return { success: true, message: `Presença de ${membro.nome} atualizada`, fornecedor: forn };
    }
  }
  return { success: false, message: "Fornecedor ou membro não localizado" };
}

export async function adicionarMembroFornecedorBackend(
  fornecedorId: string,
  novoMembro: { nome: string; funcao?: string }
): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/fornecedores/${encodeURIComponent(fornecedorId)}/membros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoMembro)
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback offline
  }

  const list = carregarFornecedoresOffline();
  const forn = list.find(f => f.id === fornecedorId);
  if (forn) {
    if (!forn.equipe) forn.equipe = [];
    const criado = {
      id: "membro-" + Date.now(),
      nome: novoMembro.nome,
      funcao: novoMembro.funcao || "Equipe",
      presente: true,
      dataHoraEntrada: new Date().toISOString()
    };
    forn.equipe.push(criado);
    salvarFornecedoresOffline(list);
    return { success: true, message: `Profissional ${novoMembro.nome} adicionado com sucesso`, fornecedor: forn };
  }
  return { success: false, message: "Fornecedor não localizado" };
}

export async function cadastrarFornecedorBackend(novo: Partial<FornecedorCasamento>): Promise<{ success: boolean; message: string; fornecedor?: FornecedorCasamento }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/recepcao/fornecedores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo)
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback offline
  }

  const list = carregarFornecedoresOffline();
  const criado: FornecedorCasamento = {
    id: "forn-" + Date.now(),
    nome: novo.nome || "Responsável",
    responsavel: novo.nome || "Responsável",
    papel: "Fornecedor",
    servico: novo.servico || "Geral",
    empresa: novo.empresa || "Empresa",
    telefone: novo.telefone || "",
    horarioPrevisto: novo.horarioPrevisto || "14:00",
    instrucaoChegada: novo.instrucaoChegada || "",
    chegadaAntecipada: Boolean(novo.chegadaAntecipada),
    equipe: [
      {
        id: "membro-" + Date.now(),
        nome: novo.nome || "Responsável",
        funcao: "Responsável",
        presente: false
      }
    ]
  };
  list.push(criado);
  salvarFornecedoresOffline(list);
  return { success: true, message: "Fornecedor cadastrado com sucesso", fornecedor: criado };
}
