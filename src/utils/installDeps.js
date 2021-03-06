const execa = require("execa");
const chalk = require("chalk");
const readline = require("readline");

module.exports = function installDeps(targetDir) {
  return new Promise((resolve, reject) => {
    const child = execa("yarn", [], {
      cwd: targetDir,
      stdio: ["inherit", "inherit", "pipe"],
    });

    child.stderr.on("data", (buf) => {
      const str = buf.toString();
      if (/warning/.test(str)) {
        return;
      }
      // progress bar
      const progressBarMatch = str.match(/\[.*\] (\d+)\/(\d+)/);
      if (progressBarMatch) {
        // since yarn is in a child process, it's unable to get the width of
        // the terminal. reimplement the progress bar ourselves!
        renderProgressBar(progressBarMatch[1], progressBarMatch[2]);
        return;
      }
      process.stderr.write(buf);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("command failed: yarn"));
        return;
      }
      resolve();
    });
  });
};

function renderProgressBar(curr, total) {
  const ratio = Math.min(Math.max(curr / total, 0), 1);
  const bar = ` ${curr}/${total}`;
  const availableSpace = Math.max(0, process.stderr.columns - bar.length - 3);
  const width = Math.min(total, availableSpace);
  const completeLength = Math.round(width * ratio);
  const complete = `#`.repeat(completeLength);
  const incomplete = `-`.repeat(width - completeLength);
  toStartOfLine(process.stderr);
  process.stderr.write(`[${complete}${incomplete}]${bar}`);
}

function toStartOfLine(stream) {
  if (!chalk.supportsColor) {
    stream.write("\r");
    return;
  }
  readline.cursorTo(stream, 0);
}
