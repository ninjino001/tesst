# Questions à poser à l'encadrant — AIMOS

## Contexte
Je suis informaticien et je développe une application de maintenance prédictive pour l'aéroport. J'ai besoin d'informations sur le domaine métier pour rendre l'application réaliste.

---

## 1. Équipements de l'aéroport

### Questions générales
- Quels sont les équipements critiques de l'aéroport qui nécessitent une maintenance régulière ?
- Pouvez-vous me donner une liste des catégories d'équipements existants ? (ex: HVAC, éclairage piste, générateurs, etc.)
- Combien d'équipements (approximativement) sont gérés dans cet aéroport ?
- Quels sont les équipements les plus problématiques (ceux qui tombent en panne le plus souvent) ?

### Détails techniques
- Pour chaque catégorie d'équipement, quels sont les marques et modèles utilisés ? (ex: TRANE pour la climatisation, Caterpillar pour les générateurs)
- Quel est le cycle de vie moyen d'un équipement ? (durée avant remplacement)
- Quelle est la fréquence de maintenance préventive par type d'équipement ? (tous les 30 jours ? 90 jours ?)
- Comment les équipements sont-ils identifiés ? (code interne ? numéro de série ? les deux ?)

### Localisation
- Comment l'aéroport est-il organisé ? (Terminal 1, Terminal 2, Pistes, Tour de contrôle, Locaux techniques, etc.)
- Peut-on avoir un plan simplifié des zones pour la localisation des équipements ?

---

## 2. Capteurs et mesures

### Questions clés
- **Est-ce que les équipements actuels ont des capteurs intégrés ?** (température, vibration, pression, etc.)
- Si oui, quel type de données collectent-ils ?
- Les capteurs sont-ils connectés à un système central (SCADA, BMS, GTC) ou fonctionnent-ils de manière isolée ?
- Les données des capteurs sont-elles accessibles numériquement ? (via une API, un protocole industriel, des exports CSV ?)
- Sinon, les relevés sont-ils faits manuellement par les techniciens ?

### Détails sur les mesures
- Quels paramètres sont surveillés par type d'équipement ?
  - HVAC : température, humidité, débit d'air, consommation ?
  - Générateurs : température, vibration, tension, courant ?
  - Éclairage : puissance, tension ?
  - Pompes : pression, débit, vibration ?
- Quels sont les seuils normaux / d'alerte / critiques pour chaque mesure ?
- À quelle fréquence les mesures sont-elles prises ? (toutes les minutes ? toutes les heures ?)

### Pour la simulation
- Si je n'ai pas accès aux vrais capteurs, avez-vous des historiques de données (même sous forme Excel ou CSV) que je pourrais utiliser pour la simulation ?
- Sinon, pouvez-vous me donner les plages de valeurs réalistes pour chaque type de capteur ?

---

## 3. Processus de maintenance actuel

### Questions sur le workflow
- Comment une intervention est-elle déclenchée aujourd'hui ? (demande manuelle ? signalement ? automatique ?)
- Qui décide de créer une intervention ? (Responsable maintenance ? Chef de service ?)
- Comment les techniciens sont-ils informés qu'ils ont une intervention à faire ? (email ? tableau physique ? logiciel ?)
- Quel est le processus actuel de A à Z quand un équipement tombe en panne ?
- Combien de techniciens interviennent en moyenne ?
- Quels sont les niveaux de priorité utilisés ? (Critique, Haute, Moyenne, Basse ?)

### Historique
- Y a-t-il un historique des interventions passées ? (fichiers Excel, fiches papier, logiciel ?)
- Peut-on avoir un exemple d'un rapport d'intervention rempli ?
- Combien d'interventions sont réalisées par mois (approximativement) ?
- Quel est le ratio interventions préventives vs correctives ?

---

## 4. Rôles et utilisateurs

### Questions sur l'organisation
- Combien de personnes travaillent dans le service maintenance ?
- Quels sont les rôles existants ? (chef de service, responsable maintenance, technicien, superviseur ?)
- Qui a accès aux informations sensibles ? (tout le monde ? seulement les responsables ?)
- Y a-t-il des niveaux de compétence parmi les techniciens ? (junior, senior, spécialisé ?)

---

## 5. Alertes et notifications

### Questions
- Comment les alertes sont-elles gérées aujourd'hui ? (appel téléphonique ? email ? SMS ? tableau d'affichage ?)
- Qui doit être notifié en cas d'alerte critique ? (une personne ? toute l'équipe ?)
- Quels types d'alertes existent ? (panne, seuil dépassé, maintenance planifiée en retard ?)
- Quel est le temps de réaction attendu pour une alerte critique ?

---

## 6. Intelligence artificielle / Prédiction

### Questions pour valider l'approche
- Y a-t-il eu des pannes récentes qui auraient pu être évitées avec une détection précoce ?
- Pouvez-vous me donner un exemple concret de dégradation progressive d'un équipement ? (ex: la température montait pendant X jours avant la panne)
- Quels indicateurs sont les plus révélateurs d'une panne imminente ?
- Seriez-vous intéressé par un système qui prédit les pannes 5 à 10 jours à l'avance ?

---

## 7. Contraintes techniques

### Questions
- L'application sera-t-elle utilisée uniquement en interne (réseau local de l'aéroport) ?
- Y a-t-il des contraintes de sécurité spécifiques ? (pas d'accès Internet ? VPN obligatoire ?)
- Les utilisateurs utiliseront-ils des ordinateurs fixes ou aussi des tablettes/téléphones ?
- Y a-t-il un serveur disponible pour héberger l'application ?

---

## 8. Documents à demander

| Document | Pourquoi |
|----------|----------|
| Liste des équipements (même partielle) | Pour avoir des données réalistes |
| Plan de l'aéroport (zones/terminaux) | Pour les localisations |
| Exemple de fiche d'intervention | Pour comprendre le format du rapport |
| Historique de maintenance (Excel) | Pour alimenter la base de données |
| Seuils d'alerte par équipement | Pour configurer les capteurs |
| Organigramme du service maintenance | Pour valider les rôles |

---

## Notes
- Si certaines réponses ne sont pas disponibles, on peut utiliser des données simulées réalistes pour le PFE
- L'important est d'avoir les bonnes plages de valeurs et le bon workflow pour que la démo soit crédible
- Toute documentation existante (même ancienne) est utile
