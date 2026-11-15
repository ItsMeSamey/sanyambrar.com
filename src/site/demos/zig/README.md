# Real project engines in the browser

`demo.zig` is a bounded browser adapter around the original libraries. It does not
implement an HTML parser or a serializer. The website invokes its WebAssembly
exports in a disposable worker, with an eight-second timeout.

- zhtml: https://github.com/SmallThingz/zhtml/tree/4130c7c348fd824df72d6096fc21b3e3c53b3bd5
  Required source files and generated entity tables are copied unchanged from
  that clean checkout. Its MIT license is preserved in `vendor/zhtml/LICENSE`.
- OneSerial: https://github.com/SmallThingz/oneserial/tree/e03c4378946688b0ce7bee343f48d645a65f3300
  The four library source files are copied unchanged from that clean checkout.
  That revision contains no LICENSE file; no third-party license is invented here.
  This is the portfolio owner's own project.

`provenance.json` records SHA-256 hashes for every vendored file and the shipped
WASM. Library repositories are never modified by the website build.

## Rebuild

Use Zig 0.17.0, then from the portfolio root:

```
ZIG=/path/to/zig node scripts/build-project-engines.mjs
node --test tests/project-engines.test.mjs
bun test tests/project-engine-runner.test.ts
```

The build is offline and uses only vendored source. The checked-in 170 KiB WASM
is emitted as a content-hashed Vite asset and fetched only when a demo is opened
or deliberately warmed. Normal website builds do not require Zig.

The ABI accepts UTF-8 JSON in a fixed 32 KiB input buffer and returns JSON from a
16 MiB per-call arena. HTML input is limited to 8 KiB, selectors to 256 bytes,
and parsed documents to 1024 nodes. OneSerial uses a fixed nested schema, names
up to 512 UTF-8 bytes, and up to 128 u16 scores. Invalid JSON, schema values,
selectors and allocation failures return explicit errors. WASM traps/timeouts
terminate the worker; another run starts a fresh instance.

HTML nodes and selector matches come from zhtml's real document and query APIs;
source HTML is never inserted into the browser DOM. The parser is intentionally
not browser-conformant. OneSerial's real `Wrapper`, `Untrusted.validate()` and
`Trusted` APIs produce the bytes, field ranges and decoded values. Field ranges
include the library's alignment bytes. Truncation removes a byte from the actual
serialized buffer before validation; it is not a simulated validation error.
The wire representation is wasm32 little-endian and is not advertised as a
portable format or a timing benchmark.
