# 🎭 THE DISNASTY CIRCLE — Guide de l'Application

Bienvenue sur la plateforme officielle de **THE DISNASTY CIRCLE**.

---

## 📍 Où se trouve le projet ?
Le dossier complet se trouve sur votre machine à cet emplacement :
```text
C:\Users\LANDRY TOUOTAP\.gemini\antigravity\scratch\disnasty-circle
```

---

## 🚀 Comment lancer le site en local ?

### Option 1 (Le plus simple)
Faites un double-clic sur le fichier **`lancer-le-site.bat`** qui se trouve dans ce dossier.

### Option 2 (Via le terminal)
Ouvrez votre terminal dans le dossier et tapez :
```bash
npm run dev
```

Puis ouvrez votre navigateur :
- **Page d'accueil :** [http://localhost:3000](http://localhost:3000)
- **Soirée Bal Masqué :** [http://localhost:3000/soirees/bal-masque](http://localhost:3000/soirees/bal-masque)
- **Espace Staff :** [http://localhost:3000/staff/login](http://localhost:3000/staff/login)

---

## 🔑 Accès Staff / Administrateur
- **Email :** `admin@disnastycircle.com`
- **Mot de passe :** `DisnastyAdmin2026!`

Depuis l'espace Staff, vous avez accès à :
1. **Tableau de bord :** Vue globale, compteurs de réservations et actions rapides.
2. **Gestion des réservations :** Recherche par nom/email, confirmation, bouton WhatsApp pré-rempli, envoi du billet par email.
3. **Scanner QR anti-fraude :** Scanner avec la caméra de votre smartphone ou webcam pour valider les billets à l'entrée.
4. **Gestion des soirées :** Clôture/réouverture manuelle des réservations (mode *COMPLET*), modification du numéro WhatsApp.
5. **Comptabilité :** Recettes totales encaissées, répartition billets (40€) et masques (10€).

---

## 📱 Numéro WhatsApp configuré
- **Numéro actuel :** `+33753304120`
- Les messages pré-remplis génèrent automatiquement le récapitulatif de commande avec le total et les informations de l'invité.

---

## ✉️ Configuration Gmail (Envoi de billets)
Dans le fichier `.env` :
- `GMAIL_USER="disnastycircle.events@gmail.com"`
- `GMAIL_APP_PASSWORD="votre-mot-de-passe-application-google"`

*(Tant que ce mot de passe d'application n'est pas renseigné, le mode simulation est actif pour ne pas bloquer vos tests).*
