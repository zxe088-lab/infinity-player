import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckpoint} from '../src/playback.mjs';

test('periodic checkpoint survives background and backward seeks without excess writes',()=>{
  let clock=0;const saves=[];
  const p=createCheckpoint(120,n=>saves.push(n),()=>clock);
  p.update(125);assert.deepEqual(saves,[]);
  clock=15000;p.update(135);assert.deepEqual(saves,[135]);
  p.update(42.9);p.flush();assert.deepEqual(saves,[135,42]);
  p.flush();assert.equal(saves.length,2);
});
test('failed playback retains previous checkpoint until actual progress arrives',()=>{
  const saves=[];const p=createCheckpoint(240,n=>saves.push(n));
  p.update(NaN);p.update(-1);p.flush();
  assert.equal(p.position,240);assert.deepEqual(saves,[]);
});
test('completion clears resume and replay can record new progress',()=>{
  const saves=[];const p=createCheckpoint(300,n=>saves.push(n));
  p.finish();p.flush();assert.deepEqual(saves,[0]);
  p.update(17);p.flush();assert.deepEqual(saves,[0,17]);
});
