import webpack from "webpack";

/** Emits a single self-contained index.html and removes intermediate JS/CSS. */
export class SingleFilePlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("SingleFilePlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "SingleFilePlugin",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
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
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>keybr local</title>
<style>${css}</style>
</head>
<body>
<header class="site-header"><a class="site-header__home" href="./">Home</a><div class="site-header__title">Keybr</div><div></div></header>
<div id="app"></div>
<script>${js}</script>
</body>
</html>`;
          for (const name of [...cssNames, ...jsNames]) {
            compilation.deleteAsset(name);
          }
          compilation.emitAsset(
            "index.html",
            new webpack.sources.RawSource(html),
          );
        },
      );
    });
  }
}
