# Mettre RevizEasy en ligne GRATUITEMENT (Cloudflare Pages + Gemini)

Ce dossier est prêt à publier. Rien à compiler : `public/` = le site, `functions/api/ia.js` = le petit relais qui cache ta clé IA.

## Ce dont tu as besoin (tout gratuit)
1. Un compte GitHub : https://github.com/signup
2. Un compte Cloudflare : https://dash.cloudflare.com/sign-up
3. Une clé Gemini : https://aistudio.google.com/apikey (bouton « Create API key »)

## Étape 1 – Mettre les fichiers sur GitHub (depuis le navigateur, sans logiciel)
1. Sur GitHub : **New repository** → nom `revizeasy` → Public ou Private → **Create**.
2. Dans le dépôt : **Add file → Upload files**.
3. Décompresse le zip sur ton ordinateur, puis glisse **les dossiers `public` et `functions`** (et ce guide) dans la page. Vérifie que `public/index.html` et `functions/api/ia.js` apparaissent bien avec leurs dossiers.
4. **Commit changes**.
   (Sur téléphone : utilise la version « site pour ordinateur » du navigateur.)

## Étape 2 – Connecter Cloudflare Pages
1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
2. Autorise GitHub, choisis le dépôt `revizeasy`.
3. Réglages de build :
   - Framework preset : **None**
   - Build command : *(laisser vide)*
   - **Build output directory : `public`**
4. **Save and Deploy**. Après ~1 minute tu obtiens `https://revizeasy-xxx.pages.dev`.

## Étape 3 – Ajouter la clé IA (secret)
1. Projet Pages → **Settings → Variables and Secrets → Add**.
2. Nom : `GEMINI_API_KEY` · Valeur : ta clé · type **Secret** · environnement **Production**.
3. (Optionnel) `GEMINI_MODEL` = nom du modèle si Google change (par défaut `gemini-2.5-flash`). Vérifie le nom actuel sur https://ai.google.dev/gemini-api/docs/models
4. **Deployments → Retry deployment** (obligatoire pour que la clé soit prise en compte).

## Étape 4 – Tester
1. Ouvre ton lien `.pages.dev`, crée un profil, colle un cours, génère une fiche.
2. Si erreur : ouvre `https://TON-SITE.pages.dev/api/ia` — « Method not allowed » = le relais existe ; 404 = le dossier `functions` n'est pas à la racine du dépôt ; message « clé » = secret mal enregistré ou redéploiement oublié.

## Étape 5 – Installer comme une appli
Sur Android/Chrome : menu ⋮ → **Ajouter à l'écran d'accueil / Installer**. Partage ensuite le lien aux élèves.

## Domaine personnalisé (facultatif)
Pages → **Custom domains**. Un domaine `.ci` ou `.com` est payant ; le `.pages.dev` reste gratuit.

## Alternatives 100 % statiques (sans IA)
- **Netlify Drop** (app.netlify.com/drop) : glisser le dossier `public`. Le site s'ouvre, mais la génération IA ne marche pas (pas de relais).
- **GitHub Pages** : idem, statique seulement.
Pour l'IA il faut le relais (Cloudflare Pages, ou Netlify/Vercel Functions en adaptant `ia.js`).

## Limites honnêtes
- **Quota Gemini gratuit faible** : plusieurs élèves générant en même temps peuvent recevoir « quota atteint » (le site réessaie automatiquement 5 fois). Au-delà de quelques dizaines d'élèves actifs, prévois la facturation Gemini ou plusieurs clés.
- Le palier gratuit de Gemini peut servir à améliorer les produits Google : **n'envoie pas de données personnelles de mineurs** dans les cours.
- Cloudflare Functions gratuit : ~100 000 requêtes/jour (largement suffisant ici).
- **Les données (historique, profils) sont stockées dans le navigateur de chaque élève** (localStorage) : pas de synchronisation entre appareils, perdues si on vide le navigateur. Pour des comptes réels, utilise le kit Next.js + Supabase.
- Pas de paiement mobile money ni vrais comptes dans cette version : c'est la démo hébergée.
- Vérifie les quotas/prix actuels : https://developers.cloudflare.com/pages/platform/limits/ et https://ai.google.dev/gemini-api/docs/rate-limits

## Sécurité
La clé n'est jamais dans le site : elle reste dans Cloudflare. Le relais refuse les appels venant d'un autre site (variable optionnelle `ORIGINES` pour autoriser ton domaine). Ne publie jamais ta clé dans GitHub.
