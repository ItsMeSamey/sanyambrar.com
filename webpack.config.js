import { join } from "node:path";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
import { SingleFilePlugin } from "./webpack-single-file.js";

const mode = process.env.NODE_ENV || "production";

const ruleTs = {
  test: /\.(ts|tsx)$/,
  type: "javascript/auto",
  use: [
    {
      loader: "ts-loader",
      options: {
        transpileOnly: true,
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
  context: import.meta.dirname,
  entry: "./packages/keybr-app/lib/entry.tsx",
  output: {
    path: join(import.meta.dirname, "dist"),
    clean: true,
    filename: "app.js",
    chunkFilename: "chunk-[id].js",
    publicPath: "",
  },
  module: {
    rules: [
      ruleTs,
      ruleLess,
      {
        test: /\/assets\//,
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
