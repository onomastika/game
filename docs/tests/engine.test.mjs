import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults, classify, recommend, standalone, activeOffers} from '../engine.js';
const products = JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8')).products;
const byId = id => products.find(p=>p.id===id);
const date = new Date('2026-11-06T12:00:00');
const choose = override => recommend(products,{...defaults,...override},date);
test('catalog contains 11 unique products and URLs',()=>{
 assert.equal(products.length,11);
 assert.equal(new Set(products.map(p=>p.id)).size,11);
 for(const p of products){assert.ok(Array.isArray(p.source_refs));assert.ok(p.source_refs.length);for(const s of p.source_refs)assert.match(s.url,/^https:\/\//)}
});
test('velocity excludes CT-S200',()=>assert.equal(classify(byId('casio-cts200'),defaults,date).status,'excluded'));
test('mini USB MIDI not mistaken for self-powered instrument',()=>{
 const p=byId('korg-microkey2-61');assert.equal(standalone(p),false);
 assert.equal(classify(p,{...defaults,standalone:'required'},date).status,'excluded');
});
test('mini required plus standalone required does not silently soften criteria',()=>{
 const r=choose({mini:'required',standalone:'required'});
 assert.equal(r.selected.length,0);
});
test('default scenario returns distinct valid recommendations',()=>{
 const r=choose({});assert.ok(r.selected.length>0&&r.selected.length<=3);
 assert.equal(new Set(r.selected.map(p=>p.id)).size,r.selected.length);
 for(const p of r.selected)assert.equal(p.verdict.status,'eligible');
});
test('hard 4M budget excludes a fresh verified 4.29M instrument',()=>{
 const r=classify(byId('korg-microkey2-61'),{...defaults,budgetVnd:4_000_000,hardBudget:true},date);
 assert.equal(r.status,'excluded');
});
test('unknown price is pending rather than pass or excluded',()=>{
 const r=classify(byId('casio-cts1'),{...defaults,budgetVnd:4_000_000,hardBudget:true},date);
 assert.equal(r.status,'pending');
});
test('stale prices never cause a strict budget fail',()=>{
 const r=classify(byId('korg-microkey2-61'),{...defaults,budgetVnd:4_000_000,hardBudget:true},new Date('2026-12-06'));
 assert.equal(r.status,'pending');
});
test('desk width 880mm excludes Casio CT-S1 but allows microKEY2',()=>{
 const u={...defaults,maxWidthMm:880};assert.equal(classify(byId('casio-cts1'),u,date).status,'excluded');assert.equal(classify(byId('korg-microkey2-61'),u,date).status,'eligible');
});
test('legacy blocked until explicitly enabled',()=>{
 const p=byId('korg-microarranger');
 assert.equal(classify(p,defaults,date).status,'excluded');
 assert.notEqual(classify(p,{...defaults,includeUsed:true},date).status,'excluded');
});
test('only confirmed exact-SKU offers count for hard budget',()=>{
 const p=structuredClone(byId('nektar-se61'));p.prices[0].model_variant_confirmed=false;
 assert.equal(activeOffers(p,date).length,0);
 assert.equal(classify(p,{...defaults,hardBudget:true,budgetVnd:3_000_000},date).status,'pending');
});
test('property: every top recommendation passes all hard checks',()=>{
 for(const intent of ['play_now','both','make_music'])for(const mini of ['any','preferred','required'])for(const standaloneChoice of ['no','preferred','required'])for(const minKeys of [49,61,76]){
  const r=choose({intent,mini,standalone:standaloneChoice,minKeys});
  assert.ok(r.selected.every(p=>p.verdict.checks.every(c=>c.status==='pass')));
 }
});
