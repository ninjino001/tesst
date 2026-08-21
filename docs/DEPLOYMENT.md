# AIMOS — Guide de Déploiement Production

## Prérequis

- VM avec Ubuntu Server 22.04 (minimum 2 vCPU, 4 Go RAM, 20 Go disque)
- Accès SSH à la VM
- Accès réseau depuis les PC des employés

---

## Étape 1 : Installer Docker sur la VM

```bash
# Connexion SSH à la VM
ssh user@192.168.56.10

# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com | sudo sh

# Ajouter l'utilisateur au groupe docker (évite sudo)
sudo usermod -aG docker $USER

# Se reconnecter pour appliquer le groupe
exit
ssh user@192.168.56.10

# Vérifier que Docker fonctionne
docker --version
docker compose version
```

## Étape 2 : Transférer le projet sur la VM

```bash
# Option A : avec Git (si le projet est sur un repo)
git clone <url-du-repo> /opt/aimos
cd /opt/aimos

# Option B : avec SCP (copie directe depuis ton PC)
scp -r C:\Users\aitel\OneDrive\Desktop\AIMOS-PFA user@192.168.56.10:/opt/aimos
ssh user@192.168.56.10
cd /opt/aimos
```

## Étape 3 : Configurer les variables d'environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer les secrets
nano .env
```

Modifier ces valeurs :
```
DB_PASSWORD=MotDePasse_Complexe_123!
SECRET_KEY=une-chaine-aleatoire-de-50-caracteres-minimum
ADMIN_PASSWORD=Admin_Securise_2026!
```

## Étape 4 : Lancer l'application

```bash
# Build et démarrage (première fois — prend 2-5 minutes)
docker compose -f docker-compose.production.yml up --build -d

# Vérifier que tout tourne
docker compose -f docker-compose.production.yml ps
```

Résultat attendu :
```
NAME         STATUS    PORTS
aimos-db     running   5432/tcp
aimos-backend running  8000/tcp
aimos-nginx  running   0.0.0.0:80->80/tcp
```

## Étape 5 : Vérifier le fonctionnement

```bash
# Voir les logs
docker compose -f docker-compose.production.yml logs -f

# Tester depuis la VM
curl http://localhost
```

Depuis un navigateur sur le réseau :
```
http://192.168.56.10
```

## Étape 6 : Générer les données capteurs (optionnel)

```bash
docker compose -f docker-compose.production.yml exec backend python manage.py generate_sensor_data --hours 72
```

---

## Commandes utiles

```bash
# Arrêter l'application
docker compose -f docker-compose.production.yml down

# Redémarrer
docker compose -f docker-compose.production.yml restart

# Voir les logs du backend
docker compose -f docker-compose.production.yml logs -f backend

# Accéder au shell Django
docker compose -f docker-compose.production.yml exec backend python manage.py shell

# Mettre à jour l'application (après modification du code)
docker compose -f docker-compose.production.yml up --build -d
```

---

## Architecture de déploiement

```
┌─────────────────────────────────────────────┐
│  VM Ubuntu (192.168.56.10)                  │
│                                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Nginx  │  │  Django   │  │ Postgres │  │
│  │  :80    │─▶│  :8000   │─▶│  :5432   │  │
│  └────┬────┘  └──────────┘  └──────────┘  │
│       │                                     │
└───────┼─────────────────────────────────────┘
        │
        ▼
  Navigateur employé : http://192.168.56.10
```

---

## Configuration VirtualBox (pour la démo)

1. Créer une VM : Ubuntu Server 22.04, 2 CPU, 4 Go RAM, 20 Go disque
2. Réseau : Adaptateur 1 = NAT, Adaptateur 2 = Host-only (vboxnet0)
3. IP fixe sur l'adaptateur Host-only :
   ```bash
   sudo nano /etc/netplan/01-host-only.yaml
   ```
   ```yaml
   network:
     version: 2
     ethernets:
       enp0s8:
         addresses: [192.168.56.10/24]
   ```
   ```bash
   sudo netplan apply
   ```
4. Depuis ton PC Windows : `http://192.168.56.10` → AIMOS

---

## Sécurité (production réelle)

- [ ] Changer tous les mots de passe dans `.env`
- [ ] Activer HTTPS (certificat Let's Encrypt ou ONDA)
- [ ] Restreindre `ALLOWED_HOSTS` à l'IP du serveur
- [ ] Configurer un firewall (ufw)
- [ ] Backup automatique de la base de données
