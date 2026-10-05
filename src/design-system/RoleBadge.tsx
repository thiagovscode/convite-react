import React from "react";

interface RoleBadgeProps {
  papel: string;
  className?: string;
}

/**
 * Normaliza e estiliza o papel de um participante de casamento com elegância e sobriedade.
 * Elimina duplicações de badges genéricos e apresenta cada papel uma única vez.
 */
export function RoleBadge({ papel, className = "" }: RoleBadgeProps) {
  const rawPapel = (papel || "Convidado").trim();
  const lower = rawPapel.toLowerCase();

  // Tratamento de Fornecedor
  if (lower.startsWith("fornecedor")) {
    let detalhe = "";
    if (rawPapel.includes("·")) {
      detalhe = rawPapel.split("·")[1]?.trim() || "";
    } else if (rawPapel.includes("(")) {
      detalhe = rawPapel.replace(/fornecedor\s*\(/i, "").replace(/\)/g, "").trim();
    } else if (rawPapel.includes("-")) {
      detalhe = rawPapel.split("-")[1]?.trim() || "";
    }

    const textoFinal = detalhe ? `Fornecedor · ${detalhe}` : "Fornecedor · Equipe";

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-medium bg-[#F3EEFF] text-[#4E2A84] border border-[#DDD0FA] tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/70 flex-shrink-0" aria-hidden="true" />
        <span>{textoFinal}</span>
      </span>
    );
  }

  // Padrinho / Madrinha
  if (lower.includes("padrinho") || lower.includes("madrinha")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-semibold bg-[#FBF7ED] text-[#7A5B0B] border border-[#EDE2C4] tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" aria-hidden="true" />
        <span>{rawPapel}</span>
      </span>
    );
  }

  // Noivos
  if (lower.includes("noivo") || lower.includes("noiva")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-semibold bg-[#F5EDE8] text-[#543022] border border-[#DFCEBF] tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#9E5A38] flex-shrink-0" aria-hidden="true" />
        <span>{rawPapel}</span>
      </span>
    );
  }

  // Pais / Mãe / Pai
  if (lower.includes("pai") || lower.includes("mãe") || lower.includes("mae")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-medium bg-[#F7F2EB] text-[#594436] border border-[#DDD2C5] tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#8C6D58] flex-shrink-0" aria-hidden="true" />
        <span>{rawPapel}</span>
      </span>
    );
  }

  // Cortejo infanto-juvenil: Daminha, Pajem, Florista, Mademoiselle
  if (
    lower.includes("daminha") ||
    lower.includes("pajem") ||
    lower.includes("florista") ||
    lower.includes("mademoiselle") ||
    lower.includes("demoiselle")
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-medium bg-[#F9F4F0] text-[#6B4B38] border border-[#E8DCD1] tracking-wide ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#B28268] flex-shrink-0" aria-hidden="true" />
        <span>{rawPapel}</span>
      </span>
    );
  }

  // Convidado (padrão discreto, elegante e limpo)
  if (lower === "convidado" || lower === "convidado comum") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-normal text-[#543D30] bg-[#FAF7F2] border border-[#E8DFD5] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#B8A89A] flex-shrink-0" aria-hidden="true" />
        <span>Convidado</span>
      </span>
    );
  }

  // Qualquer outro papel cadastrado no sistema (genérico, extensível e elegante)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-sans font-medium text-[#4A3B32] bg-[#FAF7F2] border border-[#E3D8CB] ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#9E8B7C] flex-shrink-0" aria-hidden="true" />
      <span>{rawPapel}</span>
    </span>
  );
}
