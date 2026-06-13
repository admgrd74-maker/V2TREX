/* Mini-backend « question au prof » — Netlify Function (Node 18+).
   VERSION DE TEST : utilise l'API Groq (GRATUITE) avec un modèle Llama.
   Le prompt et le format JSON sont identiques à la version Claude ;
   pour passer en production sur Claude, il suffira de remplacer le bloc d'appel API.

   Reçoit la conversation (liste `messages`), ajoute le prompt système,
   force une sortie JSON, renvoie { reponse: [...] }.

   La clé vit ici, côté serveur — variable d'environnement GROQ_API_KEY.
   Jamais dans le navigateur (règle CLAUDE.md).

   Réf : docs/QUESTION-PROF-V1.md */

const SYSTEM_PROMPT = require("./prompt-prof");

// Modèle Groq (gratuit, stable sur le JSON). Llama 3.3 70B.
const MODEL = "llama-3.3-70b-versatile";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json", ...CORS },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée." });
  }

  // 1. Lire la conversation
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Corps de requête JSON invalide." });
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: "Champ `messages` manquant ou vide." });
  }

  // 2. Convertir au format OpenAI/Groq : system + (eleve→user, prof→assistant)
  const convo = messages
    .filter((m) => m && typeof m.texte === "string" && m.texte.trim())
    .map((m) => ({
      role: m.role === "prof" ? "assistant" : "user",
      content: m.texte,
    }));
  if (convo.length === 0) {
    return json(400, { error: "Aucun message exploitable." });
  }
  const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...convo];

  // 3. Clé API
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Clé API non configurée (GROQ_API_KEY manquante)." });
  }

  // 4. Appel à Groq — sortie JSON forcée (response_format json_object)
  let resp;
  try {
    resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        temperature: 0.5,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });
  } catch (e) {
    return json(502, { error: "Impossible de joindre l'API.", detail: String(e) });
  }

  if (!resp.ok) {
    const detail = await resp.text();
    return json(502, { error: "Erreur de l'API Groq.", detail });
  }

  // 5. Extraire et parser le JSON renvoyé
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    return json(502, { error: "Réponse inattendue de l'API.", detail: JSON.stringify(data).slice(0, 500) });
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const fr = data?.choices?.[0]?.finish_reason || "?";
    return json(502, {
      error: "Réponse non-JSON.",
      detail: "finish_reason=" + fr + " | fin du texte: …" + text.slice(-160),
    });
  }

  return json(200, parsed);
};
