# Versions et distribution

Le code est public sur GitHub. La publication npm reste une étape explicite avec les droits sur @hug0x0 ; ce document ne signifie pas qu'une version est déjà disponible dans le registre.

1. Mettre à jour CHANGELOG.md et la version avec `npm version <version> --no-git-tag-version`.
2. Exécuter `npm ci`, `npm run build`, `npm test`, `npm run docs:generate`, `npm run docs:check`, `npm run test:package` et `npm audit`.
3. Vérifier les changements, committer et pousser. Les versions du serveur et User-Agent proviennent du manifeste ; la CI vérifie aussi le paquet réellement installé dans un dossier isolé.
4. Une fois les accès npm configurés, publier explicitement avec `npm publish --access public` (avec provenance lorsque l'environnement de publication le permet). Aucun workflow de push ne publie automatiquement sur npm.
5. Après publication effective, vérifier `npx --yes --package @hug0x0/mcp-singapore@<version> mcp-singapore` via un client stdio, créer un tag/release correspondant au commit et actualiser la mention non publié du README.

L'archive contient dist, les métadonnées embarquées, le manifeste d'outils, la documentation et les scripts de maintenance. Elle ne contient pas de .env, clé ou node_modules. Un nom de paquet défini dans package.json ne prouve pas sa disponibilité dans le registre.
