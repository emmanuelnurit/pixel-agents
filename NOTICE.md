# NOTICE — Fork MyOtter de pixel-agents

Ce dépôt est un fork de [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents)
maintenu par MyOtter pour les besoins du projet **Pixel Agents** (intégration
dans la plateforme Paperclip via un plugin).

## Licence

Le code originel reste sous la licence **MIT** d'origine. Le fichier
[LICENSE](./LICENSE) est conservé tel quel et copyright Pablo De Lucca.

Toute modification apportée par MyOtter dans ce fork est également distribuée
sous licence MIT, sauf mention contraire explicite.

## Modifications MyOtter prévues

Travail conduit sur la branche [`server-mode`](https://github.com/emmanuelnurit/pixel-agents/tree/server-mode)
et tracé dans le projet Paperclip [`MYO`](https://github.com/) (issues `MYO-17` à `MYO-21`).

| # | Lot | Issue Paperclip | Statut |
|---|---|---|---|
| 1 | Fork + branche `server-mode` + NOTICE + CI minimale | `MYO-17` | en cours |
| 2 | Mode serveur — SPA serving (`webview-ui/dist` statique + fallback SPA) | `MYO-18` | à venir |
| 3 | Mode serveur — bridge WebSocket authentifié | `MYO-19` | à venir |
| 4 | Mode serveur — controller standalone | `MYO-20` | à venir |
| 5 | CLI `pixel-agents-server` | `MYO-21` | à venir |
| 6 | Packaging VM (Docker Compose, reverse-proxy Caddy, déploiement Hetzner) | À ouvrir | phase 2-3 |

L'objectif final est de permettre un déploiement headless de pixel-agents sur
une VM distante (sans VS Code), exposant une API HTTP + WebSocket + SPA
servie en same-origin, consommée par un plugin Paperclip embed.

## Suivi upstream

- Remote `upstream` : `https://github.com/pablodelucca/pixel-agents.git`
- Branche cible upstream : `main`
- Procédure de rebase mensuel et conventions de contribution :
  voir [CONTRIBUTING-myotter.md](./CONTRIBUTING-myotter.md).

Aucune intention de hard-fork : la branche `server-mode` rebase régulièrement
sur `upstream/main` afin de bénéficier des évolutions amont. Les contributions
généralisables seront proposées en upstream PR le moment venu.

## Contact

Issues techniques : tracker Paperclip MyOtter (interne).
