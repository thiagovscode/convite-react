import React from "react";

export default function CountdownSection() {
  return (
    <>
      <section id="sec-countdown" className="w-full text-center relative z-10 pt-4" aria-labelledby="countdown-heading">
        <h3 className="sec-title" id="countdown-heading" data-aos="fade-up">
          Contagem Regressiva
        </h3>

        <div id="countdown" role="timer" aria-live="polite" aria-label="Contagem regressiva até o casamento">
          <div className="cd-unit" data-aos="zoom-in" data-aos-delay="0">
            <div className="cd-flip-wrapper" style={{ borderColor: '#B8A594' }}>
              <span className="cd-number" id="cd-days" style={{ color: '#2E1E17' }}>00</span>
            </div>
            <span className="cd-label" style={{ color: '#5C4437', fontWeight: 600 }}>Dias</span>
          </div>
          <span className="cd-sep" aria-hidden="true" style={{ color: '#7A5E44', opacity: 0.8 }}>:</span>
          <div className="cd-unit" data-aos="zoom-in" data-aos-delay="80">
            <div className="cd-flip-wrapper" style={{ borderColor: '#B8A594' }}>
              <span className="cd-number" id="cd-hours" style={{ color: '#2E1E17' }}>00</span>
            </div>
            <span className="cd-label" style={{ color: '#5C4437', fontWeight: 600 }}>Horas</span>
          </div>
          <span className="cd-sep" aria-hidden="true" style={{ color: '#7A5E44', opacity: 0.8 }}>:</span>
          <div className="cd-unit" data-aos="zoom-in" data-aos-delay="160">
            <div className="cd-flip-wrapper" style={{ borderColor: '#B8A594' }}>
              <span className="cd-number" id="cd-minutes" style={{ color: '#2E1E17' }}>00</span>
            </div>
            <span className="cd-label" style={{ color: '#5C4437', fontWeight: 600 }}>Minutos</span>
          </div>
          <span className="cd-sep" aria-hidden="true" style={{ color: '#7A5E44', opacity: 0.8 }}>:</span>
          <div className="cd-unit" data-aos="zoom-in" data-aos-delay="240">
            <div className="cd-flip-wrapper" style={{ borderColor: '#B8A594' }}>
              <span className="cd-number" id="cd-seconds" style={{ color: '#2E1E17' }}>00</span>
            </div>
            <span className="cd-label" style={{ color: '#5C4437', fontWeight: 600 }}>Segundos</span>
          </div>
        </div>
      </section>

      {/* Detalhe decorativo com bom contraste e espaçamento */}
      <div className="w-full flex justify-center py-16 md:py-20" aria-hidden="true">
        <span style={{ color: '#7A5E44', opacity: 0.8, fontSize: '1.2rem' }}>✦</span>
      </div>
    </>
  );
}