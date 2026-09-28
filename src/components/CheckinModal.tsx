import React, { useEffect } from "react";

/**
 * CheckinModal legado: Todas as funcionalidades foram unificadas no Painel Administrativo (AdminPage.tsx).
 * Este componente mantém redirecionamento retrocompatível transparente caso algum evento antigo seja emitido.
 */
export default function CheckinModal() {
  useEffect(() => {
    const handleLegacyOpen = () => {
      window.location.hash = "admin";
      window.dispatchEvent(new CustomEvent("open-admin-panel"));
    };

    window.addEventListener("open-recepcao-modal", handleLegacyOpen);
    window.addEventListener("open-checkin-modal", handleLegacyOpen);

    return () => {
      window.removeEventListener("open-recepcao-modal", handleLegacyOpen);
      window.removeEventListener("open-checkin-modal", handleLegacyOpen);
    };
  }, []);

  return null;
}
