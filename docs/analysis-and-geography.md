# Analyse HDB et proximité

`singapore_compare_hdb_prices` prend `towns` (1 à 5), `from_month`, `to_month`, et éventuellement `flat_type`. Il télécharge l'export CSV complet officiel, puis parcourt toutes ses lignes avec un parseur CSV à flux. Les groupes sont séparés par ville et type d'appartement. Les médianes et quartiles utilisent une interpolation linéaire ; le prix au m² n'inclut que les transactions avec surface positive connue. Les exclusions et le nombre de lignes parcourues sont retournés. Une collecte interrompue ne produit pas une estimation globale.

Exemple : `{"towns":["ANG MO KIO","BEDOK"],"flat_type":"4 ROOM","from_month":"2026-09","to_month":"2026-10"}`.

Le montant est en SGD, sans correction d'inflation ou de qualité. Une différence descriptive ne mesure pas l'effet causal d'un quartier et ne constitue pas une évaluation d'un bien. Les valeurs vides, na, tirets et nombres invalides ne sont jamais convertis en zéro.

`singapore_find_nearby_facilities` prend `category` parmi carparks, hawker_centres, preschools, parks et sport_facilities, puis latitude, longitude, radius_km, limit et offset. Les parkings HDB utilisent une jointure avec les disponibilités publiques ; une absence de correspondance donne availability:null. Les autres catégories exploitent les points GeoJSON. Les polygones, coordonnées absentes et référentiels inconnus ne sont pas transformés arbitrairement : les exclusions sont comptées. Le jeu preschools ne couvre pas les écoles primaires et secondaires.

`singapore_convert_coordinates` prend `from` (SVY21 ou WGS84), `x`, `y`. SVY21 utilise easting/northing en mètres ; WGS84 utilise longitude/latitude en degrés. Les [paramètres officiels SLA](https://app.sla.gov.sg/sirent/About/PlaneCoordinateSystem) sont implémentés via [Proj4js](https://proj4js.org/). Le parseur CSV est [csv-parse](https://csv.js.org/parse/api/async_iterator/).

Les exports sont initiés puis consultés via l'API officielle. L'état normalisé est initiated, pending, ready ou failed. Les exports GeoJSON peuvent renvoyer un lien prêt sans champ status ; cette variante est prise en charge. Une absence d'état et de lien reste pending. Les appels ordinaires renvoient l'état ; les outils d'analyse attendent au maximum trois polls, puis retournent EXPORT_PENDING si nécessaire.

Seuls les liens émis par le fournisseur pour le dataset demandé sont téléchargés en interne. Les origines et chemins sont vérifiés, les redirections et identifiants intégrés à une URL refusés. Maximum par téléchargement : 64 Mio ; maximum du cache d'exports : 64 Mio et 5 minutes ; maximum de téléchargements distincts simultanés : 2. Le délai de téléchargement est de 60 secondes et l'annulation MCP est transmise. Aucun fichier téléchargé ni URL signée n'est enregistré sur disque. Pour un export plus grand, utiliser directement le lien du fournisseur hors de la conversation.
