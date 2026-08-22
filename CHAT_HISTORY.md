# AIMOS — Historique complet de la session de développement

## Date : 10 Août 2026

---

## 1. CONTEXTE DU PROJET

### Informations générales
- **Nom** : AIMOS — Airport Intelligent Maintenance Operations System
- **But** : Plateforme de maintenance intelligente pour aéroports marocains
- **Créateur** : Oussama AIT ELKABIR (PFE)
- **Architecture** : Django (backend) + React/Vite (frontend) + PostgreSQL + Docker

### Structure des dossiers
```
C:\Users\aitel\OneDrive\Desktop\AIMOS-PFA\
├── backend/              (Django)
│   ├── aimos/
│   │   ├── apps/users/   (seule app backend créée)
│   │   ├── settings.py
│   │   └── urls.py
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/             (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── services/
│   │   ├── config/
│   │   ├── layouts/
│   │   ├── styles/
│   │   ├── i18n/
│   │   └── hooks/
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── docs/                 (maquettes PNG)
```

### Docker Compose
- `aimos_db` : PostgreSQL 16 (port 5432)
- `aimos_backend` : Django (port 8000)
- `aimos_frontend` : React/Vite (port 3000)
- `aimos_pgadmin` : PgAdmin4 (port 5050)

### Credentials
- DB : `aimosdb / aimos / aimos123`
- PgAdmin : `admin@example.com / admin123`
- Admin app : `admin` (mot de passe dans table `user_plain_password`)

---

## 2. CE QUI ÉTAIT DÉJÀ FAIT AVANT CETTE SESSION

- ✅ Auth backend : login/logout/me par session
- ✅ CRUD utilisateurs (API + frontend)
- ✅ Dashboard connecté à `/api/users/`
- ✅ Traduction FR/EN (LanguageContext)
- ✅ Protected routes (ProtectedRoute)
- ✅ Layout avec sidebar + topbar
- ✅ Pages placeholders : Equipment, Interventions, Alerts
- ✅ Bug fix : `/api/auth/me/` 500 → 401 (migrations Django)
- ✅ Frontend `Layout.jsx` missing `useEffect` import fixé

---

## 3. TRAVAIL RÉALISÉ DANS CETTE SESSION

### 3.1 Dashboard transformé en style Power BI

**Fichiers modifiés/créés :**
- `frontend/package.json` — ajouté `recharts: 2.15.0` et `react-icons: 4.12.0`
- `frontend/src/pages/DashboardPage.jsx` — nouveau dashboard avec graphiques :
  - KPI cards (avec icônes react-icons, pas d'emojis)
  - LineChart : interventions mensuelles (préventive vs corrective)
  - PieChart (donut) : équipements par catégorie
  - AreaChart empilé : tendance des alertes (30 jours)
  - BarChart : interventions par priorité
  - RadialBarChart : santé des équipements (%)
  - Panel IA : prédictions de pannes avec barres de risque
  - Tableau utilisateurs en ligne
- `frontend/src/styles/dashboard.css` — styles Power BI (grille 2 colonnes, cards, responsive)

**Note :** Le texte "Vue d'ensemble..." sous le titre a été supprimé.

### 3.2 Hot Reload Docker fixé

**Problème :** Les modifications de fichiers ne déclenchaient pas le rechargement dans Docker sur Windows.

**Solution :** Ajouté `watch.usePolling: true` dans `vite.config.js` :
```js
server: {
  host: '0.0.0.0',
  port: 3000,
  watch: {
    usePolling: true,
    interval: 1000,
  },
  ...
}
```

### 3.3 Problème node_modules dans Docker

**Problème :** Le volume anonyme `/app/node_modules` dans Docker ne contenait pas les nouvelles dépendances (recharts, react-icons).

**Solution :** Changé la commande du frontend dans `docker-compose.yml` :
```yaml
command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
```

**Pour reconstruire :**
```bash
docker compose down
docker compose up -V -d
```
Le flag `-V` supprime les volumes anonymes et force un npm install propre.

**Note importante :** Ne PAS supprimer le volume anonyme `/app/node_modules` du docker-compose car les binaires natifs (rollup) Windows ≠ Linux. Le container doit faire son propre `npm install`.

### 3.4 Contrôle d'accès par rôle (RBAC)

**Fichiers créés :**
- `frontend/src/config/roles.js` — configuration centralisée :
  - `ROLES` : constantes (Admin, Responsable maintenance, Technicien, Responsable exploitation)
  - `SIDEBAR_CONFIG` : items sidebar par rôle
  - `ALLOWED_ROUTES` : routes autorisées par rôle
  - `DEFAULT_ROUTE` : redirection par défaut après login
  - Fonctions utilitaires : `getSidebarForRole()`, `canAccessRoute()`, `getDefaultRoute()`

- `frontend/src/contexts/AuthContext.jsx` — modifié :
  - Expose `userRole` en plus de `user`
  - Fonction `resolveRole(user)` qui mappe `role_title` backend → constantes ROLES

- `frontend/src/components/RoleBasedRoute.jsx` — nouveau :
  - Vérifie `canAccessRoute(userRole, path)`
  - Redirige vers `getDefaultRoute(userRole)` si non autorisé

- `frontend/src/layouts/Layout.jsx` — modifié :
  - Sidebar dynamique via `getSidebarForRole(userRole)`
  - Affiche le rôle sous le nom dans la topbar

- `frontend/src/App.jsx` — modifié :
  - Toutes les routes `/app/*` enveloppées par `<RoleBasedRoute>`

**Matrice des accès implémentée :**

| Route | Admin | Resp. Maintenance | Technicien | Resp. Exploitation |
|-------|-------|-------------------|------------|-------------------|
| /app/dashboard | ✅ | ✅ | ✅ | ✅ |
| /app/users | ✅ | ❌ | ❌ | ❌ |
| /app/equipment | ✅ | ✅ | ✅ (lecture) | ✅ (lecture) |
| /app/interventions | ✅ | ✅ | ❌ | ✅ (lecture) |
| /app/my-interventions | ❌ | ❌ | ✅ | ❌ |
| /app/alerts | ✅ | ✅ | ✅ | ✅ |
| /app/planning | ❌ | ✅ | ❌ | ❌ |
| /app/analytics | ❌ | ❌ | ❌ | ✅ |
| /app/roles | ✅ | ❌ | ❌ | ❌ |
| /app/audit-logs | ✅ | ❌ | ❌ | ❌ |
| /app/settings | ✅ | ❌ | ❌ | ❌ |

### 3.5 Nouvelles pages créées

- `frontend/src/pages/MyInterventionsPage.jsx` — pour Techniciens :
  - Filtres par onglets (Toutes, Affectée, En cours, Clôturée)
  - Cards d'interventions (pas tableau)
  - Modal détail avec actions Démarrer / Clôturer
  
- `frontend/src/pages/PlanningPage.jsx` — pour Resp. Maintenance :
  - Table des interventions planifiées

- `frontend/src/pages/AnalyticsPage.jsx` — pour Resp. Exploitation :
  - LineChart MTTR, BarChart disponibilité par zone
  - PieChart types d'interventions, KPIs

- `frontend/src/styles/interventions.css` — styles pour cards interventions, tabs, badges priorité/statut

### 3.6 Traductions ajoutées

Clés ajoutées dans `frontend/src/i18n/translations.js` (FR + EN) :
- `sidebar.my_interventions`, `sidebar.planning`, `sidebar.analytics`
- `dashboard.chart_*` (toutes les clés graphiques)
- `technician.*` (my_interventions, filter_all, start_intervention, close_intervention, etc.)
- `planning.*` (title, reference, equipment, technician, date, status, etc.)
- `analytics.*` (title, mttr, availability_zone, intervention_types, kpis, etc.)

---

## 4. EN COURS / PROCHAINE ÉTAPE

### Task list active : Équipement Management

D'après les maquettes reçues, les pages Équipement doivent inclure :

**Page liste (EquipmentPage.jsx) :**
- 4 KPI cards : Total Equipment, Operational, Under Maintenance, Out of Service
- Barre de recherche + filtres (Airport, Category, Status, Criticality)
- Onglets : All Equipment | Operational | Under Maintenance | Out of Service | Due for Maintenance
- Table paginée : Equipment ID, Name/Model, Category (badge), Airport, Location, Status (badge point coloré), Criticality (badge), Last Maintenance, Next Maintenance (avec countdown "In X days" ou "Overdue")
- Actions : View (œil), Edit (crayon), More (...)
- Pagination avec sélecteur (10/25/50 par page)
- Bouton "+ Add Equipment" (visible seulement pour Admin et Resp. Maintenance)

**Panel latéral (EquipmentFormPanel.jsx) :**
- Slide-out depuis la droite
- Champs : Equipment ID (auto-generated), Name*, Model, Category*, Airport*, Location, Criticality*, Installation Date, Description, Status*
- Indicateurs de criticité colorés (Low vert, Medium orange, High rouge, Critical violet)

**Page détail (EquipmentDetailPage.jsx) :**
- Header : cards résumé (Status, Criticality, Location, Category, Next Maintenance)
- Onglets : Overview, Technical Information, Maintenance History, Documents, Linked Interventions, Alerts
- Overview : General Information + Status Information + Health Score (gauge)
- Key Indicators : Temperature, Humidity, Air Flow, Power Consumption, Runtime
- Recent Interventions : mini-table
- Sidebar droite : Location Details, Linked Information (counts)
- Boutons : Edit Equipment, More Actions

**Tâches restantes :**
1. ⬜ Create EquipmentPage.jsx (commencé mais interrompu)
2. ⬜ Create EquipmentFormPanel.jsx
3. ⬜ Create EquipmentDetailPage.jsx
4. ⬜ Create equipment.css
5. ⬜ Update translations.js with equipment labels
6. ⬜ Update routing for /app/equipment/:id
7. ⬜ Verify build

---

## 5. PROBLÈMES CONNUS / NOTES TECHNIQUES

### Docker / Réseau
- Docker sur la machine a parfois des problèmes DNS (`dial tcp: lookup auth.docker.io: no such host`)
- Solution : vérifier VPN/proxy, ou utiliser `docker exec` pour installer dans le container
- Les images `node:20-alpine` et `python:3.12-slim` sont en cache local

### Architecture node_modules
- Le `docker-compose.yml` utilise un volume anonyme `/app/node_modules` pour isoler les binaires Linux du Windows local
- La commande `sh -c "npm install && npm run dev -- --host 0.0.0.0"` s'assure que les dépendances sont installées au démarrage
- Pour ajouter une dépendance : modifier `package.json` puis `docker compose up -V -d`

### Backend — Modèles manquants
- Seule l'app `users` existe côté Django
- Il faudra créer les apps : `equipment`, `sensors`, `interventions`, `alerts`, `ai`
- Les données frontend sont actuellement simulées (MOCK)

### Mot de passe utilisateurs
- Mots de passe auto-générés format `EMP-XXX`
- Stockés en clair dans table `user_plain_password`
- Username auto-généré : `EMP{id:04d}` (ex: EMP0002)
- Vérifiable : `SELECT * FROM user_plain_password WHERE user_id = X;`

### Rôles dans le backend
- Stockés dans `UserProfile.role_title` (table `users_userprofile`)
- Valeurs attendues : `"Technicien"`, `"Responsable maintenance"`, `"Responsable exploitation"`
- Si vide ou `"Admin"` → traité comme Admin dans le frontend

---

## 6. FICHIERS CLÉS (référence rapide)

| Fichier | Description |
|---------|-------------|
| `frontend/src/config/roles.js` | Config RBAC centralisée |
| `frontend/src/contexts/AuthContext.jsx` | Auth + userRole |
| `frontend/src/components/RoleBasedRoute.jsx` | Garde de route par rôle |
| `frontend/src/layouts/Layout.jsx` | Sidebar dynamique |
| `frontend/src/App.jsx` | Toutes les routes |
| `frontend/src/pages/DashboardPage.jsx` | Dashboard Power BI |
| `frontend/src/styles/dashboard.css` | Styles dashboard |
| `frontend/src/styles/admin.css` | Styles globaux admin |
| `frontend/src/styles/interventions.css` | Styles interventions |
| `frontend/src/i18n/translations.js` | Traductions FR/EN |
| `frontend/src/services/userService.js` | API utilisateurs |
| `frontend/src/services/authService.js` | API auth |
| `frontend/vite.config.js` | Config Vite + proxy + polling |
| `docker-compose.yml` | Orchestration Docker |
| `backend/aimos/apps/users/serializers.py` | Sérialiseur utilisateurs |
| `backend/aimos/apps/users/views.py` | Vues API |
| `backend/aimos/apps/users/models.py` | UserProfile |
| `backend/aimos/settings.py` | Config Django |

---

## 7. COMMANDES UTILES

```bash
# Démarrer tout (avec rebuild)
docker compose up --build -V -d

# Voir les logs frontend
docker compose logs -f frontend

# Installer une dépendance dans le container
docker exec aimos_frontend npm install <package>

# Build local (vérification)
cd frontend && npm run build

# Accéder à la DB
docker exec -it aimos_db psql -U aimos -d aimosdb

# Voir les mots de passe
docker exec -it aimos_db psql -U aimos -d aimosdb -c "SELECT u.username, p.password FROM auth_user u JOIN user_plain_password p ON p.user_id = u.id;"
```

---

## 8. MAQUETTES REÇUES

- `docs/equipement-management.png` — page liste équipements
- `docs/add-equipement.png` — formulaire ajout (slide-out panel)
- `docs/equipement-details.png` — page détail équipement
- `docs/dashboard-admin.png` — dashboard admin
- `docs/user management-admin.png` — gestion utilisateurs
- `docs/profile.png` — profil utilisateur
- `docs/locations management.png` — gestion localisations
- `docs/sensor chart.png` — graphiques capteurs
- `docs/import Data.png` — import données

---

*Fin de l'historique — Session du 10/08/2026*


---

## ADDENDUM — Équipement Management (même session, 23:30+)

### Travail réalisé

**Fichiers créés :**
- `frontend/src/pages/EquipmentPage.jsx` (308 lignes) — page liste
  - 4 KPI cards (Total, Operational, Under Maintenance, Out of Service)
  - Barre de recherche + 4 filtres (Airport, Category, Status, Criticality)
  - 5 onglets avec compteurs
  - Table paginée avec badges statut/criticité
  - Boutons actions : view (œil), edit (crayon) — edit visible seulement pour Admin/Resp. Maintenance
  - Pagination avec sélecteur 10/25/50

- `frontend/src/pages/EquipmentFormPanel.jsx` (208 lignes) — formulaire slide-out
  - Panel latéral droit avec backdrop + animation slideIn
  - Champs : ID (auto), Name*, Model, Category*, Airport*, Location, Criticality* (avec légende couleur), Installation Date, Description, Status*
  - **Upload image** avec preview et bouton supprimer
  - Boutons Cancel / Save Equipment

- `frontend/src/pages/EquipmentDetailPage.jsx` (326 lignes) — page détail
  - Breadcrumb navigable
  - 5 summary cards (Status, Criticality, Location, Category, Next Maintenance)
  - 6 onglets : Overview, Technical Information, Maintenance History, Documents, Linked Interventions, Alerts
  - Overview : 2 panels info (General + Status) avec health score SVG gauge
  - Key Indicators : 5 cards (Temperature, Humidity, Air Flow, Power, Runtime)
  - Recent Interventions : mini-table
  - Sidebar droite : Image/placeholder, Location Details, Linked Information
  - Bouton "Edit Equipment" (conditionnel au rôle)

- `frontend/src/styles/equipment.css` (933 lignes) — styles complets
  - KPI cards, toolbar, tabs, table, badges, pagination
  - Form panel slide-out avec animation
  - Detail page layout (grid 2 colonnes), info panels, indicators
  - Image upload/preview
  - Responsive (1200px, 768px)

- `frontend/src/i18n/translations.js` — 72 clés ajoutées (FR + EN) pour equipment
- `frontend/src/App.jsx` — import EquipmentDetailPage + route `/app/equipment/:id`

### Build vérifié
- ✅ 870 modules, 0 erreurs, 4.21s
- CSS: 33.63kB, JS: 695.16kB

### Prochaines étapes possibles
- Connecter les pages équipement à une vraie API backend (créer app Django `equipment`)
- Implémenter les interfaces Interventions (cycle complet)
- Implémenter Alertes & Notifications
- Module IA (prédictions, recommandations)
- Capteurs (import CSV, graphiques)


---

## SESSION 2 — 11 Août 2026

### Corrections et ajustements des rôles

1. **Admin simplifié** → ne voit que : Admin Dashboard + Utilisateurs
2. **Page Rôles supprimée** (`/app/roles`) — les rôles se définissent dans le formulaire utilisateur
3. **Pages Journaux d'audit et Paramètres supprimées** — pas prioritaires
4. **Page Planning supprimée** — la page Interventions gère tout (filtres par statut suffisent)
5. **Bouton déconnexion sidebar supprimé** + cercle profil topbar supprimé
6. **Breadcrumbs supprimés** de toutes les pages (UsersPage, EquipmentPage, EquipmentDetailPage)
7. **Dashboard opérationnel** : retiré le tableau "Utilisateurs en ligne" et le KPI utilisateurs → remplacé par "Disponibilité 85%"
8. **Dashboard pas accessible** pour Admin ni Technicien
9. **Rôle Superviseur ajouté** — full surveillance sans gestion utilisateurs

### Admin Dashboard créé (`/app/admin-dashboard`)
- 4 KPI cards : Total utilisateurs, Actifs, En ligne, Inactifs
- PieChart : répartition utilisateurs par rôle
- BarChart : connexions des 7 derniers jours
- Tableau : tous les utilisateurs avec statut online/offline

### Page Interventions créée (pour Resp. maintenance)
- 4 KPI cards : Total, En cours, Clôturées, En attente
- Recherche + filtres (type, priorité)
- 5 onglets : Toutes, Planifiées, Affectées, En cours, Clôturées
- Table : ID, Équipement, Type (badge), Priorité (badge), Technicien, Statut, Date
- Bouton "+ Nouvelle intervention" → slide-out panel avec formulaire (équipement, type, priorité, technicien, description)

### Page Alertes créée
- 4 KPI cards : Critiques, Actives, Prises en charge, Résolues
- Recherche + filtre niveau
- 4 onglets : Toutes, Actives, Prises en charge, Résolues
- Table : ID, Équipement, Capteur, Valeur/Seuil, Niveau (badge), Statut, Date, Actions
- Modal détail quand on clique sur l'œil

### Page Profil (en cours)
- `ProfilePage.jsx` créé : infos personnelles + formulaire changement mot de passe
- Route `/app/profile` ajoutée (accessible à tous, pas dans la sidebar)
- Nom dans la topbar rendu cliquable → navigue vers `/app/profile`
- **Note** : les traductions FR/EN pour profile sont EN COURS d'ajout

### Backend — Apps Equipment + Sensors créées

**App `equipment` :**
- Models : `EquipmentCategory`, `Equipment` (sans Airport — app mono-aéroport)
- Serializers : `EquipmentCategorySerializer`, `EquipmentListSerializer`, `EquipmentDetailSerializer`
- Views : list/create, detail par reference, stats endpoint
- URLs : `/api/equipment/`, `/api/equipment/stats/`, `/api/equipment/categories/`, `/api/equipment/<ref>/`

**App `sensors` :**
- Models : `Sensor` (9 types: temperature, humidity, vibration, pressure, power, airflow, voltage, current, runtime), `SensorReading`
- Serializers : `SensorSerializer`, `SensorReadingSerializer`, `SensorReadingCompactSerializer`
- Views : list avec filtres, detail, readings avec filtre temporel, latest values par équipement
- URLs : `/api/sensors/`, `/api/sensors/<id>/readings/`, `/api/sensors/equipment/<ref>/latest/`

**Script de simulation** (`backend/aimos/scripts/generate_sensor_data.py`) :
- Crée 8 catégories, 10 équipements, ~40 capteurs
- Génère 6 mois de données (toutes les 30min) = ~100k readings
- Patterns : cycle jour/nuit, variation saisonnière, bruit gaussien
- Scénario de dégradation : EQP-0001 (HVAC) — température +1.5°C/jour pendant 15 jours
- Anomalies aléatoires (0.5% des lectures)

**Autres modifications backend :**
- `requirements.txt` : ajouté `Pillow>=10.0`
- `settings.py` : ajouté apps, MEDIA_URL/MEDIA_ROOT
- `urls.py` : routes `/api/equipment/` et `/api/sensors/`
- Fix `sensors/admin.py` : supprimé référence à `equipment__airport`
- Fix password generation : maintenant basé sur `user.id` → `EMP-002`, `EMP-013`, etc.

### Frontend — Suppressions Airport
- Supprimé le filtre "All Airports" de la toolbar
- Supprimé la colonne "Airport" du tableau
- Supprimé le champ "Airport *" du formulaire d'ajout/édition
- Supprimé les données airport des mocks
- Traductions FR equipment corrigées (étaient en anglais)

### Problème résolu : Backend crash
- Erreur : `equipment__airport does not refer to a Field`
- Cause : `sensors/admin.py` avait encore `list_filter = ['equipment__airport']`
- Fix : supprimé la référence

### Redirection après déconnexion/session expirée
- `ProtectedRoute` redirige vers `/` (page home) au lieu de `/login`
- Retiré `open: '/'` de vite.config.js (causait erreur `xdg-open` dans Docker)

### Rôles finaux

| Rôle | Pages | Route par défaut |
|------|-------|-----------------|
| Admin | Admin Dashboard, Utilisateurs | /app/admin-dashboard |
| Superviseur | Dashboard, Équipement, Interventions, Alertes, Analytique | /app/dashboard |
| Resp. maintenance | Dashboard, Équipement, Interventions, Alertes | /app/dashboard |
| Technicien | Mes Interventions, Équipement, Alertes | /app/my-interventions |
| Resp. exploitation | Dashboard, Équipement, Interventions, Alertes, Analytique | /app/dashboard |

**+ Page Profil** accessible à tous via clic sur le nom (pas dans sidebar)

### Documents créés
- `docs/DEROULEMENT_APPLICATION.md` — déroulement A à Z avec exemple HVAC
- `docs/QUESTIONS_ENCADRANT.md` — 8 sections de questions à poser à l'encadrant

### Commandes pour lancer le backend (après rebuild Docker)
```bash
docker compose down
docker compose up --build -V -d
docker exec aimos_backend python manage.py makemigrations equipment sensors
docker exec aimos_backend python manage.py migrate
docker exec -it aimos_backend python -c "exec(open('/app/aimos/scripts/generate_sensor_data.py').read())"
```

### Tâche en cours
- Ajout des traductions FR/EN pour la page Profil (interrompu)

### Prochaines étapes possibles
- Connecter le frontend equipment aux vraies APIs backend
- Connecter les graphiques du dashboard aux données réelles des capteurs
- Module IA : modèle prédictif sur les données simulées
- Page capteurs avec graphiques temps réel
- Export rapports PDF

*Fin de l'historique — Session du 11/08/2026*



---

## SESSION 3 — 11-15 Août 2026

### Backend complet — Toutes les apps connectées

**Apps Django créées :**
- `equipment` : CRUD + stats + catégories
- `sensors` : CRUD + readings + latest values
- `interventions` : CRUD + stats + start/close + my-interventions
- `alerts` : CRUD + stats + acknowledge/resolve + notifications
- `activity` : Journal d'activité (ActivityLog)
- `ai` : Module prédictif (prediction_engine.py)
- `dashboard` : Endpoint stats agrégé

**URLs principales :**
- `/api/equipment/` — CRUD équipements
- `/api/sensors/` — CRUD capteurs + readings
- `/api/interventions/` — CRUD interventions
- `/api/alerts/` — CRUD alertes + notifications
- `/api/activity/` — Journal d'activité
- `/api/ai/predictions/` — Prédictions IA
- `/api/dashboard/stats/` — Stats dashboard

### Module IA — Maintenance Prédictive

**Fichier** : `backend/aimos/apps/ai/prediction_engine.py` (314 lignes)

**Algorithme** :
- Régression linéaire (fenêtre 48h) → tendance + RUL
- Z-score (fenêtre 6h) → détection anomalies
- Score composite : 0.40×proximité + 0.35×dégradation + 0.25×anomalie

**Endpoints** :
- `GET /api/ai/predictions/` — liste complète
- `GET /api/ai/predictions/dashboard/` — top 4 pour widget
- `GET /api/ai/predictions/{sensor_id}/` — détail capteur

### Système d'alertes automatiques + Notifications

**Flux** :
1. Capteur envoie une mesure → `POST /api/sensors/{id}/readings/`
2. Backend vérifie les seuils (alert_threshold, critical_threshold)
3. Si dépassement → crée une Alert + Notification pour tous les Resp. maintenance
4. Anti-doublon : pas de nouvelle alerte si une existe dans la dernière heure

**Notifications envoyées automatiquement** :
- Alerte capteur → Resp. maintenance
- Intervention affectée → Technicien ("Vous êtes affecté à...")
- Intervention démarrée/clôturée → Resp. maintenance

### Génération automatique de données capteurs

**Fichier** : `backend/aimos/apps/sensors/data_generator.py`

**Principe** :
- Chaque équipement a une "personnalité" unique (seed basé sur ID)
- Données réalistes : cycle jour/nuit, bruit gaussien, dérive
- Génère 72h de données quand un capteur est ajouté manuellement

**Management command** :
```bash
docker exec aimos_backend python manage.py generate_sensor_data --hours 72
docker exec aimos_backend python manage.py generate_sensor_data --equipment EQP-0001
```

### Pages Frontend créées

| Page | Route | Rôle |
|------|-------|------|
| SensorChartsPage | `/app/equipment/:id/sensors` | Graphiques capteurs + ajout capteur |
| PredictionsPage | `/app/predictions` | Prédictions IA (score, RUL, z-score) |
| ActivityLogPage | `/app/activity-log` | Journal d'activité (Superviseur) |
| NotificationBell | (composant topbar) | Cloche notifications temps réel |

### Rôles finaux (4 rôles)

| Rôle | Pages | Route par défaut |
|------|-------|-----------------|
| Admin | Admin Dashboard, Utilisateurs | /app/admin-dashboard |
| Superviseur | Dashboard, Équipement, Interventions (lecture), Prédictions IA, Alertes, Journal d'activité | /app/dashboard |
| Resp. maintenance | Dashboard, Équipement, Interventions (gestion), Prédictions IA, Alertes | /app/dashboard |
| Technicien | Mes Interventions, Équipement (lecture), Alertes | /app/my-interventions |

**Rôle "Responsable exploitation" supprimé** (redondant avec Superviseur).

### Catégories équipements (Aéroport Rabat-Salé)

| Catégorie | Description |
|-----------|-------------|
| HVAC | CTA et Pompes à Chaleur |
| Power | Convertisseurs 400 Hz |
| Baggage Handling | Tapis de livraison bagages |
| Vertical Transport | Ascenseurs, escalators |
| Security | RX bagages, EDS, Body scan |
| Passenger Boarding | Passerelles télescopiques |
| Doors | Portes automatiques |

### Formulaire capteur — Flux réaliste

Le formulaire "Ajouter un capteur" inclut :
- Type de capteur + Nom + Unité
- **Connexion** : Protocole (Modbus TCP/MQTT/OPC-UA/HTTP), Adresse hôte, Port, Registre/Topic
- **Seuils** : Min normal, Max normal, Seuil alerte, Seuil critique

Quand le capteur est créé → 72h de données simulées sont générées automatiquement.

### Corrections UI/UX

- Sidebar : background image aéroport + overlay sombre
- Item actif sidebar : couleur #FD9D30 (orange)
- Logo sidebar : Airports of Morocco (blanc)
- Logo topbar : AIMOS
- Page détail équipement : supprimé tabs (garde juste vue d'ensemble), supprimé "Détails localisation", réduit taille
- Bouton "Annuler" fixé dans le modal utilisateur
- Profil : décalage rôle fixé, changement mot de passe fonctionnel (backend connecté)
- Interventions : bouton "+ Nouvelle" visible uniquement pour Resp. maintenance
- MyInterventionsPage : connectée au backend (plus de mock)
- Faux pourcentages dashboard supprimés
- Page Analytique supprimée

### Traductions FR/EN complètes

- Toutes les pages corrigées pour utiliser `t()`
- Statuts, criticités, catégories traduits dynamiquement
- Fallback : si une catégorie custom n'a pas de traduction, affiche le nom brut

### Sécurité

- `createadmin.py` : plus aucun mot de passe en dur, lit depuis variables d'environnement
- `.env` créé (exclu de Git via `.gitignore`)
- `.gitignore` ajouté à la racine

### Écosystème SI ONDA

| Système | Rôle |
|---------|------|
| Oracle EBS | ERP (finances, achats, stock) |
| HR Access | Gestion RH (paie, congés) |
| GTB/GTC | Supervision technique bâtiment |
| **AIMOS** | Maintenance prédictive intelligente |

### Commandes de déploiement

```bash
# Démarrer
docker compose up --build -V -d

# Migrations
docker exec aimos_backend python manage.py makemigrations
docker exec aimos_backend python manage.py migrate

# Initialiser catégories
docker exec aimos_backend python manage.py init_categories

# Générer données capteurs
docker exec aimos_backend python manage.py generate_sensor_data --hours 72

# Vider la base (garder admin)
docker exec aimos_backend python manage.py shell -c "
from aimos.apps.sensors.models import SensorReading, Sensor
from aimos.apps.alerts.models import Alert, Notification
from aimos.apps.interventions.models import Intervention
from aimos.apps.equipment.models import Equipment, EquipmentCategory
from aimos.apps.activity.models import ActivityLog
from django.contrib.auth import get_user_model
User = get_user_model()
SensorReading.objects.all().delete()
Notification.objects.all().delete()
Alert.objects.all().delete()
Intervention.objects.all().delete()
Sensor.objects.all().delete()
Equipment.objects.all().delete()
EquipmentCategory.objects.all().delete()
ActivityLog.objects.all().delete()
User.objects.filter(is_superuser=False).delete()
print('Base vidée.')
"
```

### Prochaines étapes

- Docker-compose production (Nginx + build frontend)
- Documentation de déploiement
- Tests de bout en bout
- Préparation démo soutenance

*Fin de l'historique — Sessions du 11-18/08/2026*



---

## SESSION 4 — 18-19 Août 2026

### Checklists (Gammes de maintenance)

**Modèles créés** (`models_checklist.py`) :
- `MaintenanceChecklist` : lié à une intervention spécifique (ou catégorie/équipement pour templates)
- `ChecklistItem` : étape avec ordre et flag `is_critical`
- `InterventionChecklistProgress` : suivi de complétion par intervention
- `InterventionRequest` : demande d'intervention (DI) avec statut pending/approved/rejected

**Flux** :
1. Resp. maintenance crée une intervention avec checklist (étapes à suivre)
2. Technicien démarre l'intervention → le checklist apparaît
3. Technicien coche les étapes au fur et à mesure
4. Resp. maintenance voit l'avancement dans le détail de l'intervention

**Fix** : Chaque checklist est lié à l'intervention spécifique (pas à l'équipement) pour éviter les conflits entre techniciens.

### Demandes d'intervention (DI)

**Page** : `/app/requests` — accessible à tous les rôles

**Flux** :
- Tout employé peut soumettre une DI (titre, description, équipement, priorité)
- Resp. maintenance approuve → crée automatiquement une intervention
- Ou rejette avec une raison
- L'employé reçoit une notification du résultat

**Endpoints** :
- `GET/POST /api/interventions/requests/`
- `GET /api/interventions/requests/stats/`
- `POST /api/interventions/requests/{id}/approve/`
- `POST /api/interventions/requests/{id}/reject/`

### Corrections UI/UX

- Logo sidebar : Airports of Morocco (supprimé texte "AIMOS" et rôle à côté)
- Logo topbar : AIMOS
- Logos agrandis (sidebar 120px, topbar 56px)
- Couleur item actif sidebar : #FD9D30
- Fix login "auth.loading" → traduction ajoutée ("Connexion..." / "Signing in...")
- Suppression faux pourcentages (+3.2%, -12%, etc.) du dashboard
- Suppression page Analytique (données mock non connectées)
- Interventions : bouton "+ Nouvelle" visible uniquement pour Resp. maintenance
- MyInterventionsPage connectée au backend (suppression de tous les mocks)
- Notification click → redirige vers la bonne page (interventions ou alertes)
- Technicien reçoit notification quand intervention lui est affectée
- Resp. maintenance reçoit notification quand technicien démarre/clôture

### Catégories équipements (Aéroport Rabat-Salé)

Catégories mises à jour pour correspondre aux vrais équipements :
- HVAC (CTA / PAC)
- Power (Convertisseurs 400 Hz)
- Baggage Handling (Tapis bagages)
- Vertical Transport (Ascenseurs, escalators)
- Security (RX, EDS, Body scan)
- Passenger Boarding (Passerelles)
- Doors (Portes automatiques)

Traductions FR/EN pour chaque catégorie + option "Autre..." pour créer une nouvelle.

### Traductions complètes

- EquipmentPage : statuts, criticités, catégories, pagination traduits dynamiquement
- EquipmentDetailPage : ~47 labels anglais remplacés par t()
- EquipmentFormPanel : criticité et statut traduits, valeurs lowercase pour le backend
- AlertsPage : niveaux/statuts s'adaptent à la langue
- SensorChartsPage : labels traduits (Good→Bon, Normal/Warning/Critical, Alert→Seuil)
- Fallback catégories custom : affiche le nom brut si pas de traduction

### Données capteurs — Dégradation visible

Modification de `data_generator.py` :
- ~40% des capteurs ont un scénario de dégradation
- Point d'opération plus élevé (0.65-0.85 de la plage normale)
- Drift agressif (+0.1 à +0.2 par heure)
- Accélération dans les dernières 24h
- Résultat : prédictions IA montrent des risques 82% critique, 64% élevé

### Page détail équipement simplifiée

- Supprimé les onglets (Infos techniques, Historique, Documents, etc.)
- Garde uniquement la vue d'ensemble
- Supprimé "Détails localisation" (mono-aéroport)
- Supprimé tableau "Interventions récentes"
- Réduit les tailles (padding, font-size, gaps)

### Déploiement Production

**Fichiers créés** :
- `docker-compose.production.yml` : DB + Backend (Gunicorn) + Nginx
- `backend/Dockerfile.prod` : image production avec gunicorn
- `backend/entrypoint.prod.sh` : migrations + init au démarrage
- `nginx/Dockerfile` : build frontend React + serve avec Nginx
- `nginx/nginx.conf` : reverse proxy /api → Django, / → React
- `.env.example` : template des variables d'environnement
- `docs/DEPLOYMENT.md` : guide complet étape par étape

**Architecture production** :
```
Port 80 (Nginx)
├── /*      → fichiers React build (statiques)
├── /api/*  → Gunicorn (Django, 3 workers)
├── /media/ → fichiers uploadés
└── /static/ → fichiers admin Django
```

**Différences dev vs prod** :
- Frontend : Vite dev server → fichiers build statiques
- Backend : runserver → Gunicorn (3 workers)
- Nginx : pas inclus en dev → point d'entrée unique en prod
- DEBUG : True → False
- Ports : 3000+8000+5432 → 80 uniquement

### Sécurité

- `createadmin.py` sans mot de passe en dur (lit depuis .env)
- `.env.example` fourni, `.env` exclu de Git
- `STATIC_ROOT` ajouté pour collectstatic en production
- `gunicorn` ajouté dans requirements.txt

### Écosystème SI ONDA

- Oracle EBS : ERP (finances, achats, stock)
- HR Access : Gestion RH
- GTB/GTC : Supervision technique
- AIMOS : Maintenance prédictive (complément, pas remplacement)

### VM de démonstration (en cours)

Setup VirtualBox :
- Ubuntu Server 22.04
- 4 Go RAM, 2 CPU, 20 Go disque
- Réseau Host-only (192.168.56.10)
- Docker + Docker Compose
- Déploiement via docker-compose.production.yml

### Prochaines étapes

- Terminer la configuration VM
- Tester le déploiement production
- Préparer la démo soutenance
- Finaliser le rapport

*Fin de l'historique — Sessions du 18-19/08/2026*



---

## SESSION 5 — 21 Août 2026

### Rapport de stage AIMOS — Création complète

**Contexte** : Le développement est terminé. Cette session est dédiée à la préparation du rapport de stage et des diagrammes.

**Type de rapport** : Rapport de Stage de Fin d'Études (individuel, pas en binôme comme le PFA précédent).

**Encadrant professionnel** : Mr. Ahmed BEKRI (ONDA)

### Diagrammes PlantUML créés

**Dossier** : `docs/diagrams/`

| Fichier | Contenu |
|---------|---------|
| `uc_module1_administration.puml` | UC Module Administration (Admin + Utilisateur) |
| `uc_module2_maintenance.puml` | UC Module Gestion de la Maintenance (Resp. maint + Technicien) |
| `uc_module3_surveillance.puml` | UC Module Surveillance & Alertes (Système + Resp. maint + Superviseur) |
| `uc_module4_ia.puml` | UC Module Maintenance Prédictive IA (Système + Resp. maint + Superviseur) |
| `class_diagram_global.puml` | Diagramme de classes global (5 packages, 14 classes) |

**Modules UC identifiés (4 modules principaux)** :
1. Administration : S'authentifier, Gérer les utilisateurs et les rôles, Gérer son profil
2. Gestion de la Maintenance : Équipements/capteurs, Interventions, Checklists, Demandes
3. Surveillance & Alertes : Alertes automatiques, Traitement, Notifications, Dashboard
4. Maintenance Prédictive (IA) : Analyse tendances, Score de risque/RUL, Prédictions

### Rapport LaTeX créé

**Dossier** : `rapport_aimos/`

**Structure** :
- `main.tex` — Page de garde (Stage, individuel, Ahmed Bekri)
- `rapportENSIAS.cls` — Classe adaptée (footer "Rapport de Stage", "Réalisé par")
- `sections/remerciements.tex` — Remerciements (Mr. Ahmed BEKRI + ONDA)
- `sections/resume.tex` — Résumé FR (maintenance prédictive aéroport)
- `sections/abstract.tex` — Abstract EN
- `sections/liste_abreviations.tex` — Abréviations AIMOS (ONDA, IoT, RUL, GMAO, etc.)
- `sections/introduction_generale.tex` — Problématique + plan du rapport
- `sections/chapitre1.tex` — Contexte général du stage (problématique, objectifs, méthodologie, planning)
- `sections/chapitre2.tex` — Présentation de l'organisme d'accueil (ONDA, aéroport Rabat-Salé, écosystème SI)
- `sections/chapitre3.tex` — Analyse et Conception (besoins, acteurs, UC avec descriptions, classes, architecture, RBAC)
- `sections/chapitre4.tex` — Réalisation (technologies, interfaces par rôle, module IA, déploiement)
- `sections/conclusion_generale.tex` — Conclusion + perspectives (IoT réel, LSTM, mobile, Oracle EBS, multi-aéroports)

### Différences par rapport à l'ancien rapport (PFA PAGe)

| Aspect | Ancien (PFA) | Nouveau (Stage) |
|--------|-------------|-----------------|
| Type | PFA (binôme) | Stage individuel |
| Label page garde | "Élèves" | "Réalisé par" |
| Footer | "Rapport PFA" | "Rapport de Stage" |
| Chapitre 2 | Cadre conceptuel (formules) | Présentation ONDA |
| Encadrant | Pr. B. BOUNABAT | Mr. Ahmed BEKRI |
| Projet | PAGe Platform | AIMOS |

### Taille du rapport

- Nouveau : ~901 lignes (~25-28 pages estimées)
- Ancien : ~1394 lignes (~40-45 pages estimées)
- **Écart : ~493 lignes à combler** (tableaux UC supplémentaires, étoffer ONDA, diagrammes de séquence, état de l'art)

### Prochaines étapes

- Étoffer le rapport pour atteindre ~40 pages :
  - Ajouter tableaux description UC manquants
  - Étoffer chapitre 2 (ONDA)
  - Ajouter diagrammes de séquence
  - Ajouter état de l'art (GMAO existantes)
- Copier logos dans `rapport_aimos/Logos/`
- Générer PNG des diagrammes PlantUML → `rapport_aimos/figures/`
- Prendre captures d'écran → `rapport_aimos/Interfaces/`
- Importer sur Overleaf pour compiler

*Fin de l'historique — Session du 21/08/2026*
