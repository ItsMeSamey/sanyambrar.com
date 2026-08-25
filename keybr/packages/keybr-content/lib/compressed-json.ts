export async function loadCompressedJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok || response.body == null) {
    throw new Error(`Cannot load compressed JSON: ${response.status}`);
  }
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return (await new Response(stream).json()) as T;
}
