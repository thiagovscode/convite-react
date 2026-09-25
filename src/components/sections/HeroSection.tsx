import React from "react";

export default function HeroSection() {
  return (
    <>
      <section
        id="hero-editorial"
        className="w-full relative overflow-hidden flex flex-col items-center pb-16"
        style={{ background: 'var(--off-white)' }}
      >
        
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-multiply" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>

        {/* Full Bleed Hero Image — seamless fade to off-white */}
        <div className="relative w-full z-10" data-aos="fade-in" data-aos-duration="1500">
          
          <div className="w-full" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}>
            <img 
              id="couple-photo"
              src="assets/images/couple.jpg"
              alt="Tainara e Thiago"
              loading="eager"
              className="w-full h-auto object-cover block"
            />
          </div>
        </div>

        {/* Typography & Content */}
        <div className="w-full max-w-[600px] flex flex-col items-center text-center relative z-10 pt-16 px-6">
          
          {/* Date */}
          <p
            className="uppercase mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.72rem',
              letterSpacing: '0.4em',
              color: '#5C4437',
              fontWeight: 500,
            }}
            data-aos="fade-up"
            data-aos-delay="200"
          >
            24 de Janeiro de 2027
          </p>

          {/* Names */}
          <div className="flex flex-col items-center gap-2 mb-10" data-aos="fade-up" data-aos-delay="300">
            <h1
              id="bride-name"
              className="name-script text-fluid-h1 leading-[0.85] m-0"
              style={{ fontFamily: 'var(--font-script)', color: '#2E1E17' }}
            ></h1>
            <span
              className="italic text-3xl md:text-4xl my-4"
              style={{ fontFamily: 'var(--font-serif)', color: '#7A5E44', opacity: 0.75 }}
            >&amp;</span>
            <h2
              id="groom-name"
              className="name-script text-fluid-h1 leading-[0.85] m-0"
              style={{ fontFamily: 'var(--font-script)', color: '#2E1E17' }}
            ></h2>
          </div>

          {/* Ornament line */}
          <div
            className="mb-12"
            style={{ width: '56px', height: '1.5px', background: '#B8A594' }}
            data-aos="fade-up"
            data-aos-delay="400"
          ></div>

          {/* Bible Verse */}
          <div className="max-w-[420px] mb-12" data-aos="fade-up" data-aos-delay="500">
            <blockquote
              id="verse-text"
              className="mb-5"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.15rem',
                fontStyle: 'italic',
                color: '#3D2C22',
                lineHeight: 1.9,
                fontWeight: 400,
              }}
            >
            </blockquote>
            <cite
              id="verse-ref"
              className="uppercase not-italic"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.65rem',
                letterSpacing: '0.35em',
                color: '#5C4437',
                fontWeight: 500,
              }}
            >
            </cite>
          </div>

          {/* Invite Text */}
          <div
            className="max-w-[380px]"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.05rem',
              lineHeight: 1.9,
              color: '#3D2C22',
              fontWeight: 400,
            }}
            data-aos="fade-up"
            data-aos-delay="600"
          >
            <p>Com muita alegria, convidamos você para celebrar o início da nossa nova história.</p>
            <p
              className="mt-5"
              style={{ fontStyle: 'italic', color: '#5C4437', fontSize: '1rem', fontWeight: 500 }}
            >Sua presença tornará este dia ainda mais especial.</p>
          </div>

        </div>

      </section>

      {/* Ornament divider */}
      <div
        className="w-full flex justify-center py-16"
        style={{ background: 'var(--off-white)' }}
        aria-hidden="true"
      >
        <span style={{ color: 'var(--gold-dark)', opacity: 0.35, fontSize: '1.1rem' }}>✦</span>
      </div>
    </>
  );
}
