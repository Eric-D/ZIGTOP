// Petits sons générés à la volée (WebAudio) : aucun fichier audio à télécharger.
// Rien d'agressif : des notes douces, et jamais de son « d'erreur ».

let ctx = null;
let actif = true;

export const setActif = (v) => { actif = v; };

function contexte() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function note(frequence, depart, duree, volume = 0.14, forme = 'sine') {
  const c = contexte();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = forme;
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(0, c.currentTime + depart);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + depart + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + depart + duree);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + depart);
  osc.stop(c.currentTime + depart + duree + 0.05);
}

const MELODIES = {
  clic: [[520, 0, 0.08, 0.06]],
  juste: [[523, 0, 0.16], [659, 0.09, 0.16], [784, 0.18, 0.3]],
  // Pour une réponse à retrouver : deux notes qui montent, curieuses, jamais tristes.
  astuce: [[392, 0, 0.16, 0.1], [523, 0.12, 0.24, 0.1]],
  badge: [[523, 0, 0.14], [659, 0.1, 0.14], [784, 0.2, 0.14], [1047, 0.3, 0.4]],
  achat: [[659, 0, 0.12], [880, 0.1, 0.26]],
};

export function jouer(nom) {
  if (!actif) return;
  try {
    (MELODIES[nom] || []).forEach(([f, d, l, v]) => note(f, d, l, v));
  } catch { /* pas de son sur cet appareil : l'application marche pareil */ }
}
