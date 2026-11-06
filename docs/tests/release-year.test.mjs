import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recommend,defaults,classify} from '../engine.js';
const dataset=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const products=dataset.products;
const byModel=(brand,model)=>products.find(p=>p.brand===brand&&p.model===model);
test('80 unique catalog entries, 11 brands, 40 newly extended',()=>{
 assert.equal(products.length,80);
 assert.equal(new Set(products.map(p=>p.id)).size,80);
 assert.equal(new Set(products.map(p=>p.brand)).size,11);
 assert.equal(products.filter(p=>p.data_quality==='spec_release_source_no_local_stock').length,40);
});
test('year either sourced and dated or explicitly unknown; no invented releases after snapshot',()=>{
 assert.equal(dataset.year_policy.unknown_is_null,true);
 const unknown=[];
 for(const p of products){
  assert.ok(Object.hasOwn(p,'release_year'),`${p.id}: missing year`);
  if(p.release_year===null){
   unknown.push(p.id);
   assert.equal(p.release_year_status,'unknown');
   assert.equal(p.release_year_evidence,null);
  }else{
   assert.ok(Number.isInteger(p.release_year)&&p.release_year>=1980&&p.release_year<=2026,p.id);
   assert.equal(p.release_year_status,'sourced');
   assert.match(p.release_year_evidence.url,/^https:\/\//,p.id);
   assert.equal(p.release_year_evidence.checked_at,'2026-11-06');
   assert.ok(p.release_year_evidence.basis.length>5);
  }
 }
 assert.equal(unknown.length,2);
 assert.deepEqual(unknown.sort(),['korg-i3','korg-microarranger']);
});
test('key dates match documented model generation',()=>{
 for(const [brand,model,year] of [
  ['Yamaha','PSR-E483',2026],['Yamaha','PSR-E583',2026],
  ['Roland','FANTOM-06',2022],['Roland','FANTOM-07',2022],
  ['Native Instruments','Kontrol S61 MK3',2023],
  ['Novation','FLkey 2 61',2026],
  ['Roland','GO:KEYS (GO-61K)',2017],
  ['Casio','CT-S1',2021],
 ]){const p=byModel(brand,model);assert.ok(p,`${brand} ${model}`);assert.equal(p.release_year,year);}
});
test('year enrichment does not promote no-velocity or silent gear',()=>{
 const old=byModel('Yamaha','PSR-E283');
 assert.equal(old.velocity,false);
 assert.equal(classify(old,defaults).status,'excluded');
 const synth=byModel('Roland','FANTOM-06');
 assert.equal(synth.onboard_sounds,true);
 assert.equal(synth.speakers,false);
 assert.equal(classify(synth,{...defaults,standalone:'required'}).status,'excluded');
 const r=recommend(products,defaults);
 assert.ok(r.selected.every(p=>p.verdict.checks.every(x=>x.status==='pass')));
});
