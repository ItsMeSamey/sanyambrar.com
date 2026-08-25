import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
import { SingleFilePlugin } from "./webpack-single-file.js";

const mode = process.env.NODE_ENV || "production";
const rootDir = import.meta.dirname;
const packagesDir = join(rootDir, "packages");

function gzipDataUrl(content) {
  const compressed = gzipSync(content, { level: 9 });
  return `data:application/gzip;base64,${compressed.toString("base64")}`;
}

// Bun does not need to expose private workspaces through node_modules for the
// bundle to work. Resolve every retained @keybr/* workspace directly from its
// package directory instead. This also makes Less imports such as
// @keybr/themes/lib/index.less resolve through the same graph as TS imports.
const workspaceAliases = Object.fromEntries(
  readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageDir = join(packagesDir, entry.name);
      const packageJson = join(packageDir, "package.json");
      try {
        const { name } = JSON.parse(readFileSync(packageJson, "utf8"));
        return typeof name === "string" && name.startsWith("@keybr/")
          ? [[name, packageDir]]
          : [];
      } catch {
        return [];
      }
    }),
);

const ruleTs = {
  test: /\.(ts|tsx)$/,
  type: "javascript/auto",
  use: [
    {
      loader: "ts-loader",
      options: {
        configFile: join(rootDir, "tsconfig.webpack.json"),
        transpileOnly: true,
        onlyCompileBundledFiles: true,
        compilerOptions: {
          target: "es2022",
          module: "esnext",
          moduleResolution: "bundler",
          jsx: mode === "development" ? "react-jsxdev" : "react-jsx",
        },
      },
    },
  ],
};

const ruleLess = {
  test: /\.(less|css)$/,
  use: [
    MiniCssExtractPlugin.loader,
    {
      loader: "css-loader",
      options: {
        modules: {
          auto: /\.module\.(less|css)$/,
          namedExport: true,
          exportGlobals: true,
          exportLocalsConvention: "dashesOnly",
          localIdentName:
            mode === "development"
              ? "[name]__[local]__[hash:base64:6]"
              : "[hash:base64:8]",
        },
      },
    },
    "less-loader",
  ],
};

export default {
  name: "keybr-local",
  target: "web",
  mode,
  context: rootDir,
  entry: "./packages/keybr-app/lib/entry.tsx",
  output: {
    path: join(rootDir, "../docs"),
    clean: false,
    filename: "app.js",
    chunkFilename: "chunk-[id].js",
    publicPath: "",
  },
  resolve: {
    alias: workspaceAliases,
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      ruleTs,
      ruleLess,
      {
        test: /\.json$/i,
        resourceQuery: /gzip/,
        type: "asset/inline",
        generator: {
          dataUrl: gzipDataUrl,
        },
      },
      {
        test: /\.data$/i,
        type: "asset/inline",
        generator: {
          dataUrl: gzipDataUrl,
        },
      },
      {
        test: /\/assets\//,
        exclude: /\.data$/i,
        type: "asset/inline",
      },
    ],
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: false,
    minimizer: [
      new TerserPlugin({ extractComments: false }),
      new CssMinimizerPlugin(),
    ],
  },
  devtool: false,
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(mode),
      "typeof window": JSON.stringify("object"),
    }),
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    new MiniCssExtractPlugin({ filename: "app.css", chunkFilename: "app.css" }),
    new SingleFilePlugin(),
  ],
  performance: {
    hints: false,
  },
};
