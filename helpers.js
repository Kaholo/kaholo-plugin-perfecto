const util = require("util");
const childProcess = require("child_process");
const { access } = require("fs/promises");
const fs = require("fs");

const exec = util.promisify(childProcess.exec);

async function assertPathExistence(path) {
  try {
    await access(path, fs.constants.F_OK);
  } catch {
    throw new Error(`Path ${path} does not exist`);
  }
}

function handleChildProcess(childProcessInstance, options = {}) {
  const chunks = [];
  return new Promise((res, rej) => {
    const resolver = (code) => {
      const output = chunks.join("");
      if (options.verifyExitCode && code !== 0) {
        rej(new Error(`Code = ${code}\nOutput=${output}`));
      } else {
        res(output);
      }
    };

    childProcessInstance.stdout.on("data", (chunk) => chunks.push(chunk));
    childProcessInstance.stderr.on("data", (chunk) => chunks.push(chunk));

    if (options.finishSignal) {
      childProcessInstance.on(options.finishSignal, resolver);
    } else {
      childProcessInstance.on("exit", resolver);
    }
    childProcessInstance.on("error", rej);
  });
}

function handleCommonErrors(error) {
  const message = (error.message || String(error)).toLowerCase();
  console.info(message);
}

async function stopConnect(connect) {
  if (!connect) {
    return;
  }

  const stopConnectCommand = "./perfectoconnect stop";
  const proc = childProcess.exec(stopConnectCommand, {});
  const stopOutput = await handleChildProcess(
    proc,
    { verifyExitCode: true },
  ).catch(handleCommonErrors);

  console.info(stopOutput);
}

module.exports = {
  assertPathExistence,
  exec,
  handleChildProcess,
  handleCommonErrors,
  stopConnect,
};
