import React, { useEffect } from "react";
import HeroSection from "./sections/HeroSection";
import CountdownSection from "./sections/CountdownSection";
import InfoSection from "./sections/InfoSection";
import ActionsSection from "./sections/ActionsSection";
import GallerySection from "./sections/GallerySection";
import Footer from "./sections/Footer";
import Modals from "./Modals";

export default function OldLayout() {
  useEffect(() => {
    // Timeout gives a tick for the DOM to render before the JS queries for elements
    setTimeout(() => {
      if (typeof (window as any).initOldConvite === 'function') {
        (window as any).initOldConvite();
      }
      // Refresh AOS because script.js dynamically adds elements (timeline, gallery) that need to be tracked
      if (typeof (window as any).AOS !== 'undefined') {
        (window as any).AOS.refresh();
      }
    }, 150);
  }, []);

  return (
    <>
      <main id="invitation-card">
        <div id="particles-js" aria-hidden="true" style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}></div>
        <button id="music-btn" aria-label="Controlar música de fundo" aria-pressed="false">
          <i className="fas fa-volume-xmark" id="music-icon" aria-hidden="true"></i>
          <span>Música</span>
        </button>

        <HeroSection />
        
        {/* Wrapper to maintain padding for the rest of the page since #invitation-card is now full-bleed */}
        <div className="w-full px-6 md:px-12 max-w-[1200px] mx-auto flex flex-col items-center">
          <CountdownSection />
          <InfoSection />
          <ActionsSection />
          <GallerySection />
          <Footer />
        </div>
      </main>
      <Modals />
    </>
  );
}
