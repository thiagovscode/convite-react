import React from "react";

export default function GallerySection() {
  return (
    <>
      <section id="sec-gallery" aria-labelledby="gallery-heading">
      <h3 className="sec-title" id="gallery-heading" data-aos="fade-up">Antes do Sim</h3>
      <p className="gallery-intro" data-aos="fade-up" data-aos-delay="70">
        Cada passo da nossa caminhada nos trouxe até este momento. Estas lembranças representam um pouco da nossa história e antecedem o dia em que diremos &quot;sim&quot; diante de Deus, da nossa família e dos nossos amigos.
      </p>
      <div id="gallery-grid" className="editorial-gallery" role="list" aria-label="Galeria de fotos do pré-wedding"></div>
    </section>

    {/**/}
    </>
  );
}