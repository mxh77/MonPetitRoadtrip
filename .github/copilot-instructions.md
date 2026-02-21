# Mon Petit Roadtrip — Instructions Copilot

## Stack technique
- **Frontend** : React Native + Expo SDK 54, New Architecture, React 19
- **Backend** : Node.js + Express + Prisma ORM
- **Base de données** : PostgreSQL via Supabase (région Frankfurt)
- **Sync offline** : PowerSync Cloud
- **Auth** : JWT maison (jsonwebtoken) côté backend

## Structure du projet
```
MonPetitRoadtrip/
├── frontend/          # Expo React Native
│   ├── src/
│   │   ├── screens/
│   │   ├── store/       # Zustand stores
│   │   ├── hooks/       # usePowerSync.js — hooks réactifs PowerSync
│   │   ├── powersync/   # schema.js, connector.js, db.js, PowerSyncProvider.js
│   │   └── api/         # client axios + config URL
│   └── android/         # Généré par expo prebuild
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/  # auth.js
│   │   └── lib/         # prisma.js
│   └── prisma/
└── build-android.sh   # Build Android local
```

## Build Android
- Utiliser `./build-android.sh` depuis la racine pour compiler et déployer sur téléphone
- `JAVA_HOME` doit utiliser le chemin court Windows sans espaces : `C:\PROGRA~1\Java\jdk-20`
- Après `npx expo prebuild --clean`, vérifier que `gradle.properties` contient encore `org.gradle.java.home`
- `npx expo start -c` seul = JS uniquement, ne compile pas les modules natifs
- Modules natifs (ex: `@journeyapps/react-native-quick-sqlite`) requièrent un rebuild complet

## PowerSync — règles importantes

### JWT
- Le backend génère le token PowerSync via `GET /api/auth/powersync-token`
- Le secret est en base64url dans `.env` → le passer en `Buffer.from(secret, 'base64url')` à `jwt.sign()` car PowerSync décode le secret depuis base64url côté vérification
- **`token_parameters.sub` ne fonctionne PAS dans les sync rules** — il faut ajouter un claim custom explicite :
  ```js
  jwt.sign({ sub: userId, user_id: userId, ... }, secret, { ... })
  ```
- Dans les sync rules, utiliser `token_parameters.user_id` (pas `.sub`)

### Sync Rules
```yaml
bucket_definitions:
  user_roadtrips:
    parameters:
      - SELECT token_parameters.user_id as user_id
    data:
      - SELECT ... FROM roadtrips WHERE "userId" = bucket.user_id
```
- Les colonnes camelCase Prisma/PostgreSQL doivent être entre guillemets doubles : `"startDate"`, `"userId"`, etc.
- Pas de sous-requêtes dans les WHERE des sync rules — utiliser `userId` directement sur chaque table
- Toutes les tables syncées (`roadtrips`, `steps`, `accommodations`, `activities`) doivent avoir un champ `userId`

### Données existantes
- Les enregistrements créés avant l'ajout de `userId` ont `userId = null` → ils ne seront jamais syncés
- Corriger via SQL dans Supabase : `UPDATE roadtrips SET "userId" = '...' WHERE "userId" IS NULL`

### Architecture lecture/écriture
- **Lecture** : via PowerSync (SQLite local, réactif, offline-first)
- **Écriture** : via `localWrite.js` → SQLite local (immédiat, fonctionne offline)
- `uploadData` dans le connecteur : traite la queue CRUD PowerSync → appelle `PUT/PATCH/DELETE /api/{table}/{id}` quand le réseau revient
- Le backend expose des routes `PUT /:id` (upsert) car l'ID est généré côté client
- `roadtripStore.js` délègue toutes les mutations à `localWrite.js` (plus d'appels API directs)

## Prisma / Supabase
- `DATABASE_URL` = pooler Supabase port 6543 avec `?pgbouncer=true` (obligatoire pour éviter `prepared statement "s0" already exists`)
- `DIRECT_URL` = connexion directe port 5432 pour les migrations et PowerSync
- Publication nécessaire pour PowerSync : `CREATE PUBLICATION powersync FOR TABLE roadtrips, steps, accommodations, activities, photos`

## Patterns de code

### Hooks PowerSync (lecture réactive)
```js
import { useQuery } from '@powersync/react-native';
export function useRoadtrips() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useQuery(
    userId ? 'SELECT * FROM roadtrips WHERE userId = ? ORDER BY createdAt DESC' : 'SELECT * FROM roadtrips WHERE 1=0',
    userId ? [userId] : []
  );
  return { roadtrips: data ?? [], isLoading };
}
```

### Navigation après création
Passer les données créées en params pour éviter le spinner en attendant la sync :
```js
navigation.replace('RoadtripDetail', { id: roadtrip.id, title: roadtrip.title, roadtripData: roadtrip });
// Dans l'écran :
const currentRoadtrip = syncedRoadtrip ?? (roadtripData ? { ...roadtripData, steps: [] } : null);
```

### Backend — route PowerSync token
```js
router.get('/powersync-token', auth, async (req, res) => {
  const psSecret = Buffer.from(process.env.POWERSYNC_JWT_SECRET, 'base64url');
  const psToken = jwt.sign(
    { sub: req.user.userId, user_id: req.user.userId, iat: Math.floor(Date.now() / 1000) },
    psSecret,
    { expiresIn: '1h', audience: process.env.POWERSYNC_URL, keyid: process.env.POWERSYNC_JWT_KID }
  );
  res.json({ token: psToken, powersyncUrl: process.env.POWERSYNC_URL });
});
```

## Variables d'environnement backend (.env)
```
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...           # sans pgbouncer, port 5432
JWT_SECRET=...
POWERSYNC_URL=https://xxx.powersync.journeyapps.com
POWERSYNC_JWT_SECRET=...              # base64url, 32 bytes
POWERSYNC_JWT_KID=...                 # UUID
PORT=3000
```

## Lancer le projet en dev
```bash
# Terminal 1 — Backend
cd backend && node src/index.js

# Terminal 2 — Frontend (après build natif déjà fait)
cd frontend && npx expo start -c
```
