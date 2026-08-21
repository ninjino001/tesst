# AIMOS — Déroulement complet de l'application

## Scénario : Cycle de vie d'un équipement HVAC (climatisation)

---

## Phase 1 : L'Admin configure le système

**Qui :** System Admin (sysadmin)
**Où :** Page Utilisateurs (`/app/users`)

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Se connecte avec ses identifiants | Arrive sur le Dashboard Admin (stats utilisateurs) |
| 2 | Clique "Nouvel utilisateur" | Formulaire apparaît |
| 3 | Crée un Responsable maintenance : Amine Kacem, role = "Responsable maintenance" | Compte créé, mot de passe = EMP-003 |
| 4 | Crée un Technicien : Youssef Idrissi, role = "Technicien" | Compte créé, mot de passe = EMP-004 |
| 5 | Crée un Superviseur : Omar Bennani, role = "Superviseur" | Compte créé, mot de passe = EMP-005 |

**Fin du rôle Admin.** Il ne touche plus aux équipements ni aux interventions.

---

## Phase 2 : Le Responsable maintenance ajoute un équipement

**Qui :** Responsable maintenance (Amine Kacem)
**Où :** Page Équipements (`/app/equipment`)

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Se connecte | Arrive sur le Dashboard opérationnel |
| 2 | Va dans "Équipement" dans la sidebar | Page liste équipements |
| 3 | Clique "+ Ajouter un équipement" | Panel formulaire s'ouvre à droite |
| 4 | Remplit les champs : | |
|   | - Nom : "Unité CVC – Terminal 1" | |
|   | - Modèle : "TRANE RTAC 240" | |
|   | - Catégorie : "HVAC" | |
|   | - Localisation : "Terminal 1 – Toiture" | |
|   | - Criticité : "Haute" | |
|   | - Date installation : 15/03/2022 | |
|   | - Description : "Unité de climatisation pour le terminal 1" | |
|   | - Image : upload photo de l'équipement | |
| 5 | Clique "Enregistrer" | Équipement créé avec ID = EQP-0001, statut = Opérationnel |

---

## Phase 3 : Les capteurs collectent des données (automatique)

**Qui :** Le système (script de simulation / vrais capteurs en production)
**Où :** En arrière-plan (base de données)

| Ce qui se passe | Détail |
|-----------------|--------|
| Capteur température | Mesure toutes les 30 min : 22°C, 23°C, 22.5°C... (normal : 18-30°C) |
| Capteur vibration | Mesure toutes les 30 min : 1.2mm/s, 1.1mm/s... (normal : 0.2-2.0mm/s) |
| Capteur débit air | Mesure toutes les 30 min : 1200 m³/h, 1250 m³/h... (normal : 800-1500 m³/h) |
| Capteur puissance | Mesure toutes les 30 min : 12kW, 11.5kW... (normal : 8-15kW) |

**Pendant 5 mois : tout est normal.**

---

## Phase 4 : Début de dégradation (Jour J-15)

**Qui :** Le système détecte automatiquement
**Où :** Module IA / Capteurs

| Jour | Température | Vibration | Observation |
|------|-------------|-----------|-------------|
| J-15 | 31°C | 2.3 mm/s | Légèrement au-dessus du normal |
| J-12 | 35°C | 2.8 mm/s | Tendance à la hausse |
| J-10 | 38°C | 3.2 mm/s | Approche du seuil d'alerte (40°C) |
| J-7  | 42°C | 3.8 mm/s | **SEUIL D'ALERTE DÉPASSÉ** |
| J-5  | 45°C | 4.2 mm/s | **SEUIL CRITIQUE ATTEINT** |

---

## Phase 5 : Alerte générée automatiquement

**Qui :** Le système
**Où :** Page Alertes (`/app/alerts`)

| Étape | Ce qui se passe |
|-------|-----------------|
| 1 | Le système détecte que la température dépasse 40°C (seuil d'alerte) |
| 2 | Une alerte est créée : "Surchauffe détectée — EQP-0001 HVAC Terminal 1" |
| 3 | Niveau : CRITIQUE |
| 4 | Le module IA calcule : "Risque de panne = 87%, délai estimé : 3 jours" |

---

## Phase 6 : Le Superviseur surveille

**Qui :** Superviseur (Omar Bennani)
**Où :** Dashboard opérationnel (`/app/dashboard`)

| Étape | Action | Ce qu'il voit |
|-------|--------|---------------|
| 1 | Se connecte | Dashboard avec graphiques |
| 2 | Voit le KPI "Alertes critiques" passer de 0 à 1 | Indicateur rouge |
| 3 | Voit dans "Prédictions IA" : "HVAC Terminal 1 — Risque 87% — 3j" | Barre rouge |
| 4 | Va dans page Alertes | Détail de l'alerte critique |
| 5 | Informe le Responsable maintenance (ou l'alerte est déjà visible pour lui) | |

---

## Phase 7 : Le Responsable maintenance crée une intervention

**Qui :** Responsable maintenance (Amine Kacem)
**Où :** Page Interventions (`/app/interventions`)

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Voit l'alerte dans son dashboard | Décide d'intervenir |
| 2 | Va dans "Interventions" → "Créer une intervention" | Formulaire |
| 3 | Remplit : | |
|   | - Équipement : EQP-0001 (HVAC Terminal 1) | |
|   | - Type : Corrective | |
|   | - Priorité : Haute | |
|   | - Description : "Surchauffe compresseur — remplacement joint + vérification circuit réfrigérant" | |
| 4 | Affecte le technicien : Youssef Idrissi | |
| 5 | Planifie : demain 08:00 | |
| 6 | Clique "Créer" | Intervention INT-2026-001 créée, statut = "Affectée" |

---

## Phase 8 : Le Technicien exécute l'intervention

**Qui :** Technicien (Youssef Idrissi)
**Où :** Page Mes Interventions (`/app/my-interventions`)

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Se connecte | Arrive sur "Mes Interventions" |
| 2 | Voit INT-2026-001 avec badge "Affectée" et priorité "Haute" | |
| 3 | Clique sur l'intervention | Modal détail s'ouvre |
| 4 | Lit la description et la localisation (Terminal 1 – Toiture) | |
| 5 | Se rend sur place physiquement | |
| 6 | Clique "Démarrer" | Statut → "En cours" |
| 7 | Effectue la réparation : | |
|   | - Remplace le joint du compresseur | |
|   | - Vérifie le circuit réfrigérant | |
|   | - Recharge le fluide | |
| 8 | Revient sur l'app, clique "Clôturer" | |
| 9 | Renseigne le rapport : "Joint compresseur remplacé, circuit purgé, fluide rechargé. Test OK." | |
| 10 | Statut → "Clôturée" | L'intervention est archivée |

---

## Phase 9 : Vérification post-intervention

**Qui :** Responsable maintenance + Système
**Où :** Page Équipements + Capteurs

| Étape | Action / Observation |
|-------|---------------------|
| 1 | Le Resp. maintenance va dans EQP-0001 → onglet "Historique maintenance" | Voit l'intervention archivée |
| 2 | Change le statut de l'équipement : "En maintenance" → "Opérationnel" | |
| 3 | Les capteurs reprennent des valeurs normales : 23°C, 1.2mm/s | |
| 4 | L'alerte est marquée comme "Traitée" | |
| 5 | Programme la prochaine maintenance préventive (dans 90 jours) | |

---

## Phase 10 : Analyse (Responsable exploitation)

**Qui :** Responsable exploitation
**Où :** Page Analytique (`/app/analytics`)

| Ce qu'il consulte | Indicateur |
|-------------------|------------|
| MTTR (temps moyen de réparation) | 4.2 heures |
| Disponibilité globale | 97.8% |
| Ratio préventif/correctif | 65% / 35% |
| Conformité SLA | 92% |

---

## Résumé visuel

```
ADMIN          →  Crée les comptes utilisateurs
                       ↓
RESP. MAINT.   →  Ajoute équipement  →  Crée intervention  →  Vérifie après
                       ↓                        ↓
CAPTEURS/IA    →  Collecte données  →  Détecte anomalie  →  Génère alerte
                       ↓                        ↓
SUPERVISEUR    →  Surveille dashboard + alertes + prédictions IA
                                                ↓
TECHNICIEN     →  Reçoit intervention  →  Démarre  →  Exécute  →  Clôture
                                                                      ↓
RESP. EXPLOIT. →  Consulte analytics  →  KPIs  →  Rapports  →  Décisions
```

---

## Cycle de vie d'un équipement

```
[Création] → Opérationnel → En maintenance → Opérationnel → ... → Hors service
                  ↑              ↓                    ↑
                  └── Intervention clôturée ──────────┘
```

## Cycle de vie d'une intervention

```
[Créée] → Affectée → En cours → Clôturée
                        ↓
                    Suspendue → En cours → Clôturée
```

## Statuts d'alerte

```
[Générée] → Active → En cours de traitement → Traitée
```
