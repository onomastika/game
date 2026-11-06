import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,classify,recommend,standalone,soundPath} from '../engine.js';
const catalog=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const products=catalog.products;
const by=(brand,model)=>products.find(p=>p.brand===brand&&p.model===model);
const date=new Date('2026-11-06T10:00:00');
test('v1.5 includes exactly 44 unique additions and 124 distinct instruments',()=>{
 assert.equal(catalog.schema_version,'0.8.0');
 assert.equal(products.length,124);
 assert.equal(products.filter(p=>p.data_quality==='verified_new_batch_specs_no_local_stock').length,44);
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 assert.equal(new Set(products.map(p=>`${p.brand}::${p.model}`.toLowerCase())).size,products.length);
});
test('every model release year has a dated credible source',()=>{
 for(const p of products){
  assert.ok(Number.isInteger(p.release_year)&&p.release_year<=2026&&p.release_year>=1980,p.id);
  assert.equal(p.release_year_status,'sourced',p.id);
  assert.match(p.release_year_evidence?.url??'',/^https:\/\//,p.id);
 }
 assert.equal(by('Korg','microARRANGER').release_year,2011);
 assert.equal(by('Korg','i3 Music Workstation').release_year,2020);
 assert.equal(by('Korg','Pa600').release_year,2012);
});
test('no invented local prices for the additional 44 and valid year/source links',()=>{
 for(const p of products.filter(p=>p.data_quality==='verified_new_batch_specs_no_local_stock')){
  assert.deepEqual(p.prices,[],p.id);
  assert.ok(p.source_refs?.length,p.id);
  for(const src of p.source_refs)assert.match(src.url,/^https:\/\//,p.id);
  assert.ok(p.release_year_evidence.checked_at>='2026-11-06',p.id);
 }
});
test('own sound without speakers qualifies for computer-free playing but NOT speaker requirement',()=>{
 const fantom=by('Roland','FANTOM 6 EX');
 assert.ok(fantom&&fantom.onboard_sounds===true&&fantom.speakers===false);
 assert.equal(classify(fantom,{...defaults,standalone:'required'},date).status,'eligible');
 assert.equal(classify(fantom,{...defaults,standalone:'required',speakersRequired:true},date).status,'excluded');
 assert.match(soundPath(fantom),/наушники/);
});
test('MIDI-only without sound excluded from autonomous music',()=>{
 const midi=by('Novation','FLkey 61');
 assert.ok(midi&&midi.onboard_sounds===false);
 assert.equal(classify(midi,{...defaults,standalone:'required'},date).status,'excluded');
 assert.equal(standalone(midi),false);
});
test('microSTATION exposes real 61-mini keyboard and audio generator, not onboard speakers',()=>{
 const station=by('Korg','microSTATION');
 assert.ok(station);
 assert.equal(station.keys,61);
 assert.equal(station.key_size,'mini');
 assert.equal(station.onboard_sounds,true);
 assert.equal(station.speakers,false);
 assert.equal(station.release_year,2010);
 assert.equal(classify(station,{...defaults,includeUsed:true,standalone:'required',mini:'required'},date).status,'eligible');
 assert.equal(classify(station,{...defaults,includeUsed:false,standalone:'required',mini:'required'},date).status,'excluded');
});
test('JUNO-X has built-in stereo speakers and USB audio confirmed by Roland',()=>{
 const j=by('Roland','JUNO-X');
 assert.equal(j.speakers,true);assert.equal(j.usb_audio,true);
 assert.equal(j.width_mm,1072);assert.equal(j.release_year,2022);
});
test('MONTAGE M6 / M7 / M8x variations have verified size, keys and aftertouch',()=>{
 const spec=[["MONTAGE M6",61,1037,15.3,'channel'],["MONTAGE M7",76,1244,17.6,'channel'],["MONTAGE M8x",88,1446,28.1,'polyphonic']];
 for(const [model,keys,width,weight,aftertouch] of spec){const p=by('Yamaha',model);assert.ok(p);assert.equal(p.keys,keys);assert.equal(p.width_mm,width);assert.equal(p.weight_kg,weight);assert.equal(p.aftertouch,aftertouch)}
});
test('recommendations never violate hard constraints across all 124 models',()=>{
 for(const keys of [49,61,76,88])for(const standalone of ['no','preferred','required'])for(const mini of ['any','preferred','required'])for(const speakersRequired of [false,true]){
  const r=recommend(products,{...defaults,minKeys:keys,standalone,mini,speakersRequired,includeUsed:true},date);
  assert.ok(r.selected.every(x=>x.verdict.status==='eligible'));
  assert.ok(r.selected.every(x=>x.verdict.checks.every(v=>v.status==='pass')));
 }
});
test('no contradictory source-of-sound flag across catalog',()=>{
 for(const p of products){
  assert.equal(p.external_sound_source_required,p.onboard_sounds===false,p.id);
  assert.ok(!p.speakers || p.onboard_sounds===true,p.id);
 }
});
