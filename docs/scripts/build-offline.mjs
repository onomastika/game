import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=file=>readFileSync(resolve(root,file),'utf8');
function exactly(source,from,to){
 const parts=source.split(from);
 if(parts.length!==2)throw new Error(`Expected exactly one occurrence of: ${from.slice(0,80)}`);
 return parts.join(to);
}
let html=read('index.html');
const styles=read('styles.css');
const engine=read('engine.js').replace(/^export /gm,'');
let app=read('app.js');
app=app.replace(/^import \{[^\n]+\} from '\.\/engine\.js';\n/, '');
if(app.startsWith('import '))throw new Error('ESM imports have not been removed');
app=exactly(app,`const res=await fetch('/catalog.json',{cache:'no-store'});if(!res.ok)throw new Error(\`HTTP \${res.status}\`);\n const body=await res.json();`,`const body=EMBEDDED_CATALOG;`);
const catalog=JSON.parse(read('catalog.json'));
const js=`const EMBEDDED_CATALOG = JSON.parse(document.getElementById('catalog-embedded').textContent);\n${engine}\n${app}`;
const embeddedJson=JSON.stringify(catalog).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
html=exactly(html,'<link rel="stylesheet" href="/styles.css">',`<style>\n${styles}\n</style>`);
html=exactly(html,'<link rel="icon" href="/favicon.svg" type="image/svg+xml">','');
html=exactly(html,'<script type="module" src="/app.js"></script>',`<script type="application/json" id="catalog-embedded">${embeddedJson}</script>\n<script type="module">\n${js}\n</script>`);
const output=resolve(root,'offline.html');
writeFileSync(output,html);
console.log(`Built ${output} (${Buffer.byteLength(html).toLocaleString()} bytes, ${catalog.products.length} models)`);
