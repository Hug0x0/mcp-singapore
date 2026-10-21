# Contribuer

Utiliser Node.js 22.12+ (Node 22 et 24 testés en CI).

```sh
npm ci
npm run build
npm test
npm run docs:generate
npm run docs:check
npm run test:package
```

Relier chaque correction à une issue, expliquer le comportement obtenu et la validation réalisée. Un changement de source doit conserver l'URL, les dates, les unités et les marqueurs inconnus. Ajouter des tests pertinents sur les règles métier ou erreurs réellement couvertes ; ne pas tester seulement que l'implémentation s'appelle elle-même.

Les fixtures fournisseurs doivent être synthétiques ou nettoyées et ne contenir aucune clé, aucun token ou URL de téléchargement signée. Les tests de PR restent locaux ; les accès réseau réels passent par le workflow manuel et son rapport pass/fail/skipped/pending.

Pour ajouter un outil, utiliser addTool, déclarer les paramètres et leur limite, préciser le périmètre/pagination et enregistrer le module dans createServer. Régénérer le manifeste et COVERAGE après compilation. Pour ajouter un dataset spécialisé, mettre à jour les métadonnées et attentes de schéma en vérifiant la source officielle.

Utiliser `trash` pour supprimer les fichiers locaux plutôt qu'une suppression permanente. Les dossiers temporaires du test de paquet sont envoyés à la corbeille lorsque la commande est disponible, ou laissés à la gestion du runner éphémère.
