import React from "react";

export default function HeroSection() {
  return (
    <>
      <section id="hero-editorial" className="w-full bg-[#F8F5EE] relative overflow-hidden flex flex-col items-center pb-16">
        
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>

        {/* Full Bleed Hero Image with Top Crest and Seamless Fade */}
        <div className="relative w-full z-10" data-aos="fade-in" data-aos-duration="1500">
          
          {/* Image wrapper with CSS Mask for perfect fade to background */}
          <div className="w-full" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}>
            <img 
              id="couple-photo"
              src="assets/images/couple.jpg"
              alt="Tainara e Thiago"
              loading="eager"
              className="w-full h-auto object-cover block"
            />
          </div>
          
          {/* Brasão PNG overlaid at the top center. 
              Outer div handles absolute positioning, inner div handles AOS animation 
              so they don't fight over the CSS 'transform' property. */}
          <div className="absolute top-10 md:top-14 left-1/2 -translate-x-1/2 w-[20%] md:w-[18%] lg:w-[16%] z-20">
            <div data-aos="zoom-in" data-aos-duration="1200" data-aos-delay="200">
              <img src="assets/images/brasao.png" alt="Brasão" className="w-full h-auto drop-shadow-md" />
            </div>
          </div>
        </div>

        {/* Typography & Content (Unified stack) */}
        <div className="w-full max-w-[600px] flex flex-col items-center text-center relative z-10 pt-16 px-6">
          
          {/* Date */}
          <p className="font-sans uppercase tracking-[0.35em] text-[0.7rem] text-[#B8AA95] mb-8 font-medium" data-aos="fade-up" data-aos-delay="200">
            24 de Janeiro de 2027
          </p>

          {/* Names */}
          <div className="flex flex-col items-center gap-2 mb-10" data-aos="fade-up" data-aos-delay="300">
            <h1 id="bride-name" className="name-script text-fluid-h1 text-[#2F2B27] leading-[0.8] m-0" style={{ fontFamily: 'var(--font-script)' }}></h1>
            <span className="font-serif italic text-3xl md:text-4xl text-[#D8CDBB] opacity-70 my-3">&amp;</span>
            <h2 id="groom-name" className="name-script text-fluid-h1 text-[#2F2B27] leading-[0.8] m-0" style={{ fontFamily: 'var(--font-script)' }}></h2>
          </div>

          {/* Gold Ornament */}
          <div className="w-12 h-[1px] bg-[#D8CDBB] opacity-40 mb-12" data-aos="fade-up" data-aos-delay="400"></div>

          {/* Bible Verse */}
          <div className="max-w-[380px] mb-12" data-aos="fade-up" data-aos-delay="500">
            <blockquote id="verse-text" className="font-serif italic text-[#5F574D] text-[1.1rem] leading-relaxed mb-4">
            </blockquote>
            <cite id="verse-ref" className="font-sans uppercase tracking-widest text-[0.65rem] text-[#B8AA95] font-semibold not-italic">
            </cite>
          </div>

          {/* Invite Text */}
          <div className="font-serif text-[#5F574D] text-[0.95rem] leading-loose max-w-[380px]" data-aos="fade-up" data-aos-delay="600">
            <p>Com muita alegria, convidamos você para celebrar o início da nossa nova história.</p>
            <p className="mt-5 italic text-[#B8AA95] text-[0.95rem]">Sua presença tornará este dia ainda mais especial.</p>
          </div>

        </div>

      </section>

      <div className="w-full flex justify-center py-16 bg-[#F8F5EE]" aria-hidden="true">
        <span className="text-[#D8CDBB] opacity-30 text-xl">✦</span>
      </div>
    </>
  );
}
