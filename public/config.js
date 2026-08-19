/**
 * ============================================================
 *  CONVITE DE CASAMENTO — CONFIGURAÇÃO
 *  Edite este arquivo para personalizar o convite.
 * ============================================================
 */

const wedding = {

  /* ----------------------------------------------------------
     NOMES
  ---------------------------------------------------------- */
  bride: "Tainara",
  groom: "Thiago",
  monogram: "T & T",

  /* ----------------------------------------------------------
     DATA E HORÁRIO
  ---------------------------------------------------------- */
  date: "24 de Janeiro de 2027",
  dateShort: "24/01/2027",
  dateISO: "2027-01-24",        // Formato ISO para Google Calendar
  day: "Domingo",
  time: "16h30",
  dateObj: new Date("2027-01-24T16:30:00"),

  /* ----------------------------------------------------------
     LOCAL
  ---------------------------------------------------------- */
  ceremony: {
    name: "Espaço Balboa",
    address: "Mairiporã — SP",
    time: "16h30"
  },

  reception: {
    description: "A partir das 15h30,\npara o pessoal ir chegando.",
    time: "15h30"
  },

  /* ----------------------------------------------------------
     DETALHES
  ---------------------------------------------------------- */
  dresscode: "Esporte Fino",
  parking: "Estacionamento gratuito disponível no local",

  /* ----------------------------------------------------------
     LINKS — preencha com os links reais antes de publicar
  ---------------------------------------------------------- */
  maps:  "https://maps.google.com/?q=Espa%C3%A7o+Balboa+Mairipora+SP",
  rsvp:  "https://wa.me/5511999999999?text=Ol%C3%A1!+Confirmo+minha+presen%C3%A7a+no+casamento+de+Tainara+e+Thiago+%F0%9F%A4%8D",
  gifts: "https://www.amazon.com.br/hz/wishlist/ls/M9WM0ECW56XX?ref_=wl_share", // Link da Lista Amazon
  giftsFun: "https://noivos.casar.com/tainara-thiago#/presentes",         // Link da Lista de Presentes Divertidos
  pix: {
    key: "tainaraethiago2027@email.com",
    name: "Tainara e Thiago",
    qrCode: "assets/images/pix_qr.png"
  },

  /* ----------------------------------------------------------
     VERSÍCULO
  ---------------------------------------------------------- */
  verse: {
    text: '"Grandes coisas fez o Senhor por nós,\ne por isso estamos alegres."',
    reference: "Salmos 126:3"
  },

  /* ----------------------------------------------------------
     FOTOS DA GALERIA
  ---------------------------------------------------------- */
  photos: [
    { src: "assets/images/gallery1.jpg", alt: "Nosso pré-wedding", caption: "09 de Setembro de 2026", sub: "Nosso Pré-Wedding" },
    { src: "assets/images/gallery2.jpg", alt: "Buquê e noiva",       caption: "Cada fotografia representa um passo da nossa história.", sub: "" },
    { src: "assets/images/gallery3.jpg", alt: "Decoração do espaço",  caption: "O início de uma nova caminhada.", sub: "" },
    { src: "assets/images/gallery4.jpg", alt: "Momento romântico",    caption: "24 de Janeiro de 2027", sub: "O dia em que diremos 'sim'" }
  ],

  /* ----------------------------------------------------------
     FOTO DO CASAL (hero)
  ---------------------------------------------------------- */
  couplePhoto: {
    src: "assets/images/couple.jpg",
    alt: "Tainara e Thiago"
  },

  /* ----------------------------------------------------------
     GOOGLE CALENDAR
  ---------------------------------------------------------- */
  calendar: {
    title:    "Casamento Tainara & Thiago 💍",
    details:  "Celebração do casamento de Tainara e Thiago. Espaço Balboa, Mairiporã - SP.",
    location: "Espaço Balboa, Mairiporã - SP"
  }

};

window.wedding = wedding;
