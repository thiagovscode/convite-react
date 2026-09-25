import React from "react";

export default function InfoSection() {
  return (
    <>
      <section id="sec-info" className="w-full max-w-[780px] mx-auto relative z-10 px-2 sm:px-4" aria-labelledby="info-heading">
        <h3 className="sec-title" id="info-heading" data-aos="fade-up">
          Informações
        </h3>

        {/* Estrutura organizada de 2 colunas no desktop e 1 coluna no celular */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 md:gap-x-16 gap-y-8 md:gap-y-10 w-full">
          
          {/* LOCAL */}
          <div 
            className="info-block border-b border-[#B8A594] pb-6 md:pb-8 flex flex-col items-center md:items-start text-center md:text-left" 
            data-aos="fade-up" 
            data-aos-delay="0"
          >
            <span className="font-display text-[0.74rem] md:text-[0.78rem] tracking-[0.28em] uppercase text-[#5C4437] font-semibold mb-2">
              Local
            </span>
            <div 
              className="font-serif text-[1.2rem] md:text-[1.28rem] text-[#2E1E17] leading-relaxed font-normal" 
              id="info-ceremony"
            >
              Espaço Balboa<br />
              <span className="text-[1.02rem] text-[#523D32] italic font-normal">Mairiporã — SP</span>
            </div>
          </div>

          {/* RECEPÇÃO */}
          <div 
            className="info-block border-b border-[#B8A594] pb-6 md:pb-8 flex flex-col items-center md:items-start text-center md:text-left" 
            data-aos="fade-up" 
            data-aos-delay="60"
          >
            <span className="font-display text-[0.74rem] md:text-[0.78rem] tracking-[0.28em] uppercase text-[#5C4437] font-semibold mb-2">
              Recepção
            </span>
            <div 
              className="font-serif text-[1.2rem] md:text-[1.28rem] text-[#2E1E17] leading-relaxed font-normal" 
              id="info-reception"
            >
              A partir das 15h30,<br />
              para o pessoal ir chegando.
            </div>
          </div>

          {/* TRAJE */}
          <div 
            className="info-block border-b border-[#B8A594] pb-6 md:pb-8 flex flex-col items-center md:items-start text-center md:text-left" 
            data-aos="fade-up" 
            data-aos-delay="120"
          >
            <span className="font-display text-[0.74rem] md:text-[0.78rem] tracking-[0.28em] uppercase text-[#5C4437] font-semibold mb-2">
              Traje
            </span>
            <div 
              className="font-serif text-[1.2rem] md:text-[1.28rem] text-[#2E1E17] leading-relaxed font-normal" 
              id="info-dress"
            >
              Esporte Fino
            </div>
          </div>

          {/* ESTACIONAMENTO */}
          <div 
            className="info-block border-b border-[#B8A594] pb-6 md:pb-8 flex flex-col items-center md:items-start text-center md:text-left" 
            data-aos="fade-up" 
            data-aos-delay="180"
          >
            <span className="font-display text-[0.74rem] md:text-[0.78rem] tracking-[0.28em] uppercase text-[#5C4437] font-semibold mb-2">
              Estacionamento
            </span>
            <div 
              className="font-serif text-[1.18rem] md:text-[1.25rem] text-[#2E1E17] leading-relaxed font-normal" 
              id="info-parking"
            >
              Estacionamento gratuito disponível no local
            </div>
          </div>

        </div>

        {/* Hidden elements to prevent script.js crash if queried */}
        <div id="info-date" style={{ display: 'none' }}></div>
        <div id="info-time" style={{ display: 'none' }}></div>
      </section>

      {/* Detalhe decorativo com bom contraste e espaço */}
      <div className="w-full flex justify-center py-16 md:py-20" aria-hidden="true">
        <span style={{ color: '#7A5E44', opacity: 0.8, fontSize: '1.2rem' }}>✦</span>
      </div>
    </>
  );
}
