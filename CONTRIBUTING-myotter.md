# Guide de contribution — fork MyOtter

Ce document complète le [`CONTRIBUTING.md`](./CONTRIBUTING.md) upstream avec
les règles spécifiques au fork MyOtter de `pixel-agents`. Les règles upstream
restent applicables pour tout ce qui touche au cœur de l'extension VS Code.

## Branches

- `main` — miroir strict de `upstream/main`. **Aucun commit MyOtter direct.**
  Mise à jour exclusivement via `git fetch upstream && git push origin main`.
- `server-mode` — branche de travail MyOtter. Contient le mode serveur
  standalone (HTTP + WebSocket + SPA + CLI), le packaging VM et la CI MyOtter.
- `feature/*` — branches courtes par ticket Paperclip, mergées dans
  `server-mode` via PR interne.

## Remote upstream

À configurer une fois après clone du fork :

```bash
git remote add upstream https://github.com/pablodelucca/pixel-agents.git
git fetch upstream
```

## Synchronisation upstream (rebase mensuel)

Cadence cible : **une fois par mois calendaire**, ou sur demande explicite si
un correctif upstream est nécessaire avant.

```bash
# 1. Mettre à jour main local
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main

# 2. Rebase server-mode
git checkout server-mode
git fetch origin
git rebase main

# 3. Résoudre les conflits éventuels (souvent dans server/, .github/workflows/)
#    puis :
git push --force-with-lease origin server-mode
```

Conflits typiques attendus :

- `package.json` / `package-lock.json` si upstream bump des deps qui chevauchent
  les ajouts MyOtter (`server/`, dépendances HTTP/WS).
- `.github/workflows/ci.yml` — ne pas le modifier ; les ajouts CI MyOtter
  vivent dans `myotter-ci.yml` séparé pour éviter les conflits.

Toujours noter le SHA upstream rebasé dans le message du commit de merge ou
dans l'issue Paperclip de tracking.

## Règles invariantes

1. **Ne jamais modifier le fichier [`LICENSE`](./LICENSE).** La licence MIT
   d'origine doit rester intacte, copyright Pablo De Lucca compris.
2. **Ne jamais modifier le cœur Paperclip** depuis ce dépôt. Les interactions
   avec Paperclip passent uniquement par les SDK plugins et adapters publiés.
3. **Pas de patch invasif** des fichiers upstream sans justification. Préférer
   l'ajout de modules dans `server/` (mode serveur) ou de nouveaux fichiers
   dédiés MyOtter. Si un patch upstream est nécessaire, ouvrir une issue
   Paperclip pour décider si on remonte la modification en upstream PR.
4. **Workflows GitHub Actions** : ne pas toucher aux fichiers
   `.github/workflows/ci.yml`, `pr-title.yml`, `publish-extension.yml`,
   `update-badges.yml` (upstream). Les ajouts MyOtter vivent dans
   `myotter-ci.yml`.
5. **Pas de release npm / VS Code Marketplace** depuis ce fork. Le packaging
   MyOtter cible un déploiement VM via Docker, pas le Marketplace.

## CI

Les pushes sur `server-mode` (ou les PR vers `server-mode`) déclenchent le
workflow [`myotter-ci.yml`](./.github/workflows/myotter-ci.yml). Il exécute :

- `npm ci` racine + `webview-ui/` + `server/`
- `npm run check-types`
- `npm run lint`
- `npm run build:webview`
- build extension (`node esbuild.js`)
- `npm test --prefix server`

Pas de tests E2E ni d'audits npm dans la CI MyOtter — laissés à la CI upstream
sur `main`. Le but est de garantir un signal vert rapide (< 10 min) sur tout
push de la branche `server-mode`.

## Convention de commits

Préférer les Conventional Commits avec un préfixe MyOtter explicite quand le
commit est purement spécifique au fork :

- `feat(myotter): add SPA serving in server-mode`
- `chore(myotter): rebase on upstream main @abc1234`
- `fix(server): correct WS handshake auth path`

Cela facilite le tri lors des futurs upstream PRs (ce qui peut être proposé
en amont vs. ce qui reste MyOtter-only).

## Lien tickets Paperclip

Chaque PR vers `server-mode` doit référencer son ticket Paperclip dans le
titre ou le corps, sous la forme `MYO-XX`. Les commentaires de revue se font
côté Paperclip (single source of truth).
