# 💍 Convite React — Experiência do Convidado, RSVP Interativo e Painel de Recepção

[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?logo=vite)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

Interface web moderna, sofisticada e altamente responsiva construída com **React 19**, **TypeScript** e **Vite 8**. O projeto entrega tanto uma landing page encantadora para os convidados de casamento quanto uma central administrativa e de portaria para o dia do evento.

---

## 🌟 Visão Geral do Sistema

O frontend é dividido em duas experiências complementares:

### 1. 💌 Experiência dos Convidados (Área Pública)
- **Landing Page Interativa:** Apresentação elegante com contagem regressiva em tempo real, história do casal, cronograma do grande dia, mapa interativo do local da cerimônia/festa e dress code.
- **Modal de RSVP Nominal:**
  - Consulta do convite por código único alfanumérico ou por busca inteligente do nome da família.
  - Confirmação ou declínio individual por membro da família.
  - Opção explícita para sinalizar crianças de 0 a 6 anos (assento e contagem gerencial diferenciada).
  - Campo de observações (restrições alimentares, alergias, recados carinhosos aos noivos).
  - Disparo de confetes comemorativos e feedback visual imediato.
- **Lista de Presentes & PIX:** Exibição com funcionalidade de cópia rápida "Copia e Cola" e QR Code dinâmico para presentes.
- **Manual dos Padrinhos & Cortejo:** Seção dedicada com orientações de trajes, paleta de cores e horários especiais.

### 2. 🎛️ Painel Administrativo & Portaria em Tempo Real (`/admin`)
- **Autenticação Segura:** Login administrativo com gerenciamento de sessão via JWT e redirecionamento automático.
- **Aba Convites:**
  - Criação, edição e exclusão de convites.
  - Geração automática de códigos exclusivos.
  - Gerenciamento de membros da família (titular, crianças, papéis e vínculos).
  - Geração de QR Code individual e links diretos do convite para envio via WhatsApp.
- **Aba RSVP & Métricas:**
  - Indicadores em tempo real: total de convidados, confirmados, recusados, pendentes, adultos vs. crianças.
  - Exportação e visualização detalhada de respostas e comentários.
- **Aba Portaria / Recepção (Check-in ao Vivo):**
  - Leitor de QR Code integrado via câmera do dispositivo (`html5-qrcode`).
  - Busca nominal rápida de convidados com busca instantânea.
  - Registro de presença nominal por membro (check-in seletivo se apenas parte da família compareceu).
  - Prevenção de duplicidade: impede entradas repetidas acidentais.
  - Auditoria com registro do operador de portaria e horário da entrada.
- **Aba Cortejo:** Acompanhamento do status de chegada dos padrinhos, daminhas e pais, sincronizado com o check-in.
- **Aba Fornecedores:** Credenciamento, geração de crachá virtual com QR Code e controle de entrada da equipe de serviço (fotografia, buffet, decoração, etc.).
- **Aba Configurações:** Gestão separada e dinâmica de **Papéis** e **Vínculos** com os noivos.

---

## 🛠️ Tecnologias e Bibliotecas

- **Core:**
  - [React 19](https://react.dev/) — Hooks modernos, transições de estado e componentização limpa.
  - [TypeScript](https://www.typescriptlang.org/) — Tipagem estática rigorosa para todos os contratos de API e modelos.
  - [Vite 8](https://vite.dev/) — Bundler de altíssima performance para desenvolvimento e build otimizado.
- **Estilização e Design System:**
  - [Tailwind CSS 3.4](https://tailwindcss.com/) — Utility-first styling responsivo e customizado.
  - [Lucide React](https://lucide.dev/) & [FontAwesome](https://fontawesome.com/) — Conjunto completo de ícones modernos.
- **Animações e Interatividade:**
  - [Framer Motion](https://www.framer.com/motion/) & [GSAP](https://gsap.com/) — Animações suaves de entrada, saída e transições de tela.
  - [AOS (Animate On Scroll)](https://michalsnik.github.io/aos/) — Efeitos visuais conforme a rolagem da página.
- **Hardware & QR Code:**
  - [html5-qrcode](https://github.com/mebjas/html5-qrcode) — Leitura rápida e confiável de QR Code direto no navegador/smartphone da recepção.
  - [qrcode](https://www.npmjs.com/package/qrcode) — Geração de QR Code em canvas/SVG para convites e crachás.
- **Qualidade de Código:**
  - [Oxlint](https://oxc.rs/) — Linter em Rust ultrarrápido para código limpo.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 20+ instalado
- Gerenciador de pacotes `npm` (ou `pnpm` / `yarn`)
- O backend (`convite-backend-v2`) rodando preferencialmente em `http://localhost:8080`

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/thiagovscode/convite-react.git
cd convite-react
npm install
```

### 2. Configurar Variáveis de Ambiente (Opcional)
Por padrão, o frontend utiliza `/api` relativo ou a URL do backend configurável no arquivo `.env`:
```env
VITE_API_URL=http://localhost:8080
```

### 3. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O Vite iniciará o servidor local (geralmente em `http://localhost:5173`). Abra o navegador para visualizar a aplicação.

### 4. Executar Análise Estática (Linter)
```bash
npm run lint
```

### 5. Gerar Build de Produção
```bash
npm run build
```
Os artefatos estáticos minificados e otimizados serão gerados no diretório `dist/`.

Para testar o build localmente em modo preview:
```bash
npm run preview
```

---

## 📁 Estrutura de Pastas

```text
convite-react/
├── public/                 # Favicon, imagens e assets públicos estáticos
├── src/
│   ├── assets/             # Imagens, vetores e selos comemorativos
│   ├── components/         # Componentes compartilhados e modais (RsvpModal, FornecedorCredencialModal, etc.)
│   ├── features/
│   │   ├── admin/          # Painel Administrativo completo
│   │   │   ├── tabs/       # Abas: ConvitesTab, PortariaTab, CortejoTab, FornecedoresTab, ConfiguracoesTab
│   │   │   └── AdminPanel.tsx
│   │   └── wedding/        # Componentes visuais da Landing Page do casamento
│   ├── services/           # Camada de comunicação HTTP com a API REST
│   │   ├── api.ts          # Cliente Axios / Fetch configurado com interceptors
│   │   ├── auth.ts         # Métodos de login e validação de token JWT
│   │   ├── convites.ts     # Serviços de convites, rsvp e portaria
│   │   ├── classificacoes.ts # Serviços de papéis e vínculos
│   │   └── fornecedores.ts # Serviços de fornecedores e crachás
│   ├── types/              # Interfaces TypeScript de domínio e contratos
│   ├── App.tsx             # Roteamento e renderização principal
│   ├── index.css           # Configurações globais e diretivas do Tailwind
│   └── main.tsx            # Ponto de entrada React 19
├── index.html              # HTML base com meta tags e fontes
├── tailwind.config.js      # Customização de cores, fontes e breakpoints
├── tsconfig.json           # Configuração do TypeScript
└── vite.config.ts          # Configuração do Vite e plugins
```

---

## 📱 Responsividade e Compatibilidade Mobile

O sistema foi rigorosamente otimizado para dispositivos móveis:
- **Convidados:** Fluidez total ao abrir o convite no smartphone direto do WhatsApp ou Instagram.
- **Portaria & Recepção:** O leitor de QR Code e a interface de check-in foram construídos pensados no uso em tablets e smartphones dos recepcionistas, permitindo conferência e validação em segundos por convidado.