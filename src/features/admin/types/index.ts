import type { NovoMembroAdminRequest } from "../../../services/api";

export type Tab =
  | "dashboard"
  | "convites"
  | "rsvp"
  | "portaria"
  | "cortejo"
  | "fornecedores"
  | "auditoria"
  | "configuracoes";

export type UserRole = "admin" | "recepcao";

export interface MembroConviteCadastrado {
  id?: string;
  nome: string;
  criancaAte6Anos?: boolean;
  titular?: boolean;
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  papel?: string;
  vinculo?: string;
}

export interface ConviteCadastrado {
  id?: string;
  codigo: string;
  familia: string;
  telefone?: string;
  email?: string;
  papel?: string;
  status?: string;
  observacao?: string;
  membros: MembroConviteCadastrado[];
  dataConfirmacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NovoConviteFormState {
  familia: string;
  telefone: string;
  email: string;
  papel: string;
  observacao: string;
  membros: NovoMembroAdminRequest[];
}

export const PAPEL_OPTIONS = [
  "Convidados",
  "Padrinhos",
  "Madrinhas",
  "Pais dos Noivos",
  "Família Próxima",
  "Cortejo",
  "Fornecedor",
];

export const PAPEL_MEMBRO_OPTIONS = [
  "Convidado",
  "Padrinho",
  "Madrinha",
  "Pai",
  "Mãe",
  "Daminha",
  "Pajem",
  "Cortejo",
];

export const VINCULO_OPTIONS = [
  "Noivo",
  "Noiva",
  "Família / Ambos",
];

