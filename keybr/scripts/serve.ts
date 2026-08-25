const file = Bun.file(new URL("../dist/index.html", import.meta.url));
if (!(await file.exists())) {
  console.error("dist/index.html does not exist. Run `bun run build` first.");
  process.exit(1);
}
Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  fetch() {
    return new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
});
console.log("keybr local: http://localhost:3000");
