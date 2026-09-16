export async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot load JSON: ${response.status}`);
  }
  return (await response.json()) as T;
}
