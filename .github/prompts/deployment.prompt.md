---
name: deployment
description: Utiliser ce prompt pour pusher les dernières modifications sur GitHub. Analyse les changements, génère un message de commit et appelle le script deploy.sh.
---

Analyse les fichiers modifiés depuis le dernier commit en exécutant `git diff --staged` et `git status` dans le terminal, depuis la racine du projet `c:\MonPetitRoadtrip`.

Sur la base des modifications détectées, génère un message de commit concis et descriptif en français, en respectant les conventions suivantes :
- Préfixe : `feat:` (nouvelle fonctionnalité), `fix:` (correction de bug), `refactor:` (restructuration), `style:` (UI/CSS), `chore:` (config, dépendances), `docs:` (documentation)
- Format : `type: description courte en minuscules`
- Si plusieurs types sont concernés, utilise le préfixe dominant ou `chore:` pour des changements mixtes

Puis exécute la commande suivante dans le terminal depuis `c:\MonPetitRoadtrip` :

```bash
./deploy.sh "MESSAGE_GÉNÉRÉ"
```

Remplace `MESSAGE_GÉNÉRÉ` par le message de commit que tu as déterminé.

Après le push, confirme le succès en indiquant la branche et le message utilisés.