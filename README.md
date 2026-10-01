# 💍 Convite React — Experiência do Convidado, RSVP Interativo e Painel de Recepção

[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg?logo=vite)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

Interface web moderna, sofisticada e altamente responsiva construída com **React**, **TypeScript** e **Vite**. O projeto entrega tanto uma landing page encantadora para os convidados de casamento quanto uma central administrativa, cerimonial e de portaria para o dia do evento.

---

## 🌟 Visão Geral do Sistema

O frontend é dividido em duas experiências complementares:

### 1. 💌 Experiência dos Convidados (Área Pública)
- **Landing Page Interativa:** Apresentação elegante com contagem regressiva em tempo real, história do casal, cronograma do grande dia, mapa interativo do local da cerimônia/festa e dress code.
- **Modal de RSVP Nominal:**
  - Consulta do convite por código único alfanumérico ou por busca inteligente do nome da família.
  - Confirmação ou declínio individual por membro da família.
  - Opção explícita para sinalizar crianças de 0 a 6 anos (assento e contagens gerenciais diferenciadas).
  - Campo de observações (restrições alimentares, alergias, recados carinhosos aos noivos).
  - Feedback visual imediato e bloqueio de submissão caso o prazo limite de confirmação esteja expirado.
- **Lista de Presentes & PIX:** Exibição com funcionalidade "Copia e Cola" e QR Code dinâmico para presentes.
- **Manual dos Padrinhos & Cortejo:** Seção dedicada com orientações de trajes, paleta de cores e horários especiais.

### 2. 🎛️ Painel Administrativo & Portaria em Tempo Real (`#admin`)
- **Autenticação Segura com Auto-Refresh:**
  - Login unificado (Noivos / Recepção) com suporte a JWT Access Token e Refresh Token.
  - Interceptor HTTP transparente: em caso de expiração do access token, a aplicação renova a sessão em background via `POST /api/auth/refresh` sem desconectar ou interromper a navegação do usuário.
  - Checagem preventiva em background a cada 30 segundos.
- **Aba Convites:**
  - Criação e edição com preservação de identificadores únicos (`UUID`).
  - Geração automática de códigos exclusivos seguros.
  - Gerenciamento de membros da família (titular, crianças, papéis de cortejo e vínculos).
  - Geração de QR Code individual e links diretos do convite para envio via WhatsApp.
- **Aba RSVP & Métricas:**
  - Indicadores em tempo real: total de convidados, confirmados, recusados, pendentes, adultos vs. crianças.
  - Visualização detalhada de respostas e comentários dos convidados.
- **Aba Portaria / Recepção (Check-in ao Vivo):**
  - Leitor de QR Code integrado via câmera do dispositivo (`html5-qrcode`).
  - Busca nominal rápida de convidados com busca instantânea.
  - Registro de presença nominal por membro (check-in seletivo se apenas parte da família compareceu).
  - Prevenção de duplicidade: bloqueia entradas repetidas acidentais.
  - **Reversão Total de Check-in**: Permite desmarcar a entrada de um convite por engano, sincronizando a ausência automaticamente com a tela do cerimonial e equipes.
  - Auditoria com registro do operador de portaria e horário da entrada.
  - **Suporte Offline-First**: Fila local de check-ins no navegador para sincronização automática em caso de oscilação de rede na portaria.
- **Aba Cortejo:** Acompanhamento do status de chegada dos padrinhos, daminhas e pais, sincronizado com o check-in e definição recíproca de pares.
- **Aba Fornecedores:** Credenciamento, geração de crachá virtual com QR Code e controle de entrada da equipe técnica (fotografia, buffet, decoração, etc.).
- **Aba Configurações:** Gestão dinâmica de prazo de confirmação de RSVP e catálogo de papéis e vínculos.

---

## 🛠️ Tecnologias e Bibliotecas

- **Core:**
  - [React 18](https://react.dev/) — Hooks modernos, estados locais e transições de tela.
  - [TypeScript](https://www.typescriptlang.org/) — Tipagem estática rigorosa para todos os contratos de API e modelos.
  - [Vite](https://vite.dev/) — Bundler de altíssima performance para desenvolvimento e build otimizado.
- **Estilização e Design System:**
  - [Tailwind CSS 3.4](https://tailwindcss.com/) — Utility-first styling responsivo e customizado.
  - [Lucide React](https://lucide.dev/) — Conjunto completo de ícones modernos.
- **Animações e Efeitos:**
  - [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) — Efeito comemorativo na confirmação de presença.
- **Hardware & QR Code:**
  - [html5-qrcode](https://github.com/mebjas/html5-qrcode) — Leitura rápida e confiável de QR Code direto no navegador/smartphone da recepção.
  - [qrcode](https://www.npmjs.com/package/qrcode) — Geração de QR Code em canvas/SVG para convites e crachás.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 20+ instalado
- Gerenciador de pacotes `npm`
- Backend (`convite-backend-v2`) rodando preferencialmente em `http://localhost:8080`

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/thiagovscode/convite-react.git
cd convite-react
npm install
```

### 2. Configurar Variáveis de Ambiente (Opcional)
Por padrão, o frontend utiliza a URL do backend configurável no arquivo `.env`:
```env
VITE_API_URL=http://localhost:8080
```

### 3. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O Vite iniciará o servidor local em `http://localhost:5173`.

### 4. Gerar Build de Produção
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
│   │   │   ├── tabs/       # Abas: ConvitesTab, PortariaTab, CortejoTab, FornecedoresTab, etc.
│   │   │   └── AdminPanel.tsx # Hub de controle com renovação transparente de sessão
│   │   └── wedding/        # Componentes visuais da Landing Page do casamento
│   ├── services/           # Camada de comunicação HTTP com a API REST
│   │   ├── api.ts          # Cliente HTTP autenticado com suporte a Refresh Token (fetchAutenticadoAdmin)
│   │   ├── convites.ts     # Serviços de portaria, check-in, fila offline e cerimonial
│   │   └── classificacoes.ts # Serviços de papéis e vínculos dinâmicos
│   ├── types/              # Interfaces TypeScript de domínio e contratos
│   ├── App.tsx             # Roteamento e renderização principal
│   ├── index.css           # Configurações globais e diretivas do Tailwind
│   └── main.tsx            # Ponto de entrada da aplicação
├── index.html              # HTML base com meta tags e fontes
├── tailwind.config.js      # Customização de cores, fontes e breakpoints
├── tsconfig.json           # Configuração do TypeScript
└── vite.config.ts          # Configuração do Vite e plugins
```

---

## 📱 Responsividade e Compatibilidade Mobile

O sistema foi rigorosamente otimizado para dispositivos móveis:
- **Convidados:** Fluidez total ao abrir o convite no smartphone direto do WhatsApp ou redes sociais.
- **Portaria & Recepção:** O leitor de QR Code e a interface de check-in foram construídos pensados no uso em tablets e smartphones dos recepcionistas, permitindo conferência e validação rápida por convidado.