import React from "react";

export default function Footer() {
  return (
    <>
    <footer id="inv-footer" aria-label="Mensagem de encerramento do casal" className="flex flex-col items-center">
      
      {/* New Ornament provided by user */}
      <div className="mb-12 w-48 opacity-60">
        <img src="assets/images/ornament.png" alt="Ornamento" className="w-full h-auto" />
      </div>

      <p>Esperamos você</p>
      <p>para viver este momento conosco.</p>

      <p className="footer-sub mt-12">Com carinho,</p>
      <div className="footer-signature">
        <span id="footer-bride" className="signature-name"></span>
        <span className="signature-amp" aria-hidden="true">&amp;</span>
        <span id="footer-groom" className="signature-name"></span>
      </div>
      <p className="footer-date" id="footer-date"></p>
    </footer>
    </>
  );
}
