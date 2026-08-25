# ItsMeSamey.github.io

Static site with two source-built single-file apps:

- `keybr/` -> `keybr.html`
- `wordle/` -> `wordle.html`

Run:

```sh
./build.sh
```

The archive includes the dependency trees used for the build. The build script rebuilds both apps, copies their single-file outputs to the site root, then runs integration assertions from `verify-build.mjs`.

Wordle's small UI compatibility layer lives in `wordle/src/ui-kit/`, so its build does not require the historical nested `solid-ui` git submodule.
