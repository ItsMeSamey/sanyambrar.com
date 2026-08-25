import webpack from "webpack/lib/webpack.js";
import config from "../webpack.config.js";

const compiler = webpack(config);
const watch = process.argv.includes("--watch");

function report(error, stats) {
  if (error) throw error;
  if (!stats) throw new Error("Webpack completed without build statistics");
  const output = stats.toString({
    all: false,
    assets: true,
    errors: true,
    errorDetails: true,
    timings: true,
    warnings: true,
  });
  if (output.trim()) process.stdout.write(`${output}\n`);
  if (stats.hasErrors()) throw new Error("Webpack compilation failed");
  if (stats.hasWarnings()) throw new Error("Webpack compilation emitted warnings");
}

if (watch) {
  compiler.watch({}, (error, stats) => {
    try {
      report(error, stats);
    } catch (failure) {
      console.error(failure);
      process.exitCode = 1;
    }
  });
} else {
  try {
    await new Promise((resolve, reject) => {
      compiler.run((error, stats) => {
        try {
          report(error, stats);
          resolve(undefined);
        } catch (failure) {
          reject(failure);
        }
      });
    });
  } finally {
    await new Promise((resolve, reject) => {
      compiler.close((error) => (error ? reject(error) : resolve(undefined)));
    });
  }
}
