// Réglages d'accessibilité. Objectif : que la dyslexie, la dyspraxie, un trouble de
// l'attention ou une hypersensibilité ne soient jamais ce qui empêche de faire des maths.
// Chaque réglage agit sur un attribut de <html>, que la feuille de style interprète.

export const DEFAUTS = {
  lecture: 'normal',   // 'facile' : lettres espacées, lignes aérées, police très lisible
  taille: 'normal',    // taille du texte
  fond: 'creme',       // couleur de page (certains enfants lisent mieux sur teinte douce)
  animations: 'oui',
  voix: 'manuelle',    // 'auto' : chaque énoncé est lu tout seul
  saisie: 'clavier',   // 'choix' : on choisit parmi des réponses au lieu de les écrire
  visuels: 'oui',      // dessins d'aide (jetons, ligne des nombres, parts…)
  serie: '10',         // nombre de questions par série
};

export const GROUPES = [
  {
    titre: 'Pour lire plus facilement',
    reglages: [
      {
        id: 'lecture', libelle: 'Texte',
        options: [
          { v: 'normal', nom: 'Normal' },
          { v: 'facile', nom: 'Lettres espacées', aide: 'Police très lisible, lettres et lignes bien séparées.' },
        ],
      },
      {
        id: 'taille', libelle: 'Taille du texte',
        options: [
          { v: 'normal', nom: 'Normale' },
          { v: 'grand', nom: 'Grande' },
          { v: 'tres-grand', nom: 'Très grande' },
        ],
      },
      {
        id: 'fond', libelle: 'Couleur du fond',
        options: [
          { v: 'creme', nom: 'Crème' },
          { v: 'blanc', nom: 'Blanc' },
          { v: 'bleu', nom: 'Bleu doux' },
          { v: 'gris', nom: 'Gris doux' },
        ],
      },
    ],
  },
  {
    titre: 'Pour rester tranquille et concentré',
    reglages: [
      {
        id: 'animations', libelle: 'Animations et confettis',
        options: [
          { v: 'oui', nom: 'Oui' },
          { v: 'non', nom: 'Non', aide: 'Écran calme : plus rien ne bouge, plus de confettis.' },
        ],
      },
      {
        id: 'serie', libelle: 'Longueur d’une série',
        options: [
          { v: '5', nom: '5 questions', aide: 'Des séries courtes, plus faciles à finir.' },
          { v: '10', nom: '10 questions' },
          { v: '15', nom: '15 questions' },
        ],
      },
    ],
  },
  {
    titre: 'Pour comprendre et répondre',
    reglages: [
      {
        id: 'voix', libelle: 'Lecture des questions',
        options: [
          { v: 'manuelle', nom: 'Sur demande', aide: 'Un bouton 🔊 lit la question quand on le touche.' },
          { v: 'auto', nom: 'Automatique', aide: 'Chaque question est lue à voix haute toute seule.' },
        ],
      },
      {
        id: 'saisie', libelle: 'Répondre',
        options: [
          { v: 'clavier', nom: 'En écrivant' },
          { v: 'choix', nom: 'En choisissant', aide: 'On choisit parmi quelques réponses : pratique quand écrire est difficile.' },
        ],
      },
      {
        id: 'visuels', libelle: 'Dessins d’aide',
        options: [
          { v: 'oui', nom: 'Oui', aide: 'Jetons, ligne des nombres, parts égales… pour voir la quantité.' },
          { v: 'non', nom: 'Non' },
        ],
      },
    ],
  },
];

export function normaliser(reglages = {}) {
  return { ...DEFAUTS, ...reglages };
}

// Applique les réglages à la page : la feuille de style fait le reste.
export function appliquer(reglages) {
  const r = normaliser(reglages);
  const racine = document.documentElement;
  racine.dataset.lecture = r.lecture;
  racine.dataset.taille = r.taille;
  racine.dataset.fond = r.fond;
  racine.dataset.animations = r.animations;
  return r;
}

export const animationsActives = (reglages) => normaliser(reglages).animations === 'oui';
export const tailleSerie = (reglages) => parseInt(normaliser(reglages).serie, 10) || 10;

export function panneau(reglages) {
  const r = normaliser(reglages);
  return GROUPES.map((g) => `
    <div class="section-titre">${g.titre}</div>
    <div class="carte reglages">
      ${g.reglages.map((reg) => {
        const choisie = reg.options.find((o) => o.v === r[reg.id]) || reg.options[0];
        return `
        <div class="reglage">
          <div class="reglage__libelle">${reg.libelle}</div>
          <div class="reglage__options" role="group" aria-label="${reg.libelle}">
            ${reg.options.map((o) => `
              <button class="option" data-reglage="${reg.id}" data-valeur="${o.v}"
                      aria-pressed="${o.v === r[reg.id]}">${o.nom}</button>`).join('')}
          </div>
          ${choisie.aide ? `<div class="reglage__aide">${choisie.aide}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`).join('');
}
