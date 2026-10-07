const magic = new Uint8Array([83, 80, 66, 50]);
const encoder = new TextEncoder();
const limit = 8_000_000;

export function decodeBase64(value, url = false) {
  if (typeof value !== 'string' || value.length > 12_000_000) throw Error('Invalid encoding');
  const pattern = url ? /^[A-Za-z0-9_-]{43}$/ : /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!pattern.test(value)) throw Error('Invalid encoding');
  const normalized = url ? value.replaceAll('-', '+').replaceAll('_', '/') + '=' : value;
  const decoded = atob(normalized);
  if (btoa(decoded) !== normalized) throw Error('Noncanonical encoding');
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

export async function importKey(keyText, usages = ['decrypt']) {
  const bytes = decodeBase64(keyText, true);
  try {
    return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, usages);
  } finally {
    bytes.fill(0);
  }
}

function additionalData(resource) {
  if (resource !== 'post' && !/^[a-f0-9]{64}$/.test(resource)) throw Error('Invalid resource');
  return encoder.encode('sanyambrar:sealed:v2:' + resource);
}

export async function sealBytes(bytes, key, resource) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > limit) throw Error('Invalid content');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: additionalData(resource), tagLength: 128 }, key, bytes);
  const output = new Uint8Array(16 + encrypted.byteLength);
  output.set(magic);
  output.set(iv, 4);
  output.set(new Uint8Array(encrypted), 16);
  return output;
}

export async function openBytes(source, key, resource) {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  if (bytes.byteLength < 32 || bytes.byteLength > limit + 32 || !magic.every((value, index) => bytes[index] === value)) throw Error('Invalid encrypted file');
  return new Uint8Array(await crypto.subtle.decrypt({
    name: 'AES-GCM', iv: bytes.slice(4, 16), additionalData: additionalData(resource), tagLength: 128,
  }, key, bytes.slice(16)));
}

export async function openPost(source, key) {
  const bytes = await openBytes(source, key, 'post');
  try {
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (payload?.version !== 2 || typeof payload.html !== 'string' || !payload.assets || typeof payload.assets !== 'object' || Array.isArray(payload.assets)) throw Error('Invalid article');
    const entries = Object.entries(payload.assets);
    if (entries.length > 64) throw Error('Too many assets');
    for (const [name, asset] of entries) {
      if (!/^[a-zA-Z0-9._-]{1,128}$/.test(name) || !asset || !/^[a-f0-9]{64}$/.test(asset.id) || !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/octet-stream'].includes(asset.mime)) throw Error('Invalid asset');
    }
    return payload;
  } finally {
    bytes.fill(0);
  }
}
