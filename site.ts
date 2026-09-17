import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { details } from './src/site/data.ts';

const shell=(title:string,kind:string,root='./') => `<!doctype html><html lang="en" data-site-spa data-site-kind="${kind}" data-site-page="${kind}" data-home-href="${root}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${title}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${root}site.css" data-samey-shared><script src="${root}shared-runtime.js"></script><script type="module" src="${root}site-app.js"></script></head><body><div id="site-root"></div></body></html>`;

async function routePage(root:string,path:string,title:string,kind:string,assetRoot:string){
  const routeDir=join(root,path);
  await mkdir(routeDir,{recursive:true});
  await writeFile(join(routeDir,'index.html'),shell(title,kind,assetRoot));
}

export async function generateSite(root:string){
  await mkdir(root,{recursive:true});
  await writeFile(join(root,'index.html'),shell('Sanyam Brar','home'));
  await Promise.all([
    routePage(root,'work','Work · Sanyam Brar','work','../'),
    routePage(root,'tools','Tools · Sanyam Brar','tools','../'),
    routePage(root,'chain','Chain Reaction','chain','../'),
    routePage(root,'blog','Writing · Sanyam Brar','blog','../'),
    ...Object.entries(details).map(([slug,detail])=>routePage(root,`projects/${slug}`,`${detail.title} · Sanyam Brar`,'project','../../')),
  ]);
}
