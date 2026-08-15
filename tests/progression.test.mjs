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

test('el Abismo Infinito comienza después de la campaña y escala sin techo',()=>{
  const context=progressionRuntime();
  assert.equal(context.cardHuntEndlessAscension(9),0);
  assert.equal(context.cardHuntEndlessAscension(10),1);
  assert.equal(context.cardHuntEndlessAscension(15),6);
  const first=context.cardHuntEndlessDifficulty(10,'boss');
  const second=context.cardHuntEndlessDifficulty(11,'boss');
  assert.ok(first.hp>1);
  assert.ok(first.damage>1);
  assert.ok(first.reward>1);
  assert.ok(second.hp>first.hp);
  assert.ok(second.damage>first.damage);
  assert.ok(second.reward>first.reward);
});

test('la Cacería real guarda el desbloqueo y permite continuar con el mismo mazo',()=>{
  assert.match(huntSource,/cardHuntEndlessUnlocked/);
  assert.match(huntSource,/captureEndlessLoadout\(\)/);
  assert.match(huntSource,/data-hunt-command="settle-endless"/);
  assert.match(huntSource,/data-action="start-endless"/);
  assert.match(huntSource,/hunt\.endless=true/);
  assert.match(huntSource,/ASCENSIÓN/);
});
