

# Plan : Corriger le flux d'inscription et d'onboarding

## Problèmes identifiés

1. **Trigger manquant** : Le trigger `on_auth_user_created` sur `auth.users` n'existe plus en base, bien que la fonction `handle_new_user()` soit présente. Aucun profil/organisation/rôle n'est créé à l'inscription.
2. **Condition d'onboarding fragile** : `organization.onboarding_completed === false` ne couvre pas `null`. Un nouvel org aura `onboarding_completed = false` (default), mais si la valeur est `null`, la redirection ne se déclenche pas.
3. **Utilisateur test orphelin** : Le compte `test-onboarding-flow@example.com` existe dans `auth.users` sans profil associé.

## Étapes de correction

### 1. Migration DB : recréer le trigger

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Cela restaure le mécanisme automatique de création de profil, organisation, rôle, subscription trial, villes par défaut, etc.

### 2. Corriger la condition dans ProtectedRoute

Dans `src/components/auth/ProtectedRoute.tsx`, remplacer :
```typescript
organization.onboarding_completed === false
```
par :
```typescript
!organization.onboarding_completed
```

Cela couvre `false`, `null` et `undefined`.

### 3. Nettoyer l'utilisateur test orphelin (optionnel)

Supprimer le compte `test-onboarding-flow@example.com` de `auth.users` ou créer manuellement son profil/org pour le débloquer.

## Fichiers concernés

| Fichier | Modification |
|---|---|
| Migration SQL | Recréer le trigger `on_auth_user_created` |
| `src/components/auth/ProtectedRoute.tsx` | Condition `!organization.onboarding_completed` |

## Résultat attendu

Après ces corrections, le flux sera :
1. Inscription → trigger crée profil + org + rôle admin + subscription trial
2. `ProtectedRoute` détecte `onboarding_completed = false` → redirige vers `/onboarding`
3. L'utilisateur complète les 4 étapes → `onboarding_completed = true` → accès au dashboard

