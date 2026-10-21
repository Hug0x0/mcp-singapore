# mcp-singapore

Serveur MCP TypeScript pour explorer les données publiques de **Singapour**, dans le même esprit que `mcp-reunion` : outils spécialisés, recherche de catalogue et accès générique aux données.

<!-- coverage-summary:start -->
**64 outils · 22 jeux spécialisés · 4664 datasets · 74 agences.** Snapshot : 2026-10-21.
<!-- coverage-summary:end -->

L’index embarqué couvre le catalogue data.gov.sg. Il contient des métadonnées, pas une copie de toutes les observations. Les lignes sont lues à la demande ; les formats non tabulaires utilisent des exports contrôlés. Voir les limites et périodes dans COVERAGE.md.

## Données accessibles

| Domaine | Accès |
|---|---|
| Logement | Transactions HDB depuis 2017, locations, loyers médians, indices de prix privés, population HDB |
| Entreprises | Registre UEN/ACRA ; partitions détaillées ACRA accessibles par catalogue et collections |
| Éducation | Annuaire des écoles ; autres statistiques via catalogue et SingStat |
| Alimentation | Hawker centres et dates de fermeture |
| Santé | Bulletin des maladies infectieuses, aides et dispositifs de santé |
| Culture et sport | Fréquentation des musées, équipements sportifs |
| Tourisme | Arrivées de visiteurs et statistiques hôtelières |
| Environnement | Recyclage, émissions de gaz à effet de serre, qualité de l'air annuelle |
| Météo et pollution | Température, pluie, humidité, vitesse/direction du vent ; prévisions 2 h / 24 h / 4 jours ; PSI, PM2.5, UV |
| Transport public | Positions des taxis disponibles, places de parking, caméras ; bus et autres flux LTA avec clé |
| Géographie | Superficie, adresses et géocodage inverse OneMap avec jeton ; couches géographiques via catalogue/export |
| Économie et société | Chômage, dépenses publiques ; recherche et lecture des tables SingStat |
| Comparaisons internationales | Indicateurs Banque mondiale pour Singapour et jusqu'à cinq pays comparés |

Le catalogue couvre aussi les recensements, revenus, commerce, énergie, CPF, urbanisme, infrastructures et de nombreux autres sujets. La période, la fraîcheur et les définitions dépendent de chaque jeu : un jeu historique n'est pas présenté comme une mesure actuelle.

## Installation locale

```bash
git clone https://github.com/Hug0x0/mcp-singapore.git
cd mcp-singapore
npm ci
npm run build
npm test
npm run test:smoke
```

Configuration d'un client MCP compatible `stdio` :

```json
{
  "mcpServers": {
    "singapore": {
      "command": "node",
      "args": ["/chemin/absolu/vers/mcp-singapore/dist/index.js"]
    }
  }
}
```

Remplacer le chemin ci-dessus par le chemin absolu du projet cloné. Le code source est disponible sur [GitHub](https://github.com/Hug0x0/mcp-singapore). Le nom npm `@hug0x0/mcp-singapore` figure dans le manifeste, mais la publication n'est pas effectuée : utiliser la configuration locale ci-dessus.

## Clés facultatives et accès authentifiés

Les outils publics data.gov.sg, SingStat et Banque mondiale ont été prévus pour fonctionner sans clé, sous réserve des quotas du fournisseur. Une clé data.gov.sg est recommandée en production. LTA et OneMap nécessitent leurs propres identifiants.

| Variable | Rôle |
|---|---|
| `DATA_GOV_SG_API_KEY` | Clé data.gov.sg, envoyée dans `x-api-key` |
| `LTA_ACCOUNT_KEY` | Clé DataMall, pour les arrivées de bus et `singapore_query_lta` |
| `ONEMAP_TOKEN` | Jeton OneMap, pour chercher une adresse et le géocodage inverse |

Passer ces variables dans `env` de la configuration MCP ou dans l'environnement du processus. Le fichier `.env.example` est un modèle ; le serveur ne charge pas automatiquement de fichier `.env`. Les secrets sont transmis uniquement dans les en-têtes HTTP, jamais dans les arguments des outils ou les URL.

```json
{
  "mcpServers": {
    "singapore": {
      "command": "node",
      "args": ["/chemin/absolu/vers/mcp-singapore/dist/index.js"],
      "env": {
        "DATA_GOV_SG_API_KEY": "votre-cle-data-gov-sg",
        "LTA_ACCOUNT_KEY": "votre-cle-lta",
        "ONEMAP_TOKEN": "votre-jeton-onemap"
      }
    }
  }
}
```

Créer les accès auprès de [data.gov.sg](https://guide.data.gov.sg/developer-guide/api-overview/how-to-request-an-api-key), [LTA DataMall](https://datamall.lta.gov.sg/) et [OneMap](https://www.onemap.gov.sg/apidocs/). Ne renseigner que les variables des services utilisés. Le renouvellement d'un jeton OneMap expiré se fait auprès du fournisseur.

## Workflow de recherche

1. `singapore_find_relevant_tools` comprend des mots-clés français ou anglais et suggère des outils.
2. `singapore_search_catalog` recherche localement dans l'index complet, avec filtre d'agence et de format. Utiliser des mots-clés anglais pour les titres des jeux.
3. `singapore_inspect_dataset` retourne les métadonnées à jour et les noms de colonnes.
4. `singapore_query_dataset` lit les lignes avec filtres, recherche par colonne, tri, projection et pagination.
5. `singapore_download_dataset` permet d'initier puis de consulter un export si Datastore ne convient pas.

```json
{"query":"resale flat prices","limit":5}
```

Puis `singapore_query_hdb_resale` :

```json
{"filters":{"town":"ANG MO KIO","flat_type":"4 ROOM"},"sort":"month desc","limit":10,"offset":0}
```

Les filtres sont des égalités exactes, sensibles à la représentation de la source. La recherche `q` est un objet de recherche par colonne, par exemple `{"school_name":"RAFFLES"}`. Inspecter les champs avant de les utiliser. Les valeurs numériques peuvent être des chaînes ; les marqueurs de valeurs manquantes sont conservés.

Pour SingStat : `singapore_search_statistics({"query":"population"})`, puis `singapore_inspect_statistics({"resource_id":"M810001"})` et `singapore_get_statistics({"resource_id":"M810001","series_contains":"Total Population","period_limit":5})`. Le filtrage des séries et la limite de périodes sont locaux, après lecture de la table ; `period` peut limiter en amont à une période exacte. Les dernières périodes désignent l'ordre fourni par SingStat.

## Outils et ressources

La liste complète et les jeux spécialisés sont documentés dans [COVERAGE.md](COVERAGE.md).

Ressources : `singapore://sources`, `singapore://coverage`, `singapore://usage`, `singapore://topics`.

Prompt : `research-singapore` avec l'argument `question`.

Réponses : `served_at` indique l'heure d'émission MCP, `source_url` la requête source, `data` les résultats. Les dates d'observation/mise à jour du fournisseur et la date de l'index font référence pour la fraîcheur. Les caches sont locaux au processus : 30–60 s pour le transport, 60 s pour météo/Datastore, jusqu'à 1 h pour métadonnées/statistiques. Aucun service de télémétrie.

Le serveur limite les tailles de page, conserve les marqueurs de pagination et limite chaque réponse HTTP à 8 Mio. Les requêtes Datastore, météo et exports sont espacées pour respecter les quotas publics usuels ; les erreurs 429 et `Retry-After` sont gérées. Les origines réseau sont fixes et les redirections refusées.

## Maintenance et validation

```bash
npm run refresh:catalog       # renouvelle l'index complet, ~467 pages lors de la création
npm run build
npm test                      # tests locaux sans accès réseau
npm run test:smoke            # vérification réelle des principaux services publics
npm run test:smoke -- --all   # vérifie aussi les 22 jeux spécialisés et les flux météo/transport publics
npm audit
npm pack --dry-run
```

Le script de renouvellement remplace l'index seulement après la réussite de toutes les pages. Une mise à jour peut modifier les effectifs et les schémas ; vérifier les outils spécialisés ensuite. Les nouveaux datasets sont accessibles en direct par `singapore_list_catalog_page`, même avant renouvellement de l'index local.

Les résultats de la dernière vérification réseau sont dans [docs/live-verification.json](docs/live-verification.json). Une réussite ne garantit pas la disponibilité future d'une API. Les parcours authentifiés LTA et OneMap nécessitent des identifiants pour une validation réelle.

## Sources

- [data.gov.sg : documentation développeur](https://guide.data.gov.sg/developer-guide)
- [SingStat : API développeur](https://tablebuilder.singstat.gov.sg/view-api/for-developers/test)
- [LTA : guide API](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf)
- [OneMap : documentation](https://www.onemap.gov.sg/apidocs/)
- [Banque mondiale : API](https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information)

## Licence

Code : MIT. Structure inspirée des MCP existants de Hug0x0, dont `mcp-reunion`. Les données restent soumises aux conditions de leurs fournisseurs ; conserver leurs attributions et consulter les métadonnées du jeu utilisé. [Singapore Open Data Licence](https://data.gov.sg/open-data-license).

## Améliorations 0.2

Les nouveaux outils comprennent le diagnostic des capacités, la résolution locale d’un ID, les collections, ACRA détaillé, les stations météo, les arrêts proches, la conversion de coordonnées, les équipements proches et les comparaisons HDB sur export complet.

Documentation : [configuration](docs/configuration.md), [contrats fournisseurs](docs/provider-contracts.md), [analyse et géographie](docs/analysis-and-geography.md), [maintenance](docs/maintenance.md), [publication](docs/release.md), [contributions](CONTRIBUTING.md), [changelog](CHANGELOG.md). Les parcours nécessitant des identifiants restent explicitement non vérifiés en conditions réelles sans ces identifiants.
