import React, { useState, useEffect } from "react";

const funGifts = [
  { id: 1, title: 'Jantar Romântico nas Maldivas', price: 'R$ 500,00', icon: '🍽️' },
  { id: 2, title: 'Passeio de Camelo', price: 'R$ 200,00', icon: '🐪' },
  { id: 3, title: 'Drink na Beira da Praia', price: 'R$ 80,00', icon: '🍹' },
  { id: 4, title: 'Massagem Relaxante para o Casal', price: 'R$ 350,00', icon: '💆‍♂️' },
  { id: 5, title: 'Cota Lua de Mel', price: 'R$ 1.000,00', icon: '✈️' },
  { id: 6, title: 'Café da Manhã no Quarto', price: 'R$ 150,00', icon: '🥞' },
];

export default function Modals() {
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'fun' | 'pix'>('menu');
  
  // Data state
  const [pixKey, setPixKey] = useState('carregando...');
  const [pixName, setPixName] = useState('carregando...');
  const [pixQr, setPixQr] = useState('assets/images/pix_qr.png');
  const [amazonLink, setAmazonLink] = useState('#');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Retrieve data from config.js global object
    const checkWedding = setInterval(() => {
      const w = (window as any).wedding;
      if (w && w.pix) {
        setPixKey(w.pix.key);
        setPixName(w.pix.name);
        setPixQr(w.pix.qrCode);
        setAmazonLink(w.gifts);
        clearInterval(checkWedding);
      }
    }, 100);

    const handleOpen = () => {
      setIsGiftsOpen(true);
      setView('menu');
      document.body.style.overflow = 'hidden';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGiftsOpen(false);
        document.body.style.overflow = '';
      }
    };

    window.addEventListener('open-gifts-modal', handleOpen);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-gifts-modal', handleOpen);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(checkWedding);
    };
  }, []);

  const close = () => {
    setIsGiftsOpen(false);
    document.body.style.overflow = '';
    // Reset view slightly after closing animation
    setTimeout(() => setView('menu'), 300);
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    });
  };

  return (
    <>
      {/* Lightbox for Gallery (controlled by script.js) */}
      <div id="lightbox" role="dialog" aria-modal="true" aria-label="Visualizar foto em tela cheia" hidden>
        <div id="lightbox-backdrop"></div>
        <div id="lightbox-inner">
          <button id="lb-close" aria-label="Fechar"><i className="fas fa-xmark" aria-hidden="true"></i></button>
          <button id="lb-prev"  aria-label="Foto anterior"><i className="fas fa-chevron-left" aria-hidden="true"></i></button>
          <img id="lb-img" src="" alt="" loading="lazy" />
          <button id="lb-next"  aria-label="Próxima foto"><i className="fas fa-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>

      {/* REACT CONTROLLED GIFTS MODAL */}
      {isGiftsOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          role="dialog" 
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#1C1008] bg-opacity-80 cursor-pointer animate-fade-in" 
            onClick={close}
          ></div>
          
          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-[680px] max-h-[90vh] bg-white border border-[#C9A84C]/30 rounded-2xl flex flex-col overflow-hidden animate-zoom-in">
            
            {/* Close Button */}
            <button 
              onClick={close}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors z-20"
              aria-label="Fechar modal"
            >
              <i className="fas fa-xmark"></i>
            </button>

            {/* Header */}
            <div className="p-8 pb-4 text-center shrink-0">
              {view !== 'menu' && (
                <button 
                  onClick={() => setView('menu')}
                  className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
              )}
              <i className="fas fa-gift text-3xl text-[#C9A84C] mb-3 animate-pulse"></i>
              <h3 className="font-display text-xl text-[#2F2B27] tracking-widest uppercase mb-2">
                {view === 'menu' && 'Presentear os Noivos'}
                {view === 'fun' && 'Presentes Divertidos'}
                {view === 'pix' && 'Contribuição via PIX'}
              </h3>
              <p className="font-serif text-[#5F574D] text-sm leading-relaxed">
                {view === 'menu' && 'Escolha a forma como deseja nos presentear. Agradecemos imensamente pelo carinho!'}
                {view === 'fun' && 'Ajude-nos a criar memórias incríveis com esses mimos especiais!'}
                {view === 'pix' && 'Caso prefira, você pode contribuir com qualquer valor.'}
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 md:px-10 pb-8 flex-1 custom-scrollbar">
              
              {/* VIEW: MAIN MENU */}
              {view === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* Amazon */}
                  <a 
                    href={amazonLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center text-center p-6 border border-[#C9A84C]/20 hover:bg-[#C9A84C]/5 transition-colors rounded-xl group"
                  >
                    <i className="fab fa-amazon text-2xl text-[#5F574D] group-hover:text-[#C9A84C] mb-3 transition-colors"></i>
                    <h4 className="font-display text-[0.8rem] tracking-widest text-[#2F2B27] uppercase mb-2">Lista Amazon</h4>
                    <p className="font-serif text-[#5F574D] text-xs">Presentes para o nosso novo lar</p>
                  </a>

                  {/* Fun Gifts - Now an external link */}
                  <a 
                    href="#" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center text-center p-6 border border-[#C9A84C]/20 hover:bg-[#C9A84C]/5 transition-colors rounded-xl group"
                  >
                    <i className="fas fa-plane-departure text-2xl text-[#5F574D] group-hover:text-[#C9A84C] mb-3 transition-colors"></i>
                    <h4 className="font-display text-[0.8rem] tracking-widest text-[#2F2B27] uppercase mb-2">Divertidos</h4>
                    <p className="font-serif text-[#5F574D] text-xs">Acesse nossa lista externa</p>
                  </a>

                  {/* PIX */}
                  <button 
                    onClick={() => setView('pix')}
                    className="flex flex-col items-center justify-center text-center p-6 border border-[#C9A84C]/20 hover:bg-[#C9A84C]/5 transition-colors rounded-xl group"
                  >
                    <i className="fab fa-pix text-2xl text-[#5F574D] group-hover:text-[#C9A84C] mb-3 transition-colors"></i>
                    <h4 className="font-display text-[0.8rem] tracking-widest text-[#2F2B27] uppercase mb-2">Via PIX</h4>
                    <p className="font-serif text-[#5F574D] text-xs">Contribua com qualquer valor</p>
                  </button>
                </div>
              )}



              {/* VIEW: PIX */}
              {view === 'pix' && (
                <div className="flex flex-col items-center mt-4">
                  <div className="p-4 border border-[#C9A84C]/20 rounded-xl bg-[#F8F5EE] mb-6">
                    <img src={pixQr} alt="QR Code Pix" className="w-[180px] h-[180px] md:w-[200px] md:h-[200px] object-contain" />
                  </div>
                  
                  <div className="w-full max-w-[320px] text-center">
                    <span className="font-display text-[0.7rem] tracking-widest text-[#C9A84C] uppercase block mb-2">Chave Pix</span>
                    
                    <div className="flex items-center justify-between border border-[#D8CDBB] bg-white rounded overflow-hidden mb-3">
                      <span className="font-mono text-sm text-[#5F574D] px-3 py-2 flex-1 truncate text-left">{pixKey}</span>
                      <button 
                        onClick={copyPix}
                        className="bg-[#F8F5EE] hover:bg-[#D8CDBB]/30 text-[#5F574D] px-4 py-2 border-l border-[#D8CDBB] transition-colors"
                        aria-label="Copiar chave Pix"
                      >
                        <i className="far fa-copy"></i>
                      </button>
                    </div>
                    
                    <span className="font-serif text-[#5F574D] text-sm">Titular: <strong>{pixName}</strong></span>
                  </div>
                </div>
              )}

            </div>

            {/* Toast Notification */}
            {showToast && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#2F2B27] text-white px-4 py-2 rounded-full text-sm font-sans flex items-center gap-2 animate-fade-in z-30">
                <i className="fas fa-check-circle text-green-400"></i> Chave Copiada!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy background audio */}
      <audio id="bg-music" loop preload="none" aria-hidden="true">
         <source src="assets/music/background.mp3" type="audio/mpeg" />
      </audio>

      {/* Custom Styles for Tailwind Animations (added inline or in index.css typically, using inline style for simplicity if needed, but Tailwind is already configured. 
          Will rely on standard Tailwind or minimal custom classes) */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-zoom-in { animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D8CDBB; border-radius: 4px; }
      `}</style>
    </>
  );
}