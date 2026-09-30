import React from "react";

export default function ActionsSection() {
  return (
    <>
      <section id="sec-actions" aria-labelledby="actions-heading">
      <h3 className="sec-title" id="actions-heading" data-aos="fade-up">Ações</h3>

      <div className="editorial-list">

        <button 
          id="btn-rsvp-modal" 
          type="button"
          className="editorial-link" 
          data-aos="fade-up" 
          data-aos-delay="0"
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new Event('open-rsvp-modal'));
          }}
        >
          <div className="flex flex-col items-start text-left">
            <span className="ed-link-text">Confirmar Presença</span>
            <span className="text-[0.66rem] tracking-[0.2em] uppercase text-[#7A5E44] mt-1 font-sans font-medium">
              Até 23 de dezembro de 2026
            </span>
          </div>
          <span className="ed-link-arrow">&rarr;</span>
        </button>

        <a id="btn-maps" href="#" className="editorial-link" target="_blank" rel="noopener noreferrer" data-aos="fade-up" data-aos-delay="60">
          <span className="ed-link-text">Como Chegar</span>
          <span className="ed-link-arrow">&rarr;</span>
        </a>

        <button id="btn-gifts-react" className="editorial-link" data-aos="fade-up" data-aos-delay="120" onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event('open-gifts-modal'));
        }}>
          <span className="ed-link-text">Presentes</span>
          <span className="ed-link-arrow">&rarr;</span>
        </button>

        <a id="btn-calendar" href="#" className="editorial-link" target="_blank" rel="noopener noreferrer" data-aos="fade-up" data-aos-delay="180">
          <span className="ed-link-text">Salvar na Agenda</span>
          <span className="ed-link-arrow">&rarr;</span>
        </a>

      </div>
    </section>

    <div className="section-divider" aria-hidden="true">✦</div>
    </>
  );
}
