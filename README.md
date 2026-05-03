# 🌌 Portal Kuar-Tor: A Última Expedição

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-66FCF1?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Vers%C3%A3o-2.0.0--SoC-1F2833?style=for-the-badge" alt="Versão">
  <img src="https://img.shields.io/badge/Licen%C3%A7a-MIT-C5C6C7?style=for-the-badge" alt="Licença">
</p>

> *"Onde a magia antiga encontra a tecnologia proibida. Operativo, bem-vindo ao nexo da sua sobrevivência."*

O **Portal Kuar-Tor** é uma plataforma integrada de suporte para campanhas de RPG (GURPS), projetada para oferecer uma experiência imersiva e funcional em um cenário de **Dark Fantasy / Sci-Fi**. Deixe para trás as fichas de papel rasgadas e mergulhe em um sistema centralizado de gestão de heróis, magias e combate.

---

## 🛠️ Funcionalidades de Elite

### 🔮 Biblioteca Arcana (Skill Tree)
Uma visualização revolucionária de magias baseada em **Matemática Orbital**. Esqueça listas estáticas; explore o nexo de magias através de hexágonos rúnicos dinâmicos que se organizam de forma orgânica.
- **Progressão Dinâmica:** Invista pontos de personagem (CP) e desbloqueie caminhos arcanos.
- **Interface SVG:** Renderização nítida em qualquer resolução com efeitos de brilho neon.

### 🎒 Inventário em Tempo Real
Gestão completa de itens e equipamentos integrada ao **Firebase Realtime Database**.
- **Categorização Automática:** Armas, armaduras, acessórios e consumíveis organizados.
- **Persistência por Personagem:** Seus itens estão salvos com segurança na nuvem, vinculados ao seu herói.

### 🛡️ Mesa Virtual (VTT) & Combate
Um campo de batalha tático digital para visualização de posicionamento e estratégia em tempo real, permitindo que mestres e jogadores coordenem a "Última Expedição".

### 🔑 Autenticação Biométrica Digital
Segurança de dados utilizando **Firebase Auth**.
- **Login Social:** Entre instantaneamente com sua conta Google.
- **Perfil Global:** Codinome único vinculado à sua identidade de operativo.

---

## 🏗️ Arquitetura SoC (Separation of Concerns)

O projeto foi recentemente refatorado para seguir padrões modernos de engenharia de software, separando a lógica de negócio da interface do usuário.

| Camada | Diretório | Função |
| :--- | :--- | :--- |
| **Ponto de Entrada** | `public/` | Arquivos HTML otimizados para deploy direto. |
| **Core** | `src/core/` | Infraestrutura, conexões Firebase e lógica de autenticação. |
| **Logic** | `src/logic/` | Regras de negócio, cálculos de sistema e scripts de dados. |
| **UI Control** | `src/ui//` | Controladores de página (`pages/`) e componentes reutilizáveis. |
| **Design System** | `src/styles/` | O coração visual: `theme.css` com todas as variáveis e estilos globais. |

---

## 💻 Stack Tecnológica

| Tecnologia | Uso |
| :--- | :--- |
| **HTML5 & JS ES6** | Estrutura e lógica reativa. |
| **Vanilla CSS & Tailwind** | Estilização premium com Glassmorphism. |
| **Firebase Firestore** | Banco de dados NoSQL para perfis e fichas. |
| **Firebase RTDB** | Sincronização em milissegundos para itens e VTT. |
| **Google Fonts** | Tipografia Cinzel (Épico) e Inter (Funcional). |

---

## 🎨 Estilo Visual: Dark Future

O design do portal utiliza técnicas avançadas de **Glassmorphism**, com superfícies translúcidas e desfoque de fundo (backdrop-filter), garantindo que a interface pareça um terminal de alta tecnologia de uma civilização antiga.

- **Paleta de Cores:**
  - `RPG Cyan (#66FCF1)` - Energia e Ações.
  - `RPG Slate (#1F2833)` - Superfícies de Interface.
  - `RPG Black (#0B0C10)` - Abismo e Fundo.

---

## 🚀 Como Iniciar a Expedição

### Pré-requisitos
- [Firebase CLI](https://firebase.google.com/docs/cli) instalado.
- Um navegador moderno (Chrome, Edge ou Firefox).

### Instalação Local
1. Clone o repositório:
   ```bash
   git clone https://github.com/AndersonAraujoX/RPG.git
   ```
2. Acesse a pasta do projeto:
   ```bash
   cd RPG
   ```
3. Inicie o servidor local:
   ```bash
   firebase serve
   ```

---

## 📜 Licença
Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

<p align="center">
  Desenvolvido com ⚡ para a campanha <b>Kuar-Tor</b>.
</p>