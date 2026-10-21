# Configuration et résultats

Le serveur lit sa configuration au démarrage et refuse une valeur invalide, sans en afficher le contenu. Node.js 22.12+ est recommandé ; la matrice CI utilise Node 22 et 24.

| Variable | Défaut | Usage |
|---|---:|---|
| MCP_SG_OUTPUT_BYTES | 120000 | Budget de sortie MCP ; aucune troncature JSON silencieuse |
| MCP_SG_HTTP_BYTES | 8388608 | Taille maximale de réponse JSON amont |
| MCP_SG_CACHE_BYTES | 20971520 | Budget mémoire des valeurs du cache |
| MCP_SG_CACHE_ENTRIES | 128 | Nombre maximal d'entrées du cache |
| MCP_SG_CACHE_TTL_SECONDS | non défini | Remplace les TTL spécifiques des outils ; 0 désactive le cache |
| MCP_SG_TIMEOUT_MS | 30000 | Délai total incluant attente de débit, téléchargement et retries |
| MCP_SG_QUEUE_LIMIT | 50 | Nombre maximal d'attentes de régulation simultanées |
| MCP_SG_QUEUE_WAIT_MS | 20000 | Attente maximale avant rejet QUEUE_FULL |
| DATA_GOV_SG_TIER | public | public/dev/prod ; dev et prod exigent une clé data.gov.sg |
| MCP_SG_STALE_DAYS | 730 | Seuil d'avertissement pour une publication ancienne |

Les plafonds du fournisseur restent applicables et peuvent changer. Le niveau n'est jamais déduit de la simple présence d'une clé. Les flux transport v1 gardent une cadence conservatrice indépendante du niveau v2.

Chaque succès expose `ok`, `served_at`, `data` et `sources`. Chaque source HTTP contient `source_url`, `fetched_at`, `cache_hit` et `age_seconds`. `served_at` est l'heure d'émission, `fetched_at` l'heure de téléchargement ; les timestamps d'observation restent ceux du fournisseur. Une réponse d'un autre processus n'utilise pas le cache de celui-ci.

`structuredContent` et le contenu texte JSON représentent le même résultat. Une erreur contient `ok: false`, `error_code`, un message et éventuellement fournisseur, statut HTTP et délai de retry. Les erreurs d'arguments validées par le SDK peuvent suivre son format MCP standard.

Codes : INVALID_ARGUMENT, AUTH_REQUIRED, AUTH_FAILED, RATE_LIMITED, UPSTREAM_UNAVAILABLE, UPSTREAM_ERROR, INVALID_RESPONSE, NETWORK_TIMEOUT, CANCELLED, QUEUE_FULL, OUTPUT_TOO_LARGE, INCOMPLETE_DATA, EXPORT_PENDING, NOT_FOUND.

En cas de dépassement du budget de sortie, réduire les limites/projections ou utiliser l'export. Les caches ne contiennent que des valeurs de réponse, sont bornés en octets et en entrées, et sont purgés à l'expiration. Les compteurs de diagnostic ne contiennent ni paramètres de clé ni valeurs d'en-têtes.
