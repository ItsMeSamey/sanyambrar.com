export type ClassValue = string | number | boolean | null | undefined | ClassValue[] | Record<string, unknown>;
export function clsx(...values: ClassValue[]): string {
  const out: string[] = [];
  const push = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") out.push(String(value));
    else if (Array.isArray(value)) value.forEach(push);
    else if (typeof value === "object") for (const [name, enabled] of Object.entries(value)) if (enabled) out.push(name);
  };
  values.forEach(push);
  return out.join(" ");
}
export default clsx;
