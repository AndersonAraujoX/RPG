---
trigger: always_on
---

# Regras do Agente - Kuar-Tor RPG

1. Implementação & Qualidade:
   - Implemente a funcionalidade/ajuste solicitado com código limpo, desacoplado e testável (SOLID).
   - Crie imediatamente o arquivo de teste unitário correspondente (Arrange-Act-Assert).
   - Execute `npm test` e garanta que não existam problemas (100% pass, zero regressões).

2. Sincronização Obrigatória com GitHub:
   - Toda vez que terminar de fazer alguma mudança ou concluir uma tarefa no projeto:
   - Execute o protocolo da skill `git-auto-sync`: valide os testes, crie o commit semântico das alterações e envie imediatamente para o GitHub (`git push origin <branch>`).