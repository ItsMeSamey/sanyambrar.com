

export const isNumber = (v: unknown): v is number => {
  return typeof v === "number";
};

export const isString = (v: unknown): v is string => {
  return typeof v === "string";
};

export const isObject = (v: unknown): v is Record<PropertyKey, unknown> => {
  return v != null && typeof v === "object" && !Array.isArray(v);
};

export const isObjectLike = (v: unknown): v is Record<PropertyKey, unknown> => {
  return v != null && typeof v === "object";
};

export const isPlainObject = (v: unknown): boolean => {
  if (v != null && typeof v === "object") {
    const p = Object.getPrototypeOf(v);
    if (p == null || p === Object.prototype) {
      return true;
    }
  }
  return false;
};
