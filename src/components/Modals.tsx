import React from "react";

export default function Modals() {
  return (
    <>
      {/* Modals and Audio */}
  <div id="lightbox" role="dialog" aria-modal="true" aria-label="Visualizar foto em tela cheia" hidden>
    <div id="lightbox-backdrop"></div>
    <div id="lightbox-inner">
      <button id="lb-close" aria-label="Fechar"><i className="fas fa-xmark" aria-hidden="true"></i></button>
      <button id="lb-prev"  aria-label="Foto anterior"><i className="fas fa-chevron-left" aria-hidden="true"></i></button>
      <img id="lb-img" src="" alt="" loading="lazy" />
      <button id="lb-next"  aria-label="Próxima foto"><i className="fas fa-chevron-right" aria-hidden="true"></i></button>
    </div>
  </div>
  
  <div id="pix-modal" role="dialog" aria-modal="true" aria-label="Opções de Presente" hidden>
    <div id="pix-modal-backdrop"></div>
    <div id="pix-modal-wrapper" style={{maxWidth: '680px'}}>
      <div id="pix-modal-content">
        <button id="pix-modal-close" aria-label="Fechar modal"><i className="fas fa-xmark" aria-hidden="true"></i></button>
        
        <div className="pix-modal-header">
          <i className="fas fa-gift pix-header-icon" aria-hidden="true"></i>
          <h3>Presentear os Noivos</h3>
          <p className="pix-sub">Escolha a forma como deseja nos presentear. Agradecemos imensamente pelo carinho!</p>
        </div>
  
        <div className="gifts-options-grid">
          <div className="gift-option-card">
            <h4>Lista de Presentes</h4>
            <p className="gift-card-desc">Escolha um presente em nossa lista virtual de casamento.</p>
            <a id="gifts-list-link" href="#" className="gift-action-btn" target="_blank" rel="noopener noreferrer">
              <span>Ver Lista</span>
            </a>
          </div>
  
          <div className="gift-divider-vertical" aria-hidden="true"></div>
  
          <div className="gift-option-card">
            <h4>Contribuição via PIX</h4>
            <p className="gift-card-desc" style={{marginBottom: '14px'}}>Caso prefira, você também pode contribuir com qualquer valor.</p>
            
            <div className="pix-qrcode-wrapper">
              <div className="pix-frame-decor"></div>
              <img id="pix-qr-img" src="assets/images/pix_qr.png" alt="QR Code Pix" loading="lazy" />
            </div>
  
            <div className="pix-data-wrapper">
              <span className="pix-label">Chave Pix</span>
              <div className="pix-key-box">
                <span id="pix-key-text">carregando...</span>
                <button id="btn-copy-pix" aria-label="Copiar chave Pix">
                  <i className="far fa-copy" aria-hidden="true"></i>
                </button>
              </div>
              <span className="pix-name-label">Titular: <strong id="pix-name-text">carregando...</strong></span>
            </div>
          </div>
        </div>
  
        <div id="copy-toast" aria-live="polite" style={{display: 'none'}}>
          <i className="fas fa-check-circle" aria-hidden="true"></i> Chave Copiada!
        </div>
      </div>
    </div>
  </div>
  
  <audio id="bg-music" loop preload="none" aria-hidden="true">
     <source src="assets/music/background.mp3" type="audio/mpeg" />
  </audio>
    </>
  );
}