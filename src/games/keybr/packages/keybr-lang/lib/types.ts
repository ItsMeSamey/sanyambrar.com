

export const isNumber = (v: any): v is number => {
  return typeof v === "number";
};

export const isString = (v: any): v is string => {
  return typeof v === "string";
};

export const isObject = (v: any): v is object => {
  return v != null && typeof v === "object" && !Array.isArray(v);
};

export const isObjectLike = (v: any): boolean => {
  return v != null && typeof v === "object";
};

export const isPlainObject = (v: any): boolean => {
  if (v != null && typeof v === "object") {
    const p = Object.getPrototypeOf(v);
    if (p == null || p === Object.prototype) {
      return true;
    }
  }
  return false;
};
