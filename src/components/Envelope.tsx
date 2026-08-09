import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import OldLayout from './OldLayout';
import seloSvg from '../assets/selo.svg';

interface EnvelopeProps {
  onAnimationComplete: () => void;
}

export default function Envelope({ onAnimationComplete }: EnvelopeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const letterWrapperRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const instructionRef = useRef<HTMLDivElement>(null);
  
  const [isOpened, setIsOpened] = useState(false);

  // Textura de papel algodão extremamente sutil (noise orgânico, sem padrão visível)
  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E")`;

  useGSAP(() => {
    gsap.set(envelopeRef.current, { perspective: 4000, transformStyle: "preserve-3d" });
    gsap.set(flapRef.current, { transformOrigin: "top center", rotateX: 0, transformStyle: "preserve-3d", zIndex: 40 });
    gsap.set(letterWrapperRef.current, { yPercent: 0, zIndex: 10 });
    gsap.set(letterRef.current, { scale: 0.35, transformOrigin: "center center" });
    gsap.set(containerRef.current, { scale: 1 });
  }, { scope: containerRef });

  const handleOpen = () => {
    if (isOpened) return;
    setIsOpened(true);

    const tl = gsap.timeline();

    // Movimentos mais lentos e naturais, simulando o peso do papel físico
    tl.to(instructionRef.current, { opacity: 0, duration: 1.5, ease: "power2.inOut" }, 0);
    tl.to(envelopeRef.current, { scale: 0.985, duration: 0.6, ease: "power2.out" }, 0);
    tl.to(envelopeRef.current, { scale: 1, duration: 1.2, ease: "power2.inOut" }, 0.6);
      
    tl.to(flapRef.current, { rotateX: 180, duration: 4.0, ease: "power2.inOut" }, 1.2);
    
    tl.set(flapRef.current, { zIndex: 0 }, 3.2);

    tl.to(letterWrapperRef.current, { y: "-60vh", duration: 5.0, ease: "power2.inOut" }, 4.5);
    
    tl.to(envelopeRef.current, { y: "120vh", opacity: 0, duration: 4.0, ease: "power2.inOut" }, 7.5);
    
    tl.to(letterRef.current, { scale: 1, duration: 4.5, ease: "power3.inOut" }, 7.5);
    
    tl.to(containerRef.current, { scale: 1.03, duration: 12.0, ease: "power1.inOut" }, 0);

    tl.set(containerRef.current, { display: "none" }, 12.5);
    tl.call(onAnimationComplete, undefined, 12.5);
  };

  return (
    <>
      <div className="fixed inset-0 z-[40] pointer-events-none flex items-center justify-center overflow-hidden">
        <div ref={letterWrapperRef} className="absolute flex justify-center items-center w-full h-full">
          <div ref={letterRef} className="w-screen h-[100dvh] shadow-2xl overflow-hidden pointer-events-auto bg-[#F6F2EA] will-change-transform rounded-sm">
            <OldLayout />
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center will-change-transform"
        style={{ background: "radial-gradient(circle at center, #23211f 0%, #080808 100%)" }}
      >
        <div 
          ref={envelopeRef}
          className="relative w-[92vw] max-w-[480px] h-[85dvh] max-h-[780px] cursor-pointer drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)] will-change-transform"
          onClick={handleOpen}
        >
          {/* Fundo interno do envelope (Corpo) - Off-white #F6F2EA */}
          <div className="absolute inset-0 overflow-hidden rounded-md" style={{ backgroundColor: "#F6F2EA" }}>
             <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: noiseTexture }}></div>
             {/* Sombra de profundidade interna para dar dimensão à cavidade */}
             <div className="absolute inset-0 shadow-[inset_0_30px_60px_rgba(0,0,0,0.15)] mix-blend-multiply pointer-events-none"></div>
          </div>
          
          {/* Aba Esquerda - #F4EFE6 (Quente, recebe luz direta) */}
          <div 
            className="absolute top-0 left-0 w-[55%] h-full z-10 pointer-events-none drop-shadow-[1px_0_1px_rgba(255,255,255,0.7)] drop-shadow-[4px_0_12px_rgba(0,0,0,0.06)]"
            style={{
              clipPath: "polygon(0 0, 100% 50%, 0 100%)",
              background: `radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.6) 0%, transparent 60%), linear-gradient(to right, #F4EFE6 0%, #EFE8DB 90%, #E3D9C9 100%)`
            }}
          >
             <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: noiseTexture }}></div>
          </div>

          {/* Aba Direita - #EFE8DB (Ligeiramente mais escura, na sombra) */}
          <div 
            className="absolute top-0 right-0 w-[55%] h-full z-10 pointer-events-none drop-shadow-[-1px_0_0_rgba(255,255,255,0.3)] drop-shadow-[-4px_0_12px_rgba(0,0,0,0.08)]"
            style={{
              clipPath: "polygon(100% 0, 0 50%, 100% 100%)",
              background: `radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.1) 0%, transparent 70%), linear-gradient(to left, #EFE8DB 0%, #E3DBCB 90%, #D4C9B5 100%)`
            }}
          >
             <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: noiseTexture }}></div>
          </div>

          {/* Aba Inferior (Frente) - Mistura para transição suave */}
          <div 
            className="absolute bottom-0 left-0 w-full h-[65%] z-20 pointer-events-none drop-shadow-[0_-1px_1px_rgba(255,255,255,0.5)] drop-shadow-[0_-6px_15px_rgba(0,0,0,0.07)]"
            style={{
              clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
              background: `radial-gradient(ellipse at 50% 70%, rgba(255,255,255,0.4) 0%, transparent 75%), linear-gradient(to top, #F6F2EA 0%, #EFE8DB 75%, #DFD5C2 100%)`
            }}
          >
            <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: noiseTexture }}></div>
            {/* Sombra de oclusão sutil vinda da aba superior */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/5"></div>
          </div>

          {/* Top Flap Wrapper (rotates in 3D) */}
          <div ref={flapRef} className="absolute top-0 left-0 w-full h-[55%] origin-top z-40 will-change-transform drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] drop-shadow-[0_6px_20px_rgba(0,0,0,0.12)]" style={{ transformStyle: 'preserve-3d' }}>
            
            {/* Aba Superior - #F8F5EE (Marfim mais claro, mais iluminada) */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                background: `radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.7) 0%, transparent 70%), linear-gradient(to bottom, #F8F5EE 0%, #F4EFE6 70%, #E3D9C9 100%)`
              }}
            >
              <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: noiseTexture }}></div>
            </div>
            
            {/* Selo (Letterpress / Hot Foil Emboss) */}
            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] flex items-center justify-center" style={{ transform: 'translate3d(-50%, -50%, 1px)' }}>
              
              <img 
                src={seloSvg} 
                alt="Brasão em Relevo" 
                className="w-full h-full object-contain pointer-events-none relative z-10" 
                style={{ 
                  /* Letterpress Deboss Effect: 
                     1. White drop shadow below (highlight on paper edge)
                     2. Dark drop shadow above (shadow from paper edge) 
                     3. Multiply blend mode to merge with paper texture */
                  filter: 'drop-shadow(0px 1.5px 1px rgba(255, 255, 255, 0.8)) drop-shadow(0px -1px 1px rgba(0, 0, 0, 0.15)) brightness(0.92) contrast(1.1)',
                  mixBlendMode: 'multiply',
                  opacity: 0.9
                }}
              />
              
              {/* Reflexo metálico fosco sobre o brasão */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-[#F3EFE6]/10 to-transparent pointer-events-none z-20 mix-blend-overlay"></div>
            </div>
          </div>
        </div>

        <div 
          ref={instructionRef}
          className="absolute bottom-[8%] left-0 w-full text-center flex flex-col items-center gap-2"
        >
          {/* Animação sutil de pulso para indicar clique sem texto agressivo */}
          <div className="w-1 h-1 rounded-full bg-[#D4C394]/40 animate-ping"></div>
          <p style={{ fontFamily: "var(--font-serif), Georgia, serif" }} className="text-[#D8CDBB] text-[0.7rem] tracking-[0.4em] opacity-35 uppercase drop-shadow-sm font-light">
            Toque para abrir
          </p>
        </div>
      </div>
    </>
  );
}
