// Les fiches de révision : toute la suite, en deux processus.
// jsdom ne libère pas ses documents : une seule suite dépassait la limite de mémoire de node (4 Go).
//   fiches-1.mjs : les fiches 1 à 9 (addition posée … monnaie) ;
//   fiches-2.mjs : les fiches 10 à 17 (longueurs … données), les formulations et les empreintes.
// Chaque partie tourne dans son propre processus ; ce lanceur s'arrête en échec si l'une d'elles échoue.
import { spawnSync } from 'child_process';

let echecs = 0;
for (const partie of ['fiches-1.mjs', 'fiches-2.mjs']) {
  const r = spawnSync(process.execPath, [new URL(partie, import.meta.url).pathname], { stdio: 'inherit' });
  if (r.status !== 0) { echecs++; console.log(`✘ ${partie} : échec (code ${r.status})`); }
}
process.exit(echecs ? 1 : 0);
