# Intégrations et nouvelles requêtes

Les fixtures dans `tests/fixtures/providers.json` sont synthétiques et ne contiennent aucun identifiant d'accès. Les tests de contrat couvrent listes et alertes LTA, arrivées de bus et leurs prochains véhicules vides, géocodage OneMap sans résultat, erreurs d'authentification et formats inattendus. Ils ne constituent pas une validation réelle avec des clés.

Pour valider réellement ces accès, utiliser le mode authentifié du workflow réseau avec des secrets d'environnement. Les parcours sans clé sont marqués skipped. Le jeton OneMap est généré/renouvelé manuellement sur https://www.onemap.gov.sg/apidocs/ ; le serveur n'enregistre pas de mot de passe et ne renouvelle pas de jeton en arrière-plan.

Les outils météo acceptent `station_id`, `area`, `region` (north/south/east/west/central/national), `limit` et `offset`. La limite porte sur les groupes de timestamps de la page courante. Consommer les offsets locaux avant de passer le jeton amont, conservé dans `pagination.upstream_pagination_token`. Les noms de station et coordonnées restent dans les métadonnées filtrées. `singapore_list_weather_stations` permet de choisir un ID.

Taxis et caméras acceptent désormais une pagination locale après filtrage par rayon ; les caméras acceptent aussi `camera_id`. Ce sont des instantanés mouvants : deux pages lues à des instants distincts peuvent différer. Les parkings conservent leurs valeurs brutes et ajoutent `lots` avec nombres, places occupées et pourcentage de disponibilité ; une valeur inconnue ou incohérente donne null.

Les listes LTA renvoient une continuation par offset jusqu'à une page vide. Les alertes non paginées n'en exposent pas. `bus_stop_code` est accepté pour bus_stops, `service_no` pour bus_services ; les combinaisons incompatibles échouent localement. L'outil d'arrêts proches limite les pages lues et indique explicitement si la recherche amont est complète.

Les filtres catalogue `status`, `coverage_year`, `updated_since` et `include_unknown_coverage` conservent le caractère inconnu des dates absentes. La recherche française utilise un dictionnaire borné de synonymes ; elle ne traduit pas librement toutes les phrases. Le lookup d'ID est local et la liste de collections est actuelle.

SingStat trie les périodes reconnues (année, trimestre, mois) avant sélection des dernières observations ; les libellés inconnus conservent l'ordre amont et génèrent un avertissement. `from_period`, `to_period` et `order` sont des filtres locaux après téléchargement. Les valeurs manquantes restent des chaînes.

Les requêtes tabulaires vérifient les noms de champ via les métadonnées mises en cache. Le registre ACRA détaillé se recherche avec `singapore_search_acra` en choisissant explicitement A-Z ou Others ; aucune recherche sur 27 partitions n'est implicite.
