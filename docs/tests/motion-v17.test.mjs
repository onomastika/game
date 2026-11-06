import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const app=read('app.js');
const css=read('styles.css');
const html=read('index.html');
const offline=read('offline.html');

test('motion remains a progressive enhancement respecting reduced motion',()=>{
 assert.match(app,/prefers-reduced-motion: reduce/);
 assert.match(css,/@media \(prefers-reduced-motion: no-preference\)/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(app,/canAnimate\(\)\?'smooth':'auto'/);
 assert.match(css,/\.motion-detail \{ animation:/);
});
test('motion is short, composited and never perpetual',()=>{
 const motion=css.slice(css.indexOf('/* Motion system v1.7'));
 assert.ok(motion.length>1000);
 assert.doesNotMatch(motion, /\binfinite\b|backdrop-filter|filter: blur\(/i);
 assert.match(motion,/transform: translate3d/);
 assert.match(motion,/opacity: 0/);
 assert.doesNotMatch(motion,/animation[^;\n]*\b(1|2|3|4|5|6|7|8|9|10)s\b/);
});
test('catalog live search avoids entrance while Show More only animates new batch',()=>{
 assert.match(app,/renderCatalog\(recommend\(products,preferences\)\)\}\);/);
 assert.match(app,/const from=displayLimit;displayLimit\+=12;renderCatalog\(recommend\(products,preferences\),\{animate:true,from\}\)/);
 assert.match(app,/i>=from\?motionAttrs\(animate,i-from,12\)/);
});
test('comparison does not rerender the full recommendations and catalog',()=>{
 assert.match(app,/function updateDuelOnly\(\)/);
 assert.match(app,/syncCompareButtons\(\);\s*renderDuel\(true\);/);
 assert.match(app,/duel\.push\(id\);updateDuelOnly\(\)/);
 assert.match(app,/button\.setAttribute\('aria-pressed',String\(selected\)\)/);
});
test('segmented highlight has only one rAF layout batch and resize is passive',()=>{
 assert.match(app,/function schedulePills\(instant=false\)/);
 assert.match(app,/if\(pillsScheduled\) return;/);
 assert.match(app,/requestAnimationFrame\(\(\)=>\{/);
 assert.match(app,/addEventListener\('resize',\(\)=>schedulePills\(true\),\{passive:true\}\)/);
});
test('offline release includes exactly the same motion code and still has no external dependencies',()=>{
 assert.match(offline,/Motion system v1\.7/);
 assert.match(offline,/function syncCompareButtons\(\)/);
 assert.match(offline,/function schedulePills\(instant=false\)/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
});
