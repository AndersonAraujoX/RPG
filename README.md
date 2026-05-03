# Portal Kuar-Tor — Arquitetura do Projeto

## 🗂 Estrutura de Pastas (SoC — Separação de Responsabilidades)

```
RPG/
├── public/                   # 📄 Entry Points HTML (deploy direto no Firebase Hosting)
│   ├── index.html            # Redirecionamento para main.html
│   ├── main.html             # Portal principal do RPG
│   ├── login.html            # Página de autenticação
│   ├── items.html            # Gerenciador de inventário
│   ├── nexo.html             # Ponto de encontro social
│   ├── diario.html           # Diário de expedição
│   ├── arvore_magia.html     # Biblioteca Arcana (Árvore de Magia GURPS)
│   ├── mesa_virtual.html     # VTT - Mesa Virtual Tática
│   ├── computador_de_kuar_tor.html
│   └── cofre.html
│
├── src/                      # 🧠 Código Fonte da Aplicação
│   ├── core/                 # 🔥 Infraestrutura & Serviços externos
│   │   ├── firebase-config.js   # Configuração do Firebase (1 lugar, sem duplicação)
│   │   └── auth.js              # Lógica de autenticação global
│   │
│   ├── logic/                # ⚙️  Regras de negócio (agnóstico de UI)
│   │   └── populate_db.js       # Scripts de seed/população do banco
│   │
│   ├── ui/                   # 🖥️  Controladores de interface
│   │   ├── pages/               # Scripts específicos por página
│   │   │   └── items.js
│   │   └── components/          # Componentes reutilizáveis (modais, tooltips, etc.)
│   │
│   └── styles/               # 🎨 Design System Central
│       └── theme.css            # Variáveis CSS, utilitários, paleta, tipografia
│
├── assets/                   # 🖼️  Recursos Estáticos
│   └── images/
│       ├── faixa.png
│       └── Ferreiro-anão.gif
│
├── Forms/                    # Formulários de personagem (legado)
├── Dados/                    # Dados e rolagem de dados (legado)
├── Site/                     # Site principal de lore (legado)
├── Rascunhos/                # Protótipos e mini-games (legado)
│
├── firebase.json             # Configuração do Firebase Hosting (aponta para public/)
├── firestore.rules           # Regras de segurança do Firestore
├── firestore.indexes.json    # Índices do Firestore
└── database.rules.json       # Regras do Realtime Database
```

## 🏛️ Responsabilidade de Cada Camada

| Pasta | Responsabilidade |
|-------|-----------------|
| `public/` | Apenas HTMLs de entrada. Não contém lógica complexa — só carrega os scripts de `src/`. |
| `src/core/` | Firebase e autenticação. Se mudar o backend, só mexe aqui. |
| `src/logic/` | Regras de negócio do RPG (cálculos, dados, seed). Não conhece o HTML. |
| `src/ui/pages/` | Scripts que manipulam o DOM de cada página específica. |
| `src/ui/components/` | Componentes reutilizáveis (modais, tooltips, toasts). |
| `src/styles/theme.css` | Design system único. Cores, tipografia e utilitários em um só lugar. |
| `assets/` | Imagens, sons e outros recursos estáticos. |

## 🔗 Convenção de Caminhos

Dentro dos HTMLs em `public/`, os caminhos para `src/` são sempre relativos:
```html
<!-- Firebase Core -->
<script src="../src/core/firebase-config.js"></script>
<script src="../src/core/auth.js"></script>

<!-- Estilos -->
<link rel="stylesheet" href="../src/styles/theme.css">

<!-- Scripts de página -->
<script src="../src/ui/pages/items.js"></script>
```

## 🚀 Deploy
```bash
firebase deploy --only hosting
```
O Firebase Hosting já está configurado em `firebase.json` para servir a pasta `public/`.