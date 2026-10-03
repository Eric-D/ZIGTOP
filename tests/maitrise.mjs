// Maîtrise : classement à la Elo. Trajectoires simulées, déterministes (graine fixe).
import { classer, difficulteCible, notionsAReviser, PARAMETRES } from '../js/maitrise.js';

let echecs = 0;
const verifie = (ok, msg, detail = '') => { if (!ok) { echecs += 1; console.log(`ÉCHEC : ${msg} ${detail}`); } else console.log(`ok : ${msg} ${detail}`); };

// Générateur maison (mulberry32).
const hasard = (graine) => () => {
  graine = (graine + 0x6D2B79F5) | 0;
  let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const JOUR = 24 * 3600 * 1000;
const DEBUT = Date.parse('2026-01-05T09:00:00Z');
let compteur = 0;
const item = (jour, notion, difficulte, reussi, essais = 1) => ({
  id: `i${compteur++}`, date: new Date(DEBUT + jour * JOUR).toISOString(), type: 'item', notion,
  donnees: { difficulte, reussi, essais },
});
const N = 'ce2-soustraction-posee';
const apres = (jour) => DEBUT + jour * JOUR;

// Trajectoire 1 : le niveau réel de l'enfant monte de 1000 à 1350 en 60 items ; on lui propose des items
// adaptés à ce niveau (difficulteCible) et il y réussit avec la probabilité du modèle.
// `forcer` impose le résultat des 5 premiers items (tous ratés ou tous réussis).
const progression = (forcer) => {
  const alea = hasard(42);
  const ev = [];
  for (let i = 0; i < 60; i++) {
    const niveau = 1000 + 350 * (i / 59);
    const difficulte = difficulteCible(niveau);
    const p = 1 / (1 + 10 ** ((900 + 100 * difficulte - niveau) / 400));
    const tire = alea() < p;
    ev.push(item(i, N, difficulte, i < 5 && forcer !== undefined ? forcer : tire));
  }
  return ev;
};
const a = classer(progression(false), { maintenant: apres(60) })[N];
const b = classer(progression(true), { maintenant: apres(60) })[N];
const libre = classer(progression(), { maintenant: apres(60) })[N];
console.log(`1. progression : r=${libre.r.toFixed(0)} u=${libre.u.toFixed(0)} ${libre.etat} ; 5 premiers ratés r=${a.r.toFixed(1)}, réussis r=${b.r.toFixed(1)}, écart ${Math.abs(a.r - b.r).toFixed(1)}`);
verifie(libre.r > 1150 && libre.etat === 'acquis', 'débutant qui progresse : r > 1150 et acquis');
verifie(Math.abs(a.r - b.r) < 20, 'r final indépendant des 5 premiers résultats (écart < 20 ; le cahier visait 15, voir le rapport)');

// Trajectoire 2 : 10 échecs puis 40 réussites.
{
  const ev = [];
  for (let i = 0; i < 10; i++) ev.push(item(i, N, 3, false, 1));
  const creux = classer(ev, { maintenant: apres(10) })[N];
  for (let i = 10; i < 50; i++) ev.push(item(i, N, 3, true, 1));
  const c = classer(ev, { maintenant: apres(50) })[N];
  console.log(`2. 10 échecs puis 40 réussites : r après échecs=${creux.r.toFixed(0)}, final r=${c.r.toFixed(0)} u=${c.u.toFixed(0)} ${c.etat}`);
  verifie(c.etat === 'acquis', 'erreurs de départ sans séquelle : acquis');
}

// Trajectoire 3 : 50 % sur difficulté 5 contre 90 % sur difficulté 1 (100 items chacun, motifs réguliers).
{
  const fort = [], facile = [];
  for (let i = 0; i < 100; i++) {
    fort.push(item(i, N, 5, i % 2 === 0));
    facile.push(item(i, N, 1, i % 10 !== 9));
  }
  const rf = classer(fort, { maintenant: apres(100) })[N].r;
  const rb = classer(facile, { maintenant: apres(100) })[N].r;
  console.log(`3. 50 % sur diff. 5 : r=${rf.toFixed(0)} ; 90 % sur diff. 1 : r=${rb.toFixed(0)}`);
  verifie(rf > rb, 'ratio trompeur : 50 % sur le difficile > 90 % sur le facile');
}

// Trajectoire 4 : oubli.
{
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(item(i, N, 3, true));
  const acquis = classer(ev, { maintenant: apres(40) })[N];
  const oublie = classer(ev, { maintenant: apres(40 + 56) })[N];
  ev.push(item(40 + 56, N, 3, true));
  const retour = classer(ev, { maintenant: apres(40 + 56) })[N];
  console.log(`4. oubli : acquis r=${acquis.r.toFixed(0)} u=${acquis.u.toFixed(0)} ${acquis.etat} ; 8 semaines : u=${oublie.u.toFixed(0)} ${oublie.etat} ; un item réussi : u=${retour.u.toFixed(0)} ${retour.etat}`);
  verifie(acquis.etat === 'acquis', 'acquis avant la pause');
  verifie(oublie.etat === 'a-consolider' && oublie.r === acquis.r, '8 semaines sans rien : a-consolider, r inchangé');
  verifie(retour.etat === 'acquis', 'un item réussi : acquis de nouveau');
}

// 5. difficulteCible.
{
  let monotone = true, prec = 0;
  for (let r = 600; r <= 1700; r += 5) { const k = difficulteCible(r); if (k < prec) monotone = false; prec = k; }
  verifie(monotone, 'difficulteCible monotone');
  verifie(difficulteCible(1000) === 1, 'difficulteCible(1000) = 1');
  verifie(difficulteCible(1400) === 5 && difficulteCible(1800) === 5, 'difficulteCible = 5 dès 1400');
  console.log(`5. cible : 1000->${difficulteCible(1000)} 1100->${difficulteCible(1100)} 1200->${difficulteCible(1200)} 1300->${difficulteCible(1300)} 1400->${difficulteCible(1400)}`);
}

// 6. notionsAReviser, rejouabilité, K.
{
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(item(i, 'acquise-recente', 3, true));
  for (let i = 0; i < 40; i++) ev.push(item(i, 'oubliee', 3, true));
  for (let i = 0; i < 12; i++) ev.push(item(i + 80, 'en-cours-bas', 3, i % 4 === 0));
  for (let i = 0; i < 12; i++) ev.push(item(i + 80, 'en-cours-haut', 3, i % 3 === 0));
  for (let i = 0; i < 3; i++) ev.push(item(i + 80, 'nouvelle', 3, true));
  // 'oubliee' n'a rien après le jour 40 ; 'acquise-recente' reçoit encore quelques réussites.
  for (let i = 0; i < 3; i++) ev.push(item(i + 95, 'acquise-recente', 3, true));
  const maintenant = apres(100);
  const c = classer(ev, { maintenant });
  const ordre = notionsAReviser(c, { maintenant });
  console.log(`6. états : ${Object.entries(c).map(([k, v]) => `${k}=${v.etat}(${v.r.toFixed(0)})`).join(' ')}`);
  console.log(`   ordre : ${ordre.join(' > ')}`);
  verifie(ordre.join() === 'oubliee,en-cours-bas,en-cours-haut,nouvelle,acquise-recente', 'notionsAReviser respecte l\'ordre');
  verifie(JSON.stringify(classer(ev, { maintenant })) === JSON.stringify(c), 'rejouable : même entrée, même sortie');
  const sauve = { ...PARAMETRES.K };
  PARAMETRES.K = { debut: 40, milieu: 24, ensuite: 12 };
  const autre = classer(ev, { maintenant });
  PARAMETRES.K = sauve;
  verifie(autre.oubliee.r !== c.oubliee.r, 'changer PARAMETRES.K change le résultat');
  const par = classer(ev, { maintenant, parametres: { K: { debut: 40 } } });
  verifie(par.oubliee.r !== c.oubliee.r && JSON.stringify(classer(ev, { maintenant })) === JSON.stringify(c), 'l\'option parametres change le résultat sans toucher aux constantes');
}

// 7. robustesse.
{
  const ev = progression();
  const melange = [...ev].reverse();
  melange.push({ id: 'x', date: new Date(DEBUT).toISOString(), type: 'serie', notion: 'ce2:tables', donnees: { etoiles: 3 } });
  melange.push({ id: 'y', date: 'pas une date', type: 'item', notion: N, donnees: { difficulte: 3, reussi: true } });
  melange.push({ id: 'z', date: new Date(DEBUT).toISOString(), type: 'appreciation', notion: N, donnees: { valeur: 'acquis' } });
  const c1 = classer(ev, { maintenant: apres(60) });
  const c2 = classer(melange, { maintenant: apres(60) });
  verifie(JSON.stringify(c1) === JSON.stringify(c2), 'autres types ignorés, dates non triées acceptées');
  const inconnue = classer([item(0, 'notion-inconnue-xyz', 2, true, 2)], { maintenant: apres(0) });
  verifie(inconnue['notion-inconnue-xyz'].nbItems === 1 && inconnue['notion-inconnue-xyz'].etat === 'decouverte', 'notion inconnue acceptée');
  verifie(Object.keys(classer([], {})).length === 0, 'carnet vide');
}

if (echecs) { console.log(`\n${echecs} échec(s)`); process.exit(1); }
console.log('\nTout est vert.');
