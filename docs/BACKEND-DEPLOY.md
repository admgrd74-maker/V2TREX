# Déployer le backend « question au prof » sur Netlify

Tout est gratuit (hébergement Netlify + API Gemini palier gratuit).
Compte le déploiement en ~10 minutes la première fois.

> **Version de test = Google Gemini (gratuit).** Le passage à Claude pour la production
> se fera plus tard en remplaçant le bloc d'appel API dans `question.js` (le prompt et le
> format JSON ne changent pas).

## Fichiers concernés
```
netlify.toml                      → config (publish = app, functions = netlify/functions)
netlify/functions/question.js     → le mini-backend (appelle Claude)
netlify/functions/prompt-prof.js  → le prompt système de Marc
app/chat-prof.html                → page de test pour discuter avec Marc
```

## 1. Obtenir une clé API Gemini (gratuite)
1. Va sur https://aistudio.google.com/app/apikey → connecte-toi avec un compte Google.
2. Clique **Create API key** (palier gratuit, aucune carte bancaire nécessaire).
3. Copie la clé.
   ⚠️ Ne la mets JAMAIS dans le code ni dans un fichier du repo.

## 2. Déployer sur Netlify
**Option A — glisser-déposer (le plus simple) :**
1. Va sur https://app.netlify.com → *Add new site* → *Deploy manually*.
2. Glisse le dossier du projet (`methode-langue`) dans la zone.

**Option B — via GitHub (recommandé si le projet est sur GitHub) :**
1. *Add new site* → *Import from Git* → choisis le dépôt.
2. Netlify lit `netlify.toml` tout seul.

## 3. Donner la clé API à Netlify (l'étape qui compte)
Dans le site Netlify : **Site configuration → Environment variables → Add a variable**
- Key : `GEMINI_API_KEY`
- Value : ta clé Gemini

Puis **redéploie** (Deploys → Trigger deploy) pour que la variable soit prise en compte.

## 4. Tester
Ouvre `https://TON-SITE.netlify.app/chat-prof.html` et discute avec le professeur.

## Tester en local (optionnel)
```
npm install -g netlify-cli
netlify dev
```
Crée un fichier `.env` à la racine (déjà ignoré par git) avec :
```
GEMINI_API_KEY=ta-cle-gemini
```
Puis ouvre l'URL locale affichée + `/chat-prof.html`.

## Régler / ajuster
- Changer le **ton du professeur** : édite `netlify/functions/prompt-prof.js`.
- Changer le **modèle** : constante `MODEL` en haut de `netlify/functions/question.js`.
- **Passer à Claude (production)** : dans `question.js`, remplacer le bloc d'appel Gemini
  par un appel à l'API Anthropic (clé `ANTHROPIC_API_KEY`). Le prompt et le format JSON
  restent identiques.
- Coût Gemini : palier gratuit (généreux) — rien à payer en phase de test.
