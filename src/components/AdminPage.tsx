import React from "react";
import { AdminPanel } from "../features/admin/AdminPanel";

/**
 * Entrypoint do Painel Administrativo Unificado.
 * Arquitetura baseada em Features Modulares (Padrão Enterprise / Itaú).
 *
 * Módulos desacoplados em `src/features/admin/`:
 *  - components/ (Header, Login, Modais, Cards)
 *  - tabs/       (Dashboard, Convites, Rsvp, Portaria, Cortejo, Fornecedores, Auditoria)
 *  - utils/      (Áudio Web Audio API, Formatadores, Links)
 *  - types/      (Contratos de domínio)
 */
export default function AdminPage() {
  return <AdminPanel />;
}

// Re-exportação de tipos para manter retrocompatibilidade com qualquer importador legado
export type {
  ConviteCadastrado,
  MembroConviteCadastrado,
  Tab,
  UserRole,
} from "../features/admin/types";
