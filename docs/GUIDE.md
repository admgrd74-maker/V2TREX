# Guide — créer une leçon (sans coder)

## 1. Préparer tes audios
Génère tes voix avec ElevenLabs (de ton côté) : **un fichier `.mp3` par réplique**
(une ligne du prof, d'Élève 1, d'Élève 2). Nomme-les dans l'ordre (`01.mp3`, `02.mp3`…).
Conseil : range-les dans `audio/<nom-de-lecon>/`.

## 2. Ouvrir l'admin
Lance un serveur local puis va sur `http://localhost:8000/admin/`.

## 3. Renseigner l'en-tête
Titre de la leçon + paire de langues.

## 4. Ajouter les répliques
Avec les boutons du bas : **Professeur**, **Élève 1**, **Élève 2**, **Bip (à vous)**.
La barre de couleur à gauche indique qui parle. Tu peux réordonner (↑/↓) ou supprimer (🗑).

Pour une réplique parlée :
- **Texte affiché** : le sous-titre. Mets un mot clé entre `<b>…</b>` pour le souligner.
- **Charger un .mp3** : ton vocal. Un petit lecteur apparaît, tu peux l'écouter.

## 5. Écrire au tableau
Dans chaque réplique, ajoute des **mots au tableau** :
- le mot (`table`)
- sa prononciation francisée (`téï-beul`)
- la **seconde** où il s'écrit
- coche **question ?** si c'est un mot que l'élève doit deviner (mot en blanc)

Astuce timecode : lance la lecture de l'audio, mets en pause au bon moment, clique
**⌖ poser au temps courant** → la seconde se remplit toute seule.

## 6. Accumulation
Coche **garder le tableau** sur une réplique pour **ne pas effacer** les mots déjà
présents (ex. garder « table » pendant qu'on ajoute « possible »). Sans la case, le
tableau repart à zéro à chaque réplique.

## 7. La réplique « bip »
C'est le tour de l'élève. Pas de texte ni d'audio : juste le(s) mot(s) attendu(s) au
tableau (souvent en **question**, et **garder le tableau** coché).

## 8. Vérifier et exporter
- **▶ Prévisualiser** : joue la leçon comme dans l'app.
- **⬇ Exporter** : télécharge un `.mtlesson` (audios inclus). C'est ta sauvegarde.
- **⬆ Importer** : recharge un `.mtlesson` pour reprendre ton travail.

## 9. Jouer dans l'app
Va sur `http://localhost:8000/app/`, clique **Charger une leçon** et choisis ton
`.mtlesson`.

---

### Prononciation francisée — repères
Reste lisible par un francophone (esprit Michel Thomas, pas d'alphabet phonétique). Ex. :
`table → téï-beul`, `possible → po-si-beul`, `comfortable → keum-feu-teu-beul`,
`it isn't → it i-zeunt`. Valide chaque mot à l'oreille avec ton audio.
