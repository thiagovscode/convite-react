import React from "react";

export default function HeroSection() {
  return (
    <>
      <section id="hero-editorial" className="w-full min-h-[100dvh] bg-[#FAF7F2] relative overflow-hidden flex flex-col items-center justify-center pt-24 pb-16 px-6">
        
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>

        {/* 1. Brasão PNG as a subtle watermark or header */}
        <div className="mb-12 w-32 md:w-40 opacity-30 relative z-10" data-aos="fade-up" data-aos-duration="1000">
          <img src="assets/images/brasao.png" alt="Brasão" className="w-full h-auto drop-shadow-sm" />
        </div>

        {/* 2. Fine Art Photography (Unified, centered) */}
        <div className="w-full max-w-[600px] aspect-[4/5] relative z-10 mb-16" data-aos="fade-up" data-aos-duration="1200" data-aos-delay="100">
          {/* Sombra orgânica e máscara para parecer impresso direto no papel */}
          <div className="relative w-full h-full bg-[#FFFFFF] p-4 md:p-6  border border-black/5">
            <img 
              id="couple-photo"
              src="assets/images/couple.jpg"
              alt="Tainara e Thiago"
              loading="eager"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 3. Typography & Content (Unified stack) */}
        <div className="w-full max-w-[600px] flex flex-col items-center text-center relative z-10">
          
          {/* Date */}
          <p className="font-sans uppercase tracking-[0.35em] text-[0.7rem] text-[#8C7A5A] mb-8 font-medium" data-aos="fade-up" data-aos-delay="200">
            24 de Janeiro de 2027
          </p>

          {/* Names */}
          <div className="flex flex-col items-center gap-2 mb-10" data-aos="fade-up" data-aos-delay="300">
            <h1 id="bride-name" className="name-script text-7xl md:text-8xl lg:text-[7rem] text-[#3A352F] leading-[0.8] m-0" style={{ fontFamily: 'var(--font-script)' }}></h1>
            <span className="font-serif italic text-3xl md:text-4xl text-[#CBAA71] opacity-70 my-3">&amp;</span>
            <h2 id="groom-name" className="name-script text-7xl md:text-8xl lg:text-[7rem] text-[#3A352F] leading-[0.8] m-0" style={{ fontFamily: 'var(--font-script)' }}></h2>
          </div>

          {/* Gold Ornament */}
          <div className="w-12 h-[1px] bg-[#CBAA71] opacity-40 mb-12" data-aos="fade-up" data-aos-delay="400"></div>

          {/* Bible Verse */}
          <div className="max-w-[380px] mb-12" data-aos="fade-up" data-aos-delay="500">
            <blockquote id="verse-text" className="font-serif italic text-[#6B6356] text-[1.1rem] leading-relaxed mb-4">
            </blockquote>
            <cite id="verse-ref" className="font-sans uppercase tracking-widest text-[0.65rem] text-[#9A9182] font-semibold not-italic">
            </cite>
          </div>

          {/* Invite Text */}
          <div className="font-serif text-[#4A443B] text-[0.95rem] leading-loose max-w-[380px]" data-aos="fade-up" data-aos-delay="600">
            <p>Com muita alegria, convidamos você para celebrar o início da nossa nova história.</p>
            <p className="mt-5 italic text-[#8C7A5A] text-[0.95rem]">Sua presença tornará este dia ainda mais especial.</p>
          </div>

        </div>

      </section>

      <div className="w-full flex justify-center py-16 bg-[#FAF7F2]" aria-hidden="true">
        <span className="text-[#CBAA71] opacity-30 text-xl">✦</span>
      </div>
    </>
  );
}
