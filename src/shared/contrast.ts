export type ContrastText = "#000000" | "#ffffff";

const linear = (value:number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

export function contrastTextRgb(r:number, g:number, b:number):ContrastText {
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#ffffff" : "#000000";
}

export function contrastText(hex:string):ContrastText {
  return contrastTextRgb(...([1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]));
}
