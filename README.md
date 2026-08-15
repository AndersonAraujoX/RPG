# 🌌 Portal Kuar-Tor: A Última Expedição & VTT (+2d6)

<p align="center">
  <img src="https://img.shields.io/badge/Status-Produção%20%2F%20Modular-66FCF1?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Sistema-%2B2d6%20v2.3%20(Newton%20Rocha)-10B981?style=for-the-badge" alt="Sistema +2d6">
  <img src="https://img.shields.io/badge/Testes-86%20Passing-34D399?style=for-the-badge" alt="Testes Unitários">
  <img src="https://img.shields.io/badge/Licença-MIT-C5C6C7?style=for-the-badge" alt="Licença">
</p>

> *"Onde a magia antiga encontra a tecnologia proibida. Operativo, bem-vindo ao nexo da sua sobrevivência."*

O **Portal Kuar-Tor** é uma plataforma integrada de Virtual Tabletop (VTT), gestão de fichas e suporte a campanhas de RPG baseadas no **Sistema +2d6 (v2.3 de Newton Rocha)** em um cenário épico de **Dark Fantasy / Cyber-Arcana**.

---

## 🏗️ Arquitetura Modular e Separação de Responsabilidades (SoC)

A base de código é estruturada em camadas independentes com alta coesão e baixo acoplamento:

```mermaid
graph TD
    subgraph UI_Layer ["Camada de Apresentação (HTML / DOM)"]
        Index["index.html (Portal VTT Hub)"]
        Mesa2D["public/mesa_virtual.html (VTT 2D)"]
        Forms["legado/Forms/formV6.html (Ficha +2d6)"]
        Magia["public/arvore_magia.html (12 Caminhos)"]
    end

    subgraph Modules_Layer ["Camada de Controladores (src/modules/)"]
        Grid["tactical-grid.js (Snap, Metros e Quadrados)"]
        Sync["room-sync.js (LocalStorage First + Debounce)"]
        UI["ui-controller.js (Tabs, Modais, Toasts)"]
    end

    subgraph Core_Layer ["Camada de Regras de Negócio Puras (src/core/)"]
        Combat["combat-engine.js (Ataque, Críticos, RD, Morte)"]
        Dice["dice-roller.js (2d6, CDs, Bônus Sobre-Humano)"]
        Sheet["character-sheet.js (PV/PE, Dano FOR, Perícias)"]
        P2P["vtt-p2p.js (PeerJS WebRTC Mesh)"]
        AuthCore["auth.js (Firebase Auth & Sessão)"]
    end

    subgraph Cloud_Layer ["Infraestrutura de Dados & Nuvem"]
        Firestore[("Firebase Firestore (rooms, characters, messages)")]
        LocalStorage[("Navegador LocalStorage (Offline Mode)")]
    end

    Index --> UI
    Index --> Sync
    Index --> Grid
    Index --> Combat
    Index --> Dice
    Index --> Sheet

    Combat --> Dice
    Sheet --> Combat
    Sheet --> Dice
    Sync --> Firestore
    Sync --> LocalStorage
```

---

## 📁 Estrutura de Diretórios

```text
RPG/
├── index.html                   # Portal Principal & Mesa Virtual Integrada
├── firestore.rules              # Regras de Segurança do Firebase Firestore
├── tailwind.config.js           # Configurações do Design System Tailwind
├── .agents/
│   └── skills/
│       └── code-refactoring/    # Skill oficial de refatoração segura (Regressão Zero)
├── src/
│   ├── core/                    # Regras de Negócio Puras (Sem dependência de DOM)
│   │   ├── combat-engine.js     # Motor de combate, testes opostos, RD e testes de morte
│   │   ├── dice-roller.js       # Mecânica 2d6, CDs, bônus sobre-humano/divino e logs
│   │   ├── character-sheet.js   # Cálculos de ficha +2d6 v2.3, status derivados e perícias
│   │   ├── vtt-p2p.js           # Módulo WebRTC PeerJS multiplayer sem servidor
│   │   ├── auth.js              # Gerenciador de autenticação Firebase Auth e UI de perfil
│   │   └── firebase-config.js   # Credenciais e inicialização do Firebase SDK
│   ├── modules/                 # Controladores de Subsistemas do VTT
│   │   ├── tactical-grid.js     # Gestão do Grid 2D, réguas de distância e snap magnético
│   │   ├── room-sync.js         # Sincronização híbrida: LocalStorage First + Firestore
│   │   └── ui-controller.js     # Gerenciamento de abas, gaveta de tomos e modais
│   └── styles/
│       └── theme.css            # Variáveis CSS, Glassmorphism e paleta Dark Fantasy
├── tests/                       # Suíte Completa de Testes Automatizados (QUnit)
│   ├── modular-architecture.test.js
│   ├── combat-turn-manager.test.js
│   ├── combat-resolution-and-death.test.js
│   ├── character-sheet-rules.test.js
│   ├── firebase-firestore-vtt.test.js
│   ├── firebase-multi-room.test.js
│   ├── firestore-permission-resilience.test.js
│   ├── portal-redesign.test.js
│   ├── skill-refactoring.test.js
│   └── vtt-p2p.test.js
└── public/                      # Páginas de recursos e tomos da campanha
    ├── mesa_virtual.html        # Grid Tático VTT 2D Dedicado
    ├── arvore_magia.html        # Biblioteca Arcana (12 Caminhos Daemon & Fusão)
    ├── items.html               # Gerenciador de Inventário
    └── puzzles/                 # Salão de Quebra-Cabeças
```

---

## ⚔️ Fluxo de Resolução de Combate em 1 Clique (+2d6)

```mermaid
sequenceDiagram
    autonumber
    actor Atacante
    participant UI as Interface (#attack-modal)
    participant Engine as CombatEngine (src/core/)
    participant Defender as Alvo (Defesa Oposta)
    participant Sync as RoomSync / Firestore

    Atacante->>UI: Seleciona Arma e Alvo na Lista
    UI->>Engine: resolveAttack({ attacker, defender, weapon })
    Engine->>Engine: Rola 2d6 + Atributo + Perícia (Ataque)
    Engine->>Defender: Rola 2d6 + DES + Esquiva (Defesa Oposta)
    alt Acerto Crítico (12 no 2d6)
        Engine->>Engine: Dano Base Dobrado (2x dados)
    else Falha Crítica (2 no 2d6)
        Engine->>Engine: Ataque Falha Automaticamente
    else Ataque >= Defesa
        Engine->>Engine: Calcula Dano Base + FOR
        Engine->>Engine: Deduz Redução de Dano (Dano Final = Dano - RD)
    end
    Engine->>Defender: Aplica Dano ao PV do Alvo
    opt Alvo com PV <= 0
        Engine->>Engine: Aplica Condição 💀 Inconsciente
        Engine->>Engine: Executa Teste de Morte (2d6: >=11 Estabiliza, <6 Falha)
    end
    Engine->>Sync: Atualiza Estado da Sala e Publica no Chat
    Sync-->>UI: Re-renderiza Lista de Iniciativa e Tokens
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
- Node.js instalado (v16 ou superior).
- Navegador moderno (Google Chrome, Edge, Firefox ou Safari).

### 2. Executar a Suíte de Testes Unitários
Para validar os **86 testes automatizados**:
```bash
npm test
```

### 3. Iniciar o Servidor de Desenvolvimento
Você pode usar qualquer servidor estático ou o Firebase CLI:
```bash
# Opção A: Usando live-server / npx
npx live-server --port=8080

# Opção B: Usando Firebase CLI
firebase serve --only hosting
```

---

## 🔒 Regras de Segurança do Firestore (`firestore.rules`)

Para habilitar sincronização em tempo real entre múltiplos dispositivos no Firebase Console:
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Selecione o projeto `rpg---mesa` &rarr; **Firestore Database** &rarr; **Regras (Rules)**.
3. Copie o conteúdo de [`firestore.rules`](./firestore.rules) e clique em **Publicar**.

---

## 📜 Licença
Distribuído sob a licença MIT. Desenvolvido para a comunidade do Sistema +2d6 de RPG.