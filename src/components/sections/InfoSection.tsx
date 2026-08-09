import React from "react";

export default function InfoSection() {
  return (
    <>
      <section id="sec-info" aria-labelledby="info-heading">
      <h3 className="sec-title" id="info-heading" data-aos="fade-up">Informações</h3>

      <div className="editorial-list">
        
        <div className="editorial-row" data-aos="fade-up" data-aos-delay="0">
          <span className="ed-label">Local</span>
          <span className="ed-value" id="info-ceremony"></span>
        </div>

        <div className="editorial-row" data-aos="fade-up" data-aos-delay="60">
          <span className="ed-label">Recepção</span>
          <span className="ed-value" id="info-reception"></span>
        </div>

        <div className="editorial-row" data-aos="fade-up" data-aos-delay="120">
          <span className="ed-label">Traje</span>
          <span className="ed-value" id="info-dress"></span>
        </div>

        <div className="editorial-row" data-aos="fade-up" data-aos-delay="180">
          <span className="ed-label">Estacionamento</span>
          <span className="ed-value" id="info-parking"></span>
        </div>

      </div>
      
      {/* Hidden elements to prevent script.js crash */}
      <div id="info-date" style={{ display: 'none' }}></div>
      <div id="info-time" style={{ display: 'none' }}></div>

    </section>

    <div className="section-divider" aria-hidden="true">✦</div>
    </>
  );
}
