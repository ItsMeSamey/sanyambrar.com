declare module "*.json?gzip" {
  const url: string;
  export default url;
}

declare module "*.data" {
  const url: string;
  export default url;
}

declare module "*.module.less" {
  const classes: Record<string, string>;
  export = classes;
}
declare module "*.less";
