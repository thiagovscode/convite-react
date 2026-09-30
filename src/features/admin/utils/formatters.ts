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

export function getTextoWhatsAppConvite(codigo: string): string {
  const link = getLinkConviteCompleto(codigo);
  return `Nosso grande dia está chegando! 🤍\n\nNo dia 24/01, celebraremos o nosso amor e será uma alegria imensa ter você conosco.\n\nPreparamos nosso convite com todo carinho, e nele estão reunidas todas as informações importantes sobre a celebração. \n\nPedimos, por gentileza, que confirme sua presença através do link indicado.\n\n${link}\n\nPara quem quiser nos presentear, também disponibilizamos nossa lista de presentes, como uma forma especial de participar desse novo capítulo da nossa história. 🎁\n\nE, caso tenha qualquer dúvida, estamos à disposição para ajudar. É só chamar os noivos! 🤍\n\nCom carinho,\nTainara e Thiago`;
}

export function abrirWhatsAppConvite(_familia: string, codigo: string, telefone?: string): void {
  const msg = getTextoWhatsAppConvite(codigo);
  const telLimpo = (telefone || "").replace(/\D/g, "");

  if (telLimpo.startsWith("55") && telLimpo.length >= 12) {
    window.open(`https://wa.me/${telLimpo}?text=${encodeURIComponent(msg)}`, "_blank");
  } else if (telLimpo.length >= 10) {
    window.open(`https://wa.me/55${telLimpo}?text=${encodeURIComponent(msg)}`, "_blank");
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }
}
