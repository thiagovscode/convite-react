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
  confirmadoRsvp?: boolean;
  presenteCheckin?: boolean;
  papel?: string;
  vinculo?: string;
  par?: string;
  participaCortejo?: boolean;
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
  ehFornecedor?: boolean;
  fornecedorId?: string;
}

export interface NovoConviteFormState {
  familia: string;
  telefone: string;
  email: string;
  papel?: string;
  observacao: string;
  membros: NovoMembroAdminRequest[];
}

export const PAPEL_OPTIONS = [
  "Convidados",
  "Padrinhos",
  "Madrinhas",
  "Pais dos Noivos",
  "Família Próxima",
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
  "Florista",
  "Outro",
];

export const VINCULO_OPTIONS = [
  "Noivo",
  "Noiva",
  "Pai/Mãe",
  "Irmão/Irmã",
  "Família",
  "Amigo(a)",
  "Colega",
  "Outro",
];

