// Design System — tokens centralizados
// Todos os componentes devem importar daqui em vez de definir cores inline
// Os status seguem o mesmo padrão do backend: CONFIRMADO, RECUSADO, PENDENTE, PRESENTE, AUSENTE

export const STATUS_STYLES: Record<string, string> = {
  CONFIRMADO: "bg-green-50 text-green-800 border border-green-200",
  RECUSADO:   "bg-red-50 text-red-800 border border-red-200",
  PENDENTE:   "bg-amber-50 text-amber-800 border border-amber-200",
  PRESENTE:   "bg-blue-50 text-blue-800 border border-blue-200",
  AUSENTE:    "bg-gray-50 text-gray-500 border border-gray-200",
};

export const STATUS_LABELS: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  RECUSADO:   "Recusado",
  PENDENTE:   "Pendente",
  PRESENTE:   "Presente",
  AUSENTE:    "Ausente",
};

export const TYPE_STYLES: Record<string, string> = {
  CONVIDADO:  "bg-slate-100 text-slate-700 border border-slate-300",
  FORNECEDOR: "bg-violet-50 text-violet-800 border border-violet-200",
};

export const TYPE_LABELS: Record<string, string> = {
  CONVIDADO:  "Convidado",
  FORNECEDOR: "Fornecedor",
};

