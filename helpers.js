const util = require("util");
const childProcess = require("child_process");
const { access } = require("fs/promises");
const fs = require("fs");

const exec = util.promisify(childProcess.exec);

async function assertPathExistence(path) {
  if (!await pathExists(path)) {
    throw new Error(`Path ${path} does not exist`);
  }
}

async function pathExists(path) {
  try {
    await access(path, fs.constants.F_OK);
  } catch {
    return false;
  }
  return true;
}

function onProcessTermination(callback) {
  // Handling different exit/termination signals
  const EXIT_EVENT_NAMES = ["exit", "SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM"];
  EXIT_EVENT_NAMES.forEach((eventName) => process.on(eventName, callback));
}

module.exports = {
  exec,
  assertPathExistence,
  pathExists,
  onProcessTermination,
};
