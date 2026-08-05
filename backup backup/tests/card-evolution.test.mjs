import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=readFileSync(join(root,'js','card-evolution.js'),'utf8');
const context={window:{},Date};
vm.createContext(context);
vm.runInContext(source,context,{filename:'card-evolution.js'});
const engine=context.window.CardEvolution;

const mageCards={
  'mage-bolt':{id:'bolt-1',key:'mage-bolt',name:'Misil Arcano',kind:'spell',value:10,desc:'Base'},
  'mage-barrier':{id:'barrier-1',key:'mage-barrier',name:'Barrera Runica',kind:'block',value:13,desc:'Base'},
  'mage-echoes':{id:'echoes-1',key:'mage-echoes',name:'Ecos Arcanos',kind:'spell',value:5,hits:2,desc:'Base'},
  'mage-fracture':{id:'fracture-1',key:'mage-fracture',name:'Sello de Fractura',kind:'bash',value:8,vulnerable:2,desc:'Base'},
  'mage-nova':{id:'nova-1',key:'mage-nova',name:'Nova Celeste',kind:'spell',value:6,hits:3,mana:18,desc:'Base'}
};
const warriorCards={
  'warrior-strike':{id:'strike-1',key:'warrior-strike',name:'Corte de Acero',kind:'attack',value:10,desc:'Base'},
  'warrior-guard':{id:'guard-1',key:'warrior-guard',name:'Guardia de Escudo',kind:'block',value:12,desc:'Base'},
  'warrior-bash':{id:'bash-1',key:'warrior-bash',name:'Rompeguardia',kind:'bash',value:14,mana:10,vulnerable:2,desc:'Base'},
  'warrior-rally':{id:'rally-1',key:'warrior-rally',name:'Grito de Guerra',kind:'strength',value:2,mana:8,desc:'Base'},
  'warrior-second-wind':{id:'wind-1',key:'warrior-second-wind',name:'Segundo Aliento',kind:'mana',value:12,desc:'Base'}
};
const archerCards={
  'archer-shot':{id:'shot-1',key:'archer-shot',name:'Disparo Certero',kind:'attack',value:10,desc:'Base'},
  'archer-step':{id:'step-1',key:'archer-step',name:'Paso Ligero',kind:'block',value:11,desc:'Base'},
  'archer-twin':{id:'twin-1',key:'archer-twin',name:'Flecha Gemela',kind:'attack',value:5,hits:2,desc:'Base'},
  'archer-mark':{id:'mark-1',key:'archer-mark',name:'Marca del Cazador',kind:'bash',value:7,mana:9,vulnerable:2,desc:'Base'},
  'archer-volley':{id:'volley-1',key:'archer-volley',name:'Lluvia de Flechas',kind:'attack',value:6,hits:3,mana:16,desc:'Base'}
};
const cards={...mageCards,...warriorCards,...archerCards};

test('Mago, Guerrero y Cazador tienen cinco cartas base y diez ramas por clase',()=>{
  assert.deepEqual([...engine.definedKeys()].sort(),Object.keys(cards).sort());
  assert.equal(engine.branchCount(),30);
  Object.values(cards).forEach(card=>assert.equal(engine.branchesFor(card).length,2));
});

test('cada rama evoluciona una copia sin mutar la carta original',()=>{
  for(const card of Object.values(cards)){
    for(const branch of engine.branchesFor(card)){
      const original=structuredClone(card);
      const evolved=engine.evolve(card,branch.id);
      assert.deepEqual(card,original);
      assert.equal(evolved.id,card.id);
      assert.equal(evolved.key,card.key);
      assert.equal(evolved.evolution.baseKey,card.key);
      assert.equal(evolved.evolution.branch,branch.id);
      assert.equal(evolved.evolution.branchName,branch.name);
      assert.equal(engine.evolve(evolved,branch.id),null,'una copia evolucionada no puede evolucionar dos veces');
    }
  }
});

test('cada evolución tiene una ilustración WebP disponible',()=>{
  for(const card of Object.values(cards)){
    for(const branch of engine.branchesFor(card)){
      const evolved=engine.evolve(card,branch.id);
      assert.match(evolved.art,/\.webp$/);
      assert.ok(
        existsSync(join(root,'assets','images','cards',evolved.art)),
        `falta la ilustración ${evolved.art}`
      );
    }
  }
});

test('las ramas de poder y sinergia conservan sus mecanicas distintivas',()=>{
  const lance=engine.evolve(mageCards['mage-bolt'],'astral-lance');
  const catalyst=engine.evolve(mageCards['mage-bolt'],'arcane-catalyst');
  const livingRune=engine.evolve(mageCards['mage-barrier'],'living-rune');
  const replica=engine.evolve(mageCards['mage-echoes'],'perfect-replica');
  const resonance=engine.evolve(mageCards['mage-echoes'],'ethereal-resonance');
  const silence=engine.evolve(mageCards['mage-fracture'],'silence-seal');
  const supernova=engine.evolve(mageCards['mage-nova'],'supernova');
  const implosion=engine.evolve(mageCards['mage-nova'],'astral-implosion');
  const cleave=engine.evolve(warriorCards['warrior-strike'],'colossal-cleave');
  const chain=engine.evolve(warriorCards['warrior-strike'],'unstoppable-chain');
  const spikes=engine.evolve(warriorCards['warrior-guard'],'spiked-shield');
  const concussion=engine.evolve(warriorCards['warrior-bash'],'concussive-blow');
  const discipline=engine.evolve(warriorCards['warrior-rally'],'war-discipline');
  const rhythm=engine.evolve(warriorCards['warrior-second-wind'],'battle-rhythm');
  const piercing=engine.evolve(archerCards['archer-shot'],'evolved-piercing-arrow');
  const corrosive=engine.evolve(archerCards['archer-shot'],'corrosive-tip');
  const retreat=engine.evolve(archerCards['archer-step'],'calculated-retreat');
  const triad=engine.evolve(archerCards['archer-twin'],'lethal-triad');
  const hawk=engine.evolve(archerCards['archer-twin'],'hawk-rhythm');
  const prey=engine.evolve(archerCards['archer-mark'],'marked-prey');
  const caustic=engine.evolve(archerCards['archer-volley'],'evolved-caustic-rain');

  assert.equal(lance.guardPierce,.5);
  assert.equal(catalyst.arcaneGain,1);
  assert.equal(livingRune.retain,.5);
  assert.equal(replica.hits,3);
  assert.equal(resonance.draw,1);
  assert.equal(silence.stun,true);
  assert.equal(supernova.hits,4);
  assert.equal(implosion.arcaneConsume,3);
  assert.ok(implosion.arcaneDamage>0);
  assert.equal(cleave.guardPierce,.35);
  assert.equal(chain.effect,'attack_chain');
  assert.equal(spikes.thorns,8);
  assert.equal(concussion.stun,true);
  assert.equal(discipline.draw,2);
  assert.equal(rhythm.draw,1);
  assert.equal(piercing.guardPierce,.65);
  assert.equal(corrosive.acid,2);
  assert.equal(retreat.evade,1);
  assert.equal(triad.hits,3);
  assert.equal(hawk.nextCritical,true);
  assert.equal(prey.effect,'hunter_mark');
  assert.equal(prey.draw,1);
  assert.equal(caustic.acid,3);
});

test('Caceria carga el motor primero y protege la recompensa por acto',()=>{
  const loader=readFileSync(join(root,'js','feature-loader.js'),'utf8');
  const hunt=readFileSync(join(root,'js','caceria-spire.js'),'utf8');
  assert.ok(loader.indexOf('card-evolution.js')<loader.indexOf('caceria-spire.js'));
  assert.match(hunt,/evolutionsClaimed/);
  assert.match(hunt,/pendingEvolution/);
  assert.match(hunt,/if\(hunt\.screen==='evolution'\)/);
  assert.match(hunt,/evolutionClaimed\(\)/);
  assert.match(hunt,/replaceEvolvedCard/);
  assert.match(hunt,/warrior-second-wind'[^\n]+warrior-segundo-aliento-v1\.webp/);
  assert.match(hunt,/previewEvolution/);
});
