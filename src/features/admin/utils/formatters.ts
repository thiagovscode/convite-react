export function fmtNumber(n: number | undefined): string {
  return (n ?? 0).toLocaleString("pt-BR");
}

export function getLinkConviteCompleto(codigo: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  return `${origin}${pathname}`.replace(/\/$/, "") + `/?convite=${codigo}`;
}

export function getLinkRsvpDireto(codigo: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  return `${origin}${pathname}`.replace(/\/$/, "") + `/?convite=${codigo}#rsvp`;
}

export function abrirWhatsAppConvite(familia: string, codigo: string, telefone?: string): void {
  const link = getLinkConviteCompleto(codigo);
  const msg = `Olá, ${familia}! Preparamos com muito carinho o nosso convite de casamento. Clique no link para ver os detalhes e confirmar a presença da sua família:\n\n${link}`;
  const telLimpo = (telefone || "").replace(/\D/g, "");

  if (telLimpo.length >= 10) {
    window.open(`https://wa.me/55${telLimpo}?text=${encodeURIComponent(msg)}`, "_blank");
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }
}
