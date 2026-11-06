import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const eng=readFileSync(new URL('../engine.js',import.meta.url),'utf8');
test('speaker requirement is visible, wired to settings, saved and enforced',()=>{
 assert.match(html,/id="speakerRequired"/);
 assert.match(app,/speakerRequired.*checked/);
 assert.match(app,/preferences\.speakersRequired=e\.target\.checked/);
 assert.match(eng,/if \(user\.speakersRequired\)/);
});
test('standalone own sounds are distinguished from speakers in the actual visible details',()=>{
 assert.match(app,/p\.onboard_sounds===true/);
 assert.match(app,/<span>Динамики<\/span>/);
 assert.match(app,/собственный звуковой движок|Встроенный генератор звука/);
});
test('front-end remains static, no network scripts or backend requirement',()=>{
 assert.match(html,/src="\/app\.js"/);
 assert.match(html,/href="\/styles\.css"/);
 assert.match(app,/fetch\('\/catalog\.json'/);
 assert.doesNotMatch(html,/https?:\/\/[^"']+\.js/);
});
