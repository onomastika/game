import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const offline=readFileSync(new URL('../offline.html',import.meta.url),'utf8');
const engine=readFileSync(new URL('../engine.js',import.meta.url),'utf8');
test('advanced controls visible and saved through preferences',()=>{
 for(const x of ['maxWeight','usbAudioRequired','batteryRequired','keyAftertouchRequired']){
  assert.match(html,new RegExp(`id="${x}"`));
  assert.match(app,new RegExp(`\\$\\('#${x}'\\)`));
 }
 for(const x of ['maxWeightKg','usbAudioRequired','batteryRequired','keyAftertouchRequired'])assert.match(engine,new RegExp(x));
});
test('explicit key and pad aftertouch separately explained in UI',()=>{
 assert.match(html,/Aftertouch именно клавиш/);
 assert.match(app,/<span>Aftertouch клавиш<\/span>/);
 assert.match(app,/<span>Aftertouch пэдов<\/span>/);
});
test('reproducible offline bundle includes embedded catalog and does not fetch assets',()=>{
 assert.match(offline,/id="catalog-embedded"/);
 assert.match(offline,/const EMBEDDED_CATALOG/);
 assert.doesNotMatch(offline,/src="\/app\.js"/);
 assert.doesNotMatch(offline,/href="\/styles\.css"/);
 assert.doesNotMatch(offline,/fetch\('\/catalog\.json'/);
 assert.match(offline,/korg-microstation/);
});
test('CSS preserves mobile controls and no external JS dependency',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/@media \(max-width: 560px\)/);
 assert.match(css, /\.spec-citation/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
});
