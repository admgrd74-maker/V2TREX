# Format de leçon (`.mtlesson`)

Un `.mtlesson` est un fichier **JSON**. C'est ce que l'admin exporte et ce que l'app lit.

## Structure générale

```json
{
  "format": "mt-lesson",
  "version": 1,
  "title": "Les mots en « -able / -ible »",
  "pair": "fr-en",
  "ambient": "../audio/lecon1/ambiance.mp3",
  "steps": [ /* répliques, dans l'ordre */ ]
}
```

| champ     | type   | rôle |
|-----------|--------|------|
| `ambient` | string | chemin vers un fichier audio en **boucle** (bruit de fond classe). Facultatif. Fondu à la fin de la leçon. |

## Une réplique (`step`)

| champ        | type      | rôle |
|--------------|-----------|------|
| `role`       | string    | `"prof"`, `"eleve1"`, `"eleve2"` ou `"moi"` (le bip) |
| `fr`         | string    | sous-titre affiché. `<b>…</b>` autorisé pour la mise en valeur |
| `audio`      | string\|null | chemin (`"../audio/lecon1/01.mp3"`) ou dataURL. `null` → voix de démo |
| `audioName`  | string    | nom de fichier (info) |
| `keepBoard`  | bool      | `true` = ne pas effacer le tableau (accumulation) |
| `reveals`    | array     | mots écrits au tableau (voir ci-dessous) |
| `speak`      | array     | **démo seulement** : segments lus par la synthèse (voir plus bas) |
| `nameClip`   | string    | (prod) clip audio du prénom à jouer au bip, à la place de la synthèse |

Pour `role: "moi"` (BIP) : pas d'`audio`. Champs spécifiques :

| champ       | type   | rôle |
|-------------|--------|------|
| `title`     | string | Type de question affiché en badge — ex : `"Comment dit-on en anglais ?"` |
| `question`  | string | Ce que l'élève doit produire — ex : `"It is..."` (plongeoir) ou `"c'est possible"` |
| `context`   | string | Indice français affiché en sous-titre — **obligatoire pour les plongeoirs**, optionnel sinon. Ex : `"c'est possible"` |
| `reveals`   | array  | Mots affichés au tableau (souvent avec `q: true`) |
| `keepBoard` | bool   | `true` = ne pas effacer le tableau |

## Un mot du tableau (`reveal`)

```json
{ "en": "table", "phon": "téï-beul", "at": 4.2, "q": false }
```

| champ      | type   | rôle |
|------------|--------|------|
| `en`       | string | le mot/la phrase affiché en gros |
| `phon`     | string | prononciation francisée (label « se dit ») |
| `at`       | number | seconde **dans l'audio** où le mot s'écrit. `0` = immédiat |
| `removeAt` | number | seconde où le mot **disparaît**. Absent ou `0` = reste jusqu'à effacement du tableau |
| `q`        | bool   | `true` = mode question (mot en blanc, label « prononcez ») |

Plusieurs `reveals` avec des `at` croissants = les mots s'écrivent **l'un après l'autre**
et **s'accumulent** au tableau.

## Le champ `speak` (démo uniquement)

Sert à faire parler la **synthèse du navigateur** quand aucun `audio` n'est fourni, en
gérant le changement de langue. Liste de couples `[texte, langue]` :

```json
"speak": [
  ["Et un mot de tous les jours :", "fr"],
  ["table", "en"]
]
```

Dès que `audio` est renseigné, `speak` est ignoré. En production, tu peux le retirer.

## Exemple minimal

```json
{
  "format":"mt-lesson","version":1,
  "title":"Démo","pair":"fr-en",
  "steps":[
    { "role":"prof", "fr":"Un mot : <b>table</b>.", "audio":"../audio/lecon1/01.mp3",
      "reveals":[{"en":"table","phon":"téï-beul","at":1.2}] },
    { "role":"moi", "keepBoard":true,
      "reveals":[{"en":"table","phon":"téï-beul","at":0,"q":true}] }
  ]
}
```

## Compatibilité

Ancien raccourci toujours accepté par l'app : `board: {en, phon, q}` = efface le tableau
puis montre **un** mot tout de suite (équivalent à `reveals:[{...,"at":0}]` sans `keepBoard`).
Préférer `reveals` pour les nouvelles leçons.
