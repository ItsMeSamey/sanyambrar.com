import { readFileSync, existsSync } from 'node:fs';
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
for (const file of ['index.html','keybr.html','wordle.html','theme.js','sw.js','blog/index.html','blog/posts/btop-mutex.html']) {
  must(existsSync(file), `missing ${file}`);
}
const keybr = readFileSync('keybr.html','utf8');
const wordle = readFileSync('wordle.html','utf8');
for (const [name, html] of [['keybr',keybr],['wordle',wordle]]) {
  must(html.includes('src="./theme.js"'), `${name}: missing shared theme integration`);
  must(html.includes('data-home-href="./"'), `${name}: missing home integration`);
  must(!html.includes('manifest="appcache.manifest"'), `${name}: obsolete AppCache manifest`);
}
must(!keybr.includes('<header class="site-header"'), 'keybr: stale custom header emitted');
must(keybr.includes('data-site-kind="keybr"'), 'keybr: missing Keybr theme namespace marker');
must(wordle.includes('data-site-kind="wordle"'), 'wordle: missing Wordle theme namespace marker');
must(!keybr.includes('Change the color theme.'), 'keybr: stale native theme controls emitted');
must(!keybr.includes('Change the interface font.'), 'keybr: stale native font controls emitted');
must(wordle.includes('Active Games'), 'wordle: expected active-games UI missing');
must(wordle.includes('stats-page'), 'wordle: expected statistics UI missing');
console.log('build verification: OK');
