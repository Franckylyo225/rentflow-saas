---
name: Séparation routes super admin / SaaS
description: Le super admin a son propre flux de connexion (/admin/login) et ses routes sont totalement séparées du SaaS
type: feature
---
Les routes super admin et SaaS sont complètement séparées :
- **Super Admin** : login via `/admin/login`, panel via `/admin/*`. Pas de lien dans la sidebar SaaS. Déconnexion redirige vers `/admin/login`.
- **Utilisateurs SaaS** : login via `/auth`, routes `/dashboard/*`. Aucun accès au panel admin.
- `SuperAdminRoute` redirige les non-authentifiés vers `/admin/login` (et non `/auth`).
- La sidebar SaaS ne contient plus de lien "Super Admin".
