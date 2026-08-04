import React from "react";

export default function CountdownSection() {
  return (
    <>
      <section id="sec-countdown" aria-labelledby="countdown-heading">
      <h3 className="sec-title" id="countdown-heading" data-aos="fade-up">Contagem Regressiva</h3>

      <div id="countdown" role="timer" aria-live="polite" aria-label="Contagem regressiva até o casamento">
        <div className="cd-unit" data-aos="zoom-in" data-aos-delay="0">
          <div className="cd-flip-wrapper">
            <span className="cd-number" id="cd-days">00</span>
          </div>
          <span className="cd-label">Dias</span>
        </div>
        <span className="cd-sep" aria-hidden="true">:</span>
        <div className="cd-unit" data-aos="zoom-in" data-aos-delay="80">
          <div className="cd-flip-wrapper">
            <span className="cd-number" id="cd-hours">00</span>
          </div>
          <span className="cd-label">Horas</span>
        </div>
        <span className="cd-sep" aria-hidden="true">:</span>
        <div className="cd-unit" data-aos="zoom-in" data-aos-delay="160">
          <div className="cd-flip-wrapper">
            <span className="cd-number" id="cd-minutes">00</span>
          </div>
          <span className="cd-label">Minutos</span>
        </div>
        <span className="cd-sep" aria-hidden="true">:</span>
        <div className="cd-unit" data-aos="zoom-in" data-aos-delay="240">
          <div className="cd-flip-wrapper">
            <span className="cd-number" id="cd-seconds">00</span>
          </div>
          <span className="cd-label">Segundos</span>
        </div>
      </div>
    </section>

    <div className="section-divider" aria-hidden="true">✦</div>

    {/**/}
    </>
  );
}