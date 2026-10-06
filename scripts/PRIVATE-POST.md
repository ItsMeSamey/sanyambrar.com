# Private post workflow

The standalone `/blog/2` route ships a generic reader and AES-256-GCM
ciphertext. Writing and search use literal `[REDACTED]` for both title and summary.
The true title, article, filenames, MIME types and opaque asset IDs live inside
`payload.bin`. Images and downloads are separate binary ciphertext files in
`blobs/`, named with random IDs. No original filename or plaintext asset is public.

Keep the source directory **outside this site repository**, ignored by its own
repository. It contains `article.md`, `manifest.json`, `secrets/key.txt`, and
the generated plaintext `medium/` and `medium-export.zip`. Never copy that
directory into `src/`, `docs/`, deployment archives, or Git history.

```sh
bun scripts/pack-private-post.mjs ../private-post-source
bun run build:site
```

The packer creates a cryptographically random 256-bit key once and uses a fresh
96-bit nonce on every encryption. It preserves an existing key and never prints
it. Every file has a four-byte SPB2 header, a 12-byte nonce, and raw ciphertext
with a 128-bit authentication tag. The public files have no base64 layer.
Authenticated additional data binds the format version and resource ID, so an
asset cannot be substituted for another asset or the article. There is no human
password or password-derived key to guess.
Back up `secrets/key.txt` securely: losing it means losing access. To revoke an
old key, deliberately replace it and repack; copies already decrypted cannot
be revoked.

The browser requires HTTPS or localhost. Enter the key in the form or open
`/blog/2#key=YOUR_KEY`. The reader removes the key fragment from the current
history entry only after the article and its images decrypt successfully. It
keeps the fragment while loading or after a failed attempt, so the link can be
retried. Hash changes on the open reader also accept this format. Treat the
original link as a secret; copies outside the reader still contain the key.
Successful unlocks save the key in localStorage under `samey.article.key.<uuid>`.
The UUID comes from the page's stable `article-id` metadata, so changing a route
does not change its storage identity. Reload and back/forward navigation restore
the saved key. Invalid cached keys are removed; temporary loading errors retain
them. The top-bar padlock opens a menu with **Copy URL with key** (copies a link to the clipboard) and
**Lock article**. Locking removes only this article's saved key, clears a key
fragment, and locks other open tabs for that UUID.
The reader sends no key to the server, analytics, sessionStorage or service
worker. It displays only
allowlisted article elements and uses in-memory blob URLs for decrypted assets.
The article and images load after a form or URL-key unlock. Downloads fetch and
decrypt their opaque blob only when clicked, then use the original filename from
the decrypted manifest. All assets are served as static ciphertext by the host;
no server-side decryption or key service is needed.
Page leave removes the decrypted view and revokes blob URLs. Reload and
back/forward restoration decrypt again using the saved key; explicit locking
keeps the article locked until a key is entered again.
The route is excluded from bulk service-worker installation downloads. Normal
network caches may still hold the generic shell and ciphertext, never decrypted
content produced by this reader.

This protects static files at rest, not a compromised hosting origin, browser,
extension or device. Someone able to replace the reader can steal an entered key;
someone allowed to decrypt can save or redistribute the article. JavaScript
strings cannot be reliably erased from memory. `noindex` and redacted labels are
not access controls; the encryption is. Resource sizes and the presence of an
encrypted post are public; the content and original filenames are encrypted.

The Medium export is intentionally plaintext and contains no key. Its README
explains local copy/paste and manual image upload: Medium's normal importer
accepts a published URL, and cannot decrypt this page. Nothing is published by
the packer. Do not commit, push or deploy without the owner's explicit decision.
