import type * as webpack from "webpack";

export interface ConfigDetails {
  build: "server" | "ssr" | "browser";
  webpack: typeof webpack;
}

export interface ConfigFunction {
  (config: webpack.Configuration, details: ConfigDetails):
    | Promise<webpack.Configuration>
    | webpack.Configuration;
}
