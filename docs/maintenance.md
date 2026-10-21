# Maintenance

`npm run refresh:catalog` renouvelle toutes les pages dans une collecte neuve. Un changement de pagination, un doublon, un catalogue vide, le retrait d'un dataset spécialisé ou la disparition d'un champ attendu provoque un échec avant remplacement de l'index valide. Une variation d'effectifs supérieure à 10 % exige une revue puis l'option explicite `--accept-large-change`. Les erreurs temporaires respectent Retry-After jusqu'à 60 secondes, dans une limite de trois tentatives par requête. Reprendre une pagination mouvante depuis une ancienne page n'est pas fiable : la reprise contrôlée consiste à redémarrer la collecte.

Le script écrit un rapport de différences, actualise les métadonnées des jeux spécialisés et régénère les chiffres et outils documentés. `npm run check:schema` vérifie seulement les champs de référence, sans modifier les fichiers. Modifier `data/schema-expectations.json` exige une revue du mapping des outils concernés.

Les workflows de renouvellement et vérification fournisseur sont manuels. Aucun nouveau suivi récurrent n'est configuré. Le workflow catalogue propose une PR de revue, sans fusion automatique ; le dépôt doit autoriser les PR créées par GitHub Actions. Le workflow réseau core/all/auth stocke le rapport comme artefact. Les secrets facultatifs se configurent dans les settings Actions du dépôt ; leur absence reste un statut skipped explicite et ne devient pas une validation authentifiée.

`npm run docs:generate` produit README (bloc chiffré), COVERAGE.md et data/tool-manifest.json depuis le registre réel des outils. `npm run docs:check` échoue si les fichiers dérivés divergent. Compiler avant ces commandes.

Le rapport réseau distingue pass, fail, skipped et pending. Un export en attente ne prouve pas la réussite du cycle. Les paramètres non sensibles testés sont conservés ; les clés ne font jamais partie des arguments.
