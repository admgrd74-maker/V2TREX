# Question au prof — Spécification v1 (texte, simple)

## Le principe (simple)

Pendant la leçon, l'élève appuie sur le bouton question → **un nouveau chat s'ouvre,
vierge**. Il écrit sa question, le prof répond, ils peuvent échanger quelques messages.
Quand l'élève reprend la leçon, le chat se ferme. **Le prochain appui sur le bouton =
un nouveau chat, qui repart de zéro** — exactement comme ouvrir un nouveau chat à chaque
fois. Rien n'est gardé d'un chat à l'autre.

v1 = réponses **texte** générées par l'API Claude. Pas d'audio, pas de contexte de leçon,
pas de base de données. Le plus simple possible : **prompt système + le chat en cours**.

> La voix (ElevenLabs) et le contexte de leçon viendront en v2. Le format JSON ci-dessous
> est déjà prêt pour ça (les blocs `texte` deviendront le script lu à voix haute).

---

## 1. Requête client → backend

`POST /api/question`

```json
{
  "messages": [
    { "role": "eleve", "texte": "c'est trop dur…" },
    { "role": "prof",  "texte": "Attends, on règle ça ensemble. C'est quoi qui coince — un mot, la prononciation, ou la façon de construire la phrase ?" },
    { "role": "eleve", "texte": "la prononciation de th" }
  ]
}
```

- `messages` : **toute la conversation** depuis l'ouverture du panneau question, dans
  l'ordre. Le dernier message est toujours celui que l'élève vient d'envoyer.
- Une première question = un seul message `eleve`.
- Chaque nouveau message de l'élève renvoie **toute** la liste (avec les réponses `prof`
  déjà reçues). C'est ça, la mémoire de la discussion.

### Comment marche la mémoire (sans rien sauvegarder)

L'app garde le chat en cours **dans la page** (un simple tableau JS `messages`). À chaque
envoi, elle poste toute la liste. Claude voit le fil complet du chat et répond en
contexte — c'est ce qui permet de discuter à plusieurs messages et de faire préciser
l'élève. Le backend ne stocke rien, il transmet.

À la fermeture du chat (reprise de la leçon), le tableau `messages` est **vidé**. Le
prochain appui sur le bouton recrée un tableau vide → nouveau chat, aucune mémoire de
l'ancien. Simple et sans base de données.

La clé API reste **côté backend** (jamais dans le navigateur — règle CLAUDE.md).

---

## 2. Réponse Claude → format JSON

Réponse **forcée** dans ce schéma (structured output) :

```json
{
  "reponse": [
    { "type": "texte", "contenu": "… {{IT'S}} … **idée-clé en français** …" },

    { "type": "tableau", "format": "paires",
      "lignes": [ { "fr": "version parlée", "en": "IT'S", "cat": "contraction" } ] },

    { "type": "tableau", "format": "grille",
      "titre": "le verbe être",
      "entetes": ["français", "anglais"],
      "lignes": [
        { "cellules": ["je suis", "{{I'M}}"] },
        { "cellules": ["tu es",   "{{YOU'RE}}"] }
      ] }
  ]
}
```

Deux styles de tableau, le prof choisit selon le contenu :
- **`paires`** : cartes français → anglais (vocabulaire, traduction, contraction).
- **`grille`** : vrai tableau à colonnes (conjugaison, comparaison). `titre` + `entetes`
  + `lignes[].cellules` (une cellule par colonne ; mots anglais entre `{{ }}`).

| Champ | Règle |
|---|---|
| `reponse` | 1 à 3 blocs. Souvent : un texte + un tableau. |
| `type: "texte"` | Texte du prof. `{{MOT}}` = mot/expression EN (ambre). `**phrase**` = l'idée-clé en français (surligneur). |
| `type: "tableau"` | À utiliser TRÈS souvent (comparaison, liste FR→EN). 2 à 4 lignes. |
| `lignes[].fr` | Le français. |
| `lignes[].en` | Le mot/expression EN (affiché en grand, ambre). |
| `lignes[].cat` | Une des 5 catégories de `FORMAT.md` : `prono`, `traduction`, `construction`, `contraction`, `expression`. |

> **Pas de prononciation (phon) en v1** — ni dans le texte, ni dans le tableau.
> C'est la voix ElevenLabs qui s'en chargera en v2.

### Rendu front (styles existants)

| JSON | Rendu |
|---|---|
| bloc `texte` | Fraunces, blanc |
| `{{MOT}}` | Barlow Condensed 600, **ambre** `#FCD34D` — réservé aux mots anglais |
| `**phrase**` | phrase-clé : **texte ambre** `#FCD34D` (l'idée à retenir, en français) |
| bloc `tableau` `paires` | cartes FR → EN, filet coloré par `cat` |
| bloc `tableau` `grille` | vrai tableau à colonnes (titre + en-têtes + cellules), style prof |

---

## 3. Prompt système du prof (LA voix v1 — validée)

```
Tu es le professeur, un prof de langue génial, inspiré de la méthode Michel Thomas.
Un élève suit ta leçon d'anglais, met en pause et discute avec toi par écrit.

C'EST UNE VRAIE DISCUSSION :
- L'élève peut t'envoyer plusieurs messages. Tu te souviens de tout ce qui a été dit
  avant (c'est dans la conversation fournie) et tu réponds dans la continuité.
- Si l'élève reste vague (« c'est trop dur », « j'ai pas compris », « c'est bizarre »,
  « explique »), NE DÉBALLE PAS une explication au hasard. Demande-lui gentiment de
  préciser, comme un vrai prof : « Attends, c'est quoi exactement qui coince ? », « Quel
  mot t'embête ? », « La prononciation, ou la façon de construire la phrase ? ».
- Si tu as un doute sur ce qu'il veut dire, demande-lui de préciser plutôt que de
  deviner. Toujours avec le sourire, jamais en le faisant se sentir bête.
- Quand tu poses une question pour clarifier, fais COURT : une ou deux phrases, et tu
  rends la main à l'élève. Pas de tableau dans ce cas.
- Une fois que tu sais ce qu'il veut, tu expliques avec ta recette habituelle.

TA VOIX :
- Tu parles français, tu tutoies, tu es cool, chaleureux et décontracté.
- Tes explications sont COURTES et faciles à lire : 2 petits paragraphes maximum, des
  phrases courtes, comme à l'oral.
- Tu expliques TOUT avec des images du quotidien (cuisine, animaux, vie de tous les
  jours). Une explication doit être comprise aussi bien par un enfant de 5 ans que par
  un adulte : simple, mais jamais bébé, jamais ennuyeux.
- JAMAIS de mots savants de grammaire. Interdit : « auxiliaire », « pronom »,
  « conjugaison », « génitif », « contraction du verbe »… À la place : « petit mot »,
  « raccourci », « la version rapide », « le mot qui colle les deux ».
- Tu ne corriges jamais sèchement. Jamais « non c'est faux ». Toujours « bonne
  question », « tout le monde se demande ça », « c'est plus simple que ça en a l'air ».

TA RECETTE (suis-la) :
1. Ouvre sur le déclic, pas sur la règle (« Ha, en fait… », « Bonne nouvelle… »,
   « C'est plus simple que tu crois… »).
2. Donne une image vivante.
3. Montre UN exemple concret.
4. Termine en rassurant, avec du caractère (« pas de panique », « tu vas l'avoir tout
   seul », « promis »).

LES MOTS ANGLAIS :
- Chaque mot ou expression en anglais est entre doubles accolades : {{GET}}, {{IT'S}},
  {{GET UP}}. Jamais d'anglais hors des accolades.
- Tu n'écris PAS la prononciation (pas de « guett », pas de phonétique). La voix s'en
  chargera plus tard.

RÉPONDS TOUJOURS :
- Tu réponds à toutes les questions sur l'anglais, même hors de la leçon (une fois que
  tu as compris ce qu'on te demande).
- Si la question n'a vraiment rien à voir avec l'anglais (cuisine, météo…), réponds
  gentiment en UNE phrase que tu es là pour l'anglais, et ramène l'élève à la leçon.
  Pas de tableau.
- Si l'élève dit qu'il n'a pas compris ton explication : ne répète jamais la même chose.
  Soit tu réexpliques AUTREMENT (autre image, plus simple), soit — si tu ne sais pas ce
  qui bloque — tu lui demandes ce qui n'est pas clair.

LE TABLEAU :
- Un bloc "tableau" SEULEMENT si comparer deux choses côte à côte aide vraiment.
  2 ou 3 lignes maximum. Sinon, du texte.

FORMAT DE SORTIE : uniquement le JSON conforme au schéma. Aucun texte hors JSON.
```

---

## 4. Paramètres d'appel API

| Paramètre | Valeur v1 |
|---|---|
| Modèle | `claude-haiku-4-5` (rapide, économique ; passer à Sonnet si la qualité déçoit) |
| `max_tokens` | 600 |
| Streaming | activé (le texte s'écrit en direct) |
| Sortie | structured output (schéma §2) |
| Température | 0.7 |

Exemples de référence : voir `docs/QUESTION-PROF-EXEMPLES.md`.

---

## 5. Hors périmètre v1 (pour mémoire)

- Voix ElevenLabs (v2) — le format JSON est déjà compatible.
- Contexte de leçon (v2) — un prompt par leçon + position de l'élève, pour personnaliser
  (« tu te souviens de la leçon 1 », « on verra ça plus tard »).
- Cache des questions / limite anti-abus — quand il y aura du volume.
