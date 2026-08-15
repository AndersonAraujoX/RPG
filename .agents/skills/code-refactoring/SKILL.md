---
name: code-refactoring
description: >-
  Guia passo a passo para refatoração de código segura, modularização, desacoplamento e limpeza
  de complexidade sem quebrar funcionalidades existentes. Use esta skill sempre que o usuário
  pedir para refatorar, modularizar, limpar código, extrair funções/módulos ou organizar a arquitetura do projeto.
---

# Skill de Refatoração de Código Segura (+2d6 RPG & Web Apps)

Esta skill define o protocolo rigoroso e seguro para refatoração de código, desacoplamento e modularização sem introduzir regressões ou quebrar regras de negócio.

---

## 🎯 Princípios Fundamentais

1. **Regressão Zero**: O comportamento externo e a interface pública (API/DOM/Eventos) devem permanecer idênticos para o usuário e para os testes.
2. **Testes Unitários Obrigatórios**: Nenhuma refatoração é concluída sem validar a suíte de testes unitários (`npm test`).
3. **Passos Atômicos**: Altere uma responsabilidade por vez, testando a cada modificação.
4. **Local-First & Resiliência**: Preservar persistência offline (`localStorage`), debounce em rede e tratamento de erros graciosos.

---

## 📋 Protocolo de Execução em 5 Fases

### Fase 1: Análise e Baseline de Testes
1. Identifique o alvo da refatoração (arquivos monolíticos, funções longas, código duplicado).
2. Execute a suíte de testes existente (`npm test`) para garantir que o baseline está 100% funcional (`pass`).
3. Se o trecho a ser refatorado não possuir testes unitários suficientes, crie primeiro um arquivo de teste de caracterização em `tests/` cobrindo o comportamento atual.

### Fase 2: Identificação de Oportunidades de Extração
Verifique os seguintes padrões para modularização:
- **Lógica de Regras de Negócio Pura**: Mover cálculos matemáticos, dados e fórmulas para `src/core/` (ex: `character-sheet.js`, `combat-rules.js`).
- **Manipulação de DOM & Eventos**: Isolar em funções utilitárias ou controladores de interface.
- **Integrações de Rede / Firebase / P2P**: Isolar em módulos de sincronização resilientes com tratamento de erro e fallback offline.
- **Constantes e Configurações**: Agrupar em objetos de configuração ou enums claros.

### Fase 3: Extração e Modularização Incremental
1. Extraia o bloco de código para um novo módulo ou função pura com exportação compatível (CommonJS / ES Modules / Browser Global).
2. Substitua o código original pela chamada ao novo módulo/função.
3. Garanta que nomes de IDs no DOM, classes CSS e assinaturas de funções globais (`window.minhaFuncao`) continuem disponíveis caso outras páginas ou scripts dependam delas.

### Fase 4: Validação Imediata com Testes
1. Execute `npm test` imediatamente após a alteração.
2. Se algum teste falhar, reverta ou ajuste a assinatura até que todos os testes passem com 0 falhas.

### Fase 5: Limpeza e Polimento
1. Remova funções obsoletas e variáveis não utilizadas.
2. Garanta a legibilidade com comentários sucintos e tipagem JSDoc quando apropriado.
3. Verifique se o carregamento em navegadores estáticos continua funcionando perfeitamente sem erros no console.

---

## 🛠️ Checklist de Verificação da Refatoração

- [ ] A baseline de testes passou antes de iniciar?
- [ ] A nova estrutura reduziu duplicação e complexidade ciclomática?
- [ ] As funções extraídas são puras e fáceis de testar isoladamente?
- [ ] Não foram introduzidas dependências de CDNs bloqueadas (ex: `cdn.tailwindcss.com`)?
- [ ] Todos os novos arquivos de teste foram executados via `npm test` e estão com 100% de aprovação?
