/** Emits a single self-contained index.html and removes intermediate JS/CSS. */
export class SingleFilePlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("SingleFilePlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "SingleFilePlugin",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        () => {
          const names = Object.keys(compilation.assets);
          const cssNames = names.filter((name) => name.endsWith(".css"));
          const jsNames = names.filter((name) => name.endsWith(".js"));
          const unexpected = names.filter(
            (name) => !name.endsWith(".css") && !name.endsWith(".js"),
          );
          if (unexpected.length > 0) {
            throw new Error(
              `Single-file build emitted unexpected assets: ${unexpected.join(", ")}`,
            );
          }
          if (jsNames.length !== 1) {
            throw new Error(
              `Single-file build expected exactly one JS asset, got: ${jsNames.join(", ")}`,
            );
          }
          const css = cssNames
            .map((name) => compilation.assets[name].source().toString())
            .join("\n")
            .replaceAll("</style", "<\\/style");
          const js = compilation.assets[jsNames[0]]
            .source()
            .toString()
            .replaceAll("</script", "<\\/script");
          const html = `<!doctype html>
<html lang="en" dir="ltr" data-site-kind="keybr" data-home-href="./">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>keybr local</title>
<style>${css}</style>
<script src="./appearance.generated.js"></script>
<script src="./theme.js"></script>
<style id="samey-boot-style">.samey-boot{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;background:var(--site-bg,#fff);color:var(--site-fg,#121213);font-family:var(--site-font,ui-sans-serif,system-ui)}.samey-boot>div{display:grid;place-items:center;gap:13px}.samey-boot-shape{width:46px;height:46px;border:9px solid currentColor;border-radius:50%;clip-path:polygon(50% 0,63% 18%,85% 15%,82% 37%,100% 50%,82% 63%,85% 85%,63% 82%,50% 100%,37% 82%,15% 85%,18% 63%,0 50%,18% 37%,15% 15%,37% 18%);animation:samey-boot-pulse 1.45s ease-in-out infinite}.samey-boot span{color:var(--site-muted,#787c7e);font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.14em}@keyframes samey-boot-pulse{50%{transform:rotate(30deg) scale(.82)}}@media(prefers-reduced-motion:reduce){.samey-boot-shape{animation:none}}</style>
</head>
<body>
<div id="samey-boot" class="samey-boot"><div><i class="samey-boot-shape"></i><span>loading</span></div></div><script>addEventListener('load',()=>{document.getElementById('samey-boot')?.remove();document.getElementById('samey-boot-style')?.remove()},{once:true})</script>
<div id="app"></div>
<script>${js}</script>
</body>
</html>`;
          for (const name of [...cssNames, ...jsNames]) {
            compilation.deleteAsset(name);
          }
          compilation.emitAsset(
            "keybr.html",
            new compiler.webpack.sources.RawSource(html),
          );
        },
      );
    });
  }
}
