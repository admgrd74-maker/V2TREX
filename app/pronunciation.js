/* Évaluation de prononciation — Azure AI Speech (Pronunciation Assessment).
   Esprit Michel Thomas : AUCUNE correction en direct bloquante. Ce module se
   contente de NOTER la réponse de l'élève au bip, puis de stocker le résultat
   pour un bilan (badge discret + récap en page révision).

   Sécurité : la clé Azure ne quitte jamais le serveur. On récupère un jeton
   éphémère (~10 min) via la fonction Netlify /.netlify/functions/speech-token,
   puis on parle au service directement depuis le navigateur avec ce jeton.

   Dépendance : le SDK navigateur Microsoft, chargé à la volée depuis le CDN
   (pas de bundler — cohérent avec le projet vanilla).

   API publique (window.MTPronunciation) :
   - isConfigured()                  → Promise<bool> : le backend renvoie-t-il un jeton ?
   - assess(reference, opts)         → Promise<résultat normalisé> (enregistre au micro)
   - saveScore(lessonId, idx, ref, r)→ persiste le résultat dans localStorage
   - getScores(lessonId)             → array des résultats stockés
   - clearScores(lessonId)           → efface les résultats d'une leçon
   - cancel()                        → coupe un enregistrement en cours

   Réf : docs/FORMAT.md (champ `attendu`). */

(function () {
  "use strict";

  const TOKEN_ENDPOINT = "/.netlify/functions/speech-token";
  const SDK_URL = "https://aka.ms/csspeech/jsbrowserpackageraw";
  const STORE_PREFIX = "mt-pron:";

  // ── Chargement paresseux du SDK ────────────────────────────────────────
  let sdkPromise = null;
  function loadSdk() {
    if (window.SpeechSDK) return Promise.resolve(window.SpeechSDK);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK_URL;
      s.async = true;
      s.onload = () =>
        window.SpeechSDK
          ? resolve(window.SpeechSDK)
          : reject(new Error("SDK Azure chargé mais window.SpeechSDK absent."));
      s.onerror = () => reject(new Error("Impossible de charger le SDK Azure Speech."));
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  // ── Jeton éphémère (mis en cache ~9 min pour marge de sécurité) ─────────
  let cachedToken = null; // { token, region, expires }
  async function getToken() {
    if (cachedToken && Date.now() < cachedToken.expires) return cachedToken;
    const resp = await fetch(TOKEN_ENDPOINT, { method: "GET" });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error("Jeton Azure indisponible (" + resp.status + "). " + detail);
    }
    const data = await resp.json();
    if (!data.token || !data.region) throw new Error("Réponse jeton invalide.");
    cachedToken = {
      token: data.token,
      region: data.region,
      expires: Date.now() + 9 * 60 * 1000,
    };
    return cachedToken;
  }

  // L'évaluation vocale est-elle disponible (backend configuré) ?
  async function isConfigured() {
    try {
      await getToken();
      return true;
    } catch {
      return false;
    }
  }

  // ── Évaluation d'un enregistrement micro contre un texte de référence ──
  let activeRecognizer = null;

  function cancel() {
    if (activeRecognizer) {
      try { activeRecognizer.close(); } catch {}
      activeRecognizer = null;
    }
  }

  /* reference : texte EN attendu (champ `attendu`).
     opts.onStart() : appelé quand le micro est prêt (pour l'UI).
     Renvoie : { ok, recognized, scores:{pron,accuracy,fluency,completeness,prosody},
                 words:[{word,accuracy,error}], raw } | { ok:false, error } */
  async function assess(reference, opts = {}) {
    if (!reference || !reference.trim()) {
      return { ok: false, error: "Aucune réponse attendue (`attendu`) pour ce bip." };
    }
    const ref = reference.trim();

    let SDK, tok;
    try {
      [SDK, tok] = await Promise.all([loadSdk(), getToken()]);
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }

    const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(tok.token, tok.region);
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();

    const paConfig = new SDK.PronunciationAssessmentConfig(
      ref,
      SDK.PronunciationAssessmentGradingSystem.HundredMark,
      SDK.PronunciationAssessmentGranularity.Phoneme,
      true // enableMiscue : repère mots manquants / en trop
    );
    // Prosodie = intonation/rythme (dispo en-US). Best-effort si indisponible.
    try { paConfig.enableProsodyAssessment = true; } catch {}

    const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);
    activeRecognizer = recognizer;

    if (typeof opts.onStart === "function") {
      try { opts.onStart(); } catch {}
    }

    return new Promise((resolve) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason === SDK.ResultReason.RecognizedSpeech) {
              const pa = SDK.PronunciationAssessmentResult.fromResult(result);
              const words = (pa.detailResult && pa.detailResult.Words ? pa.detailResult.Words : []).map((w) => {
                const wa = w.PronunciationAssessment || {};
                // Détail par phonème (son) : { p:"f", score:45 }
                const phonemes = (w.Phonemes || []).map((p) => ({
                  p: p.Phoneme,
                  score: p.PronunciationAssessment ? round(p.PronunciationAssessment.AccuracyScore) : null,
                }));
                return {
                  word: w.Word,
                  accuracy: round(wa.AccuracyScore),
                  error: wa.ErrorType || "None",
                  phonemes,
                };
              });
              resolve({
                ok: true,
                recognized: result.text || "",
                scores: {
                  pron: round(pa.pronunciationScore),
                  accuracy: round(pa.accuracyScore),
                  fluency: round(pa.fluencyScore),
                  completeness: round(pa.completenessScore),
                  prosody: round(pa.prosodyScore),
                },
                words,
                weakSounds: weakSounds(words),
              });
            } else if (result.reason === SDK.ResultReason.NoMatch) {
              resolve({ ok: false, error: "Rien n'a été entendu. Réessaie en parlant plus près du micro." });
            } else {
              resolve({ ok: false, error: "Évaluation impossible (raison " + result.reason + ")." });
            }
          } catch (e) {
            resolve({ ok: false, error: "Lecture du score impossible : " + String(e.message || e) });
          } finally {
            cancel();
          }
        },
        (err) => {
          resolve({ ok: false, error: "Erreur de reconnaissance : " + String(err) });
          cancel();
        }
      );
    });
  }

  function round(n) {
    return typeof n === "number" && isFinite(n) ? Math.round(n) : null;
  }

  /* Résume les points faibles pour le coaching : par mot en erreur, on garde
     les sons (phonèmes) sous 60. Sert d'entrée au prof IA. */
  function weakSounds(words) {
    const out = [];
    for (const w of words || []) {
      const sounds = (w.phonemes || []).filter((p) => p.score != null && p.score < 60);
      const isWordError = w.error && w.error !== "None";
      if (sounds.length || isWordError) {
        out.push({
          word: w.word,
          error: w.error || "None",
          accuracy: w.accuracy,
          sounds: sounds.sort((a, b) => a.score - b.score).slice(0, 3),
        });
      }
    }
    return out;
  }

  // ── Persistance des résultats (localStorage) ───────────────────────────
  function keyFor(lessonId) {
    return STORE_PREFIX + (lessonId || "default");
  }

  function getScores(lessonId) {
    try {
      return JSON.parse(localStorage.getItem(keyFor(lessonId)) || "[]");
    } catch {
      return [];
    }
  }

  /* Enregistre un résultat. idx = index du step bip (unique par leçon) ;
     un nouveau passage sur le même bip remplace l'ancien score. */
  function saveScore(lessonId, idx, reference, result) {
    if (!result || !result.ok) return;
    const list = getScores(lessonId).filter((e) => e.idx !== idx);
    list.push({
      idx,
      attendu: reference,
      recognized: result.recognized,
      scores: result.scores,
      words: result.words,
      ts: Date.now(),
    });
    list.sort((a, b) => a.idx - b.idx);
    try {
      localStorage.setItem(keyFor(lessonId), JSON.stringify(list));
    } catch {}
  }

  function clearScores(lessonId) {
    try { localStorage.removeItem(keyFor(lessonId)); } catch {}
  }

  window.MTPronunciation = {
    isConfigured,
    assess,
    cancel,
    saveScore,
    getScores,
    clearScores,
  };
})();
