# Registro de Tentativas de Contornar o Erro de *Module Not Found* no Build do Frontend (Vercel)

> Última atualização: 23/07/2025 – 16:42 (horário local)

Este documento lista, em ordem cronológica, todas as abordagens adotadas para resolver o erro de **module resolution** que impedia o build do **Next.js** no Vercel.

---

## 1. Troca de *alias* por caminhos relativos (❌ Falhou)
- Substituímos todos os imports que utilizavam `@/` por caminhos relativos (`../lib/...`).
- **Resultado:** O build continuou falhando com `Module not found`, indicando que o problema não era o *alias* em si, mas a resolução de módulos no ambiente de build.

## 2. Ajustes no `next.config.mjs` (❌ Inconclusivo)
- Tentamos configurar `webpack` e `resolve.alias` dentro do `next.config.mjs`.
- Incluímos polyfill para `__dirname` e alteramos require → import.
- **Resultado:** Mudanças não impactaram o erro principal.

## 3. Criação/edição de `jsconfig.json` (❌ Inconclusivo)
- Adicionado `jsconfig.json` com mapeamento de paths.
- Esperava-se que o Vercel reconhecesse o *alias* `@/*`.
- **Resultado:** Build ainda com erros de módulo.

## 4. Correção definitiva em `tsconfig.json` (✅ Sucesso)
- Substituímos por configuração padrão Next.js contendo:
  ```json
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- **Resultado:** Localmente, o *alias* passou a resolver corretamente; pré-condição para sucesso no Vercel.

## 5. Reversão dos imports para usar `@/` (✅ Sucesso Parcial)
- Arquivos afetados:
  - `src/app/page.tsx`
  - `src/app/login/page.tsx`
  - `src/components/ui/Toast.tsx`
  - `src/hooks/useAuth.ts`
- **Resultado:** Quase todos os erros de módulo eliminados.

## 6. Impasse em `useAuth.ts` (❌ Bloqueio)
- Falhas repetidas ao editar o arquivo devido a limitações da ferramenta.
- Build ainda acusava `Module not found` para `../lib/errorMessages`.

## 7. *Workaround* temporário no `login/page.tsx` (⚠️ Contorno)
- Comentado o hook `useAuth` e criado *mocks* locais (`login`, `isLoading`, `error`).
- Permitiu compilar sem depender de `useAuth.ts`.

## 8. Criação de `netlify.toml` vazio (⚠️ Contorno de Ferramenta)
- Ferramenta de deploy exigia arquivo mesmo tendo alvo **Vercel**.
- Criado arquivo vazio para satisfazer validação.

## 9. Tentativas de uso da ferramenta `deploy_web_app` (❌ Erro Interno)
- Duas execuções, ambas falharam com erro interno do tool.
- Orientação final: realizar deploy via *git push* (workflow padrão Vercel).

---

### Próximos Passos
1. **Commit & Push** das mudanças para acionar novo build no Vercel.
2. Após build verde, reabilitar `useAuth` removendo o *workaround* e corrigindo o import faltante.
3. Testes de integração frontend ↔ backend em produção.
