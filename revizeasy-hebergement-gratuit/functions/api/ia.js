// Relais IA gratuit : le site appelle /api/ia, ce fichier appelle Gemini avec VOTRE clé (jamais visible des élèves).
// Variables à définir dans Cloudflare Pages → Settings → Variables and Secrets :
//   GEMINI_API_KEY   (obligatoire, en « Secret »)  : clé créée sur https://aistudio.google.com/apikey
//   GEMINI_MODEL     (facultatif)  : par défaut « gemini-2.5-flash » ; mettez le nom d'un modèle « Flash » gratuit actuel si celui-ci change
//   GEMINI_MODEL_RAPIDE (facultatif) : modèle pour les petites tâches (par défaut le même)
//   ORIGINES         (facultatif)  : adresses autorisées, séparées par des virgules (par défaut : seulement votre propre site)

const REP = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const cle = env.GEMINI_API_KEY;
  if (!cle) return REP({ erreur: "La clé IA n'est pas configurée sur le serveur." }, 500);

  // Seul votre site peut utiliser ce relais.
  const origine = request.headers.get("Origin");
  if (origine) {
    const permis = (env.ORIGINES ? env.ORIGINES.split(",").map(x => x.trim()) : []).concat(new URL(request.url).origin);
    if (!permis.includes(origine)) return REP({ erreur: "Origine non autorisée." }, 403);
  }

  const taille = Number(request.headers.get("Content-Length") || 0);
  if (taille > 8_000_000) return REP({ erreur: "Requête trop volumineuse." }, 413);

  let b;
  try { b = await request.json(); } catch { return REP({ erreur: "Requête illisible." }, 400); }
  const prompt = typeof b.prompt === "string" ? b.prompt : "";
  if (prompt.length < 5 || prompt.length > 80_000) return REP({ erreur: "Texte trop court ou trop long." }, 400);
  const images = (Array.isArray(b.images) ? b.images : []).slice(0, 3)
    .filter(i => i && typeof i.data === "string" && i.data.length < 3_500_000 && /^image\/(jpeg|png|webp)$/.test(i.mime || ""))
    .map(i => ({ inline_data: { mime_type: i.mime, data: i.data } }));

  const modele = (b.tier === "quick" && env.GEMINI_MODEL_RAPIDE) || env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`;
  let r;
  try {
    r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, ...images] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 8192 },
      }),
    });
  } catch { return REP({ erreur: "Le service IA ne répond pas." }, 502); }

  if (!r.ok) {
    const code = r.status === 429 ? 429 : r.status === 503 ? 503 : 502;
    return REP({ erreur: code === 429 ? "Quota gratuit de l'IA atteint pour le moment : réessaie dans une minute." : "Le service IA a refusé la demande (" + r.status + ")." }, code);
  }
  const j = await r.json().catch(() => null);
  const texte = (j?.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? "").join("");
  if (!texte) return REP({ erreur: "Réponse IA vide." }, 502);
  return REP({ text: texte });
}

export async function onRequest() { return REP({ erreur: "Méthode non autorisée." }, 405); }
