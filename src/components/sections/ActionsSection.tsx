import React from "react";

export default function ActionsSection() {
  return (
    <>
      <section id="sec-actions" aria-labelledby="actions-heading">
      <h3 className="sec-title" id="actions-heading" data-aos="fade-up">Ações</h3>

      <div className="editorial-list">

        <a id="btn-rsvp" href="#" className="editorial-link" target="_blank" rel="noopener noreferrer" data-aos="fade-up" data-aos-delay="0">
          <span className="ed-link-text">Confirmar Presença</span>
          <span className="ed-link-arrow">&rarr;</span>
        </a>

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
