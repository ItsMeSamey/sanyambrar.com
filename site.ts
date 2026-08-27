import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { details } from './src/site/data.ts';

const shell=(title:string,kind:string,root='./') => `<!doctype html><html lang="en" data-solid-spa data-site-kind="${kind}" data-site-page="${kind}" data-home-href="${root}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${title}</title><script src="${root}shared-runtime.js"></script><script type="module" src="${root}site-app.js"></script></head><body><div id="site-root"></div></body></html>`;
export async function generateSite(root:string){
  await Promise.all([mkdir(join(root,'projects'),{recursive:true}),mkdir(join(root,'blog'),{recursive:true})]);
  await Promise.all([
    writeFile(join(root,'index.html'),shell('Sanyam Brar','home')),
    writeFile(join(root,'work.html'),shell('Work · Sanyam Brar','work')),
    writeFile(join(root,'tools.html'),shell('Tools · Sanyam Brar','tools')),
    writeFile(join(root,'chain.html'),shell('Chain Reaction','chain')),
    writeFile(join(root,'blog','index.html'),shell('Writing · Sanyam Brar','blog','../')),
    ...Object.entries(details).map(([slug,detail])=>writeFile(join(root,'projects',`${slug}.html`),shell(`${detail.title} · Sanyam Brar`,'project','../'))),
  ]);
}
