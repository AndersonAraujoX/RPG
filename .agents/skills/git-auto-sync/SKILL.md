---
name: git-auto-sync
description: >-
  Protocolo automático de sincronização com o GitHub. Toda vez que terminar de implementar
  qualquer funcionalidade, ajuste, refatoração ou teste no projeto, valida a suíte de testes
  (zero regressões), gera commit semântico (Conventional Commits) e envia imediatamente
  para o repositório remoto via git push.
---

# Skill de Sincronização Automática com o GitHub (git-auto-sync)

Esta skill estabelece a diretriz mandatória e o procedimento operacional padrão para enviar código ao GitHub toda vez que uma alteração, refatoração, correção de bug ou nova funcionalidade for finalizada no projeto **Portal Kuar-Tor**.

---

## 🎯 Princípios Fundamentais

1. **Quality Gate Inviolável**: NUNCA envie código que quebre testes. Antes de commitar, a suíte de testes unitários (`npm test`) deve passar com 100% de aprovação (zero erros, zero regressões).
2. **Conventional Commits**: Toda alteração deve possuir mensagem estruturada com tipo e escopo semânticos:
   - `feat(escopo)`: Nova funcionalidade ou recurso.
   - `fix(escopo)`: Correção de bug ou regressão.
   - `refactor(escopo)`: Reorganização de código sem alterar comportamento externo.
   - `test(escopo)`: Adição ou melhoria de suítes de testes.
   - `docs(escopo)`: Atualização de documentações e guias.
   - `style(escopo)`: Ajustes visuais ou formatação de layout.
3. **Sincronização Contínua**: Não acumule alterações locais não sincronizadas. Finalizou a tarefa -> valida -> commita -> envia ao GitHub (`git push`).

---

## 📋 Protocolo de Execução em 5 Fases

### Fase 1: Quality Gate de Testes Unitários
Antes de iniciar o processo de sincronização, execute a suíte de testes:
```bash
npm test
```
- **Se todos os testes passarem**: Prossiga para a Fase 2.
- **Se algum teste falhar**: Pare imediatamente. Corrija o problema antes de tentar enviar qualquer alteração.

### Fase 2: Inspecionar Modificações
Verifique os arquivos alterados e criados no repositório:
```bash
git status
```
Garanta que apenas arquivos intencionais e necessários do projeto estejam sendo versionados (sem arquivos de log desnecessários ou temporários).

### Fase 3: Staging Seguro
Adicione os arquivos pertinentes ao stage do Git:
```bash
git add .
```

### Fase 4: Commit Semântico
Crie o commit com mensagem descritiva que resuma as mudanças implementadas:
```bash
git commit -m "feat(inventory): conecta ficha e itens dos jogadores com slots e transferencia"
```

### Fase 5: Envio Imediato ao Repositório Remoto
Envie as alterações para o branch ativo no GitHub:
```bash
git push origin <branch-atual>
```
Confirme se o push foi aceito pelo servidor do GitHub.

---

## ⚡ Automação Rápida via Script Helper

O projeto conta com o utilitário [`scripts/git-sync.js`](file:///home/anderson/Documents/projeto/Site-Kuar-Tor/RPG/scripts/git-sync.js) que executa automaticamente o Quality Gate, detecta o contexto das alterações, cria o commit semântico e faz o push em uma única instrução:

```bash
# Execução direta com mensagem customizada
node scripts/git-sync.js "feat(vtt): adiciona suporte a névoa de guerra"

# Ou via npm script
npm run git-sync -- "feat(vtt): adiciona suporte a névoa de guerra"
```

---

## 🛠️ Checklist de Conclusão da Skill

- [ ] A suíte de testes unitários (`npm test`) foi executada e obteve 100% de aprovação?
- [ ] Os arquivos foram adicionados com `git add`?
- [ ] A mensagem de commit segue o padrão `tipo(escopo): descrição`?
- [ ] O comando `git push origin <branch>` foi executado com sucesso?
- [ ] O repositório remoto no GitHub está atualizado e sincronizado com o branch local?
