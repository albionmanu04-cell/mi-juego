import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const lootSource=readFileSync(join(root,'js','combat-loot.js'),'utf8');
const huntSource=readFileSync(join(root,'js','caceria-spire.js'),'utf8');

function progressionRuntime(){
  const context={
    state:{level:1,resets:0},
    LEVEL_CAP:50,
    barracksBonus:0,
    finiteNumber:(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback,
    expToNext:()=>1000,
    settlementBarracksBonus(){ return context.barracksBonus; }
  };
  vm.createContext(context);
  vm.runInContext(lootSource,context,{filename:'js/combat-loot.js'});
  return context;
}

test('combate, élite y jefe conceden experiencia creciente',()=>{
  const context=progressionRuntime();
  assert.equal(context.cardHuntExperienceReward('fight',1,false),40);
  assert.equal(context.cardHuntExperienceReward('elite',1,false),100);
  assert.equal(context.cardHuntExperienceReward('boss',1,false),200);
});

test('el jefe final y el Cuartel mejoran la recompensa',()=>{
  const context=progressionRuntime();
  assert.equal(context.cardHuntExperienceReward('boss',9,true),372);
  context.barracksBonus=.20;
  assert.equal(context.cardHuntExperienceReward('fight',1,false),48);
});

test('el nivel máximo no acumula experiencia adicional',()=>{
  const context=progressionRuntime();
  context.state.level=50;
  assert.equal(context.cardHuntExperienceReward('boss',9,true),0);
});

test('la victoria de Cacería entrega y muestra la experiencia una sola vez',()=>{
  assert.match(huntSource,/if\(hunt\.enemy\.victoryResolved\) return;/);
  assert.match(huntSource,/gainExp\(exp\)/);
  assert.match(huntSource,/experienceReward=exp/);
  assert.match(huntSource,/EXP permanente/);
});
