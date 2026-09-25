import React, { useState, useEffect } from 'react';
import OldLayout from './components/OldLayout';
import Envelope from './components/Envelope';
import AOS from 'aos';
import 'aos/dist/aos.css';

function App() {
  const [isOpened, setIsOpened] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return (
      params.get("recepcao") === "true" ||
      params.get("checkin") === "true" ||
      params.get("portaria") === "true" ||
      params.get("admin") === "true" ||
      hash.includes("recepcao") ||
      hash.includes("checkin") ||
      hash.includes("portaria") ||
      hash.includes("admin")
    );
  });

  useEffect(() => {
    // Initialize AOS only after the envelope opens, to avoid animations triggering while hidden
    if (isOpened) {
      AOS.init({
        duration: 800,
        once: true,
        offset: 50
      });
      document.body.style.overflow = 'auto';
    } else {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpened]);

  return (
    <div className="w-screen overflow-x-hidden">
      {!isOpened && (
        <Envelope onAnimationComplete={() => setIsOpened(true)} />
      )}

      {isOpened && (
        <OldLayout />
      )}
    </div>
  );
}

export default App;
