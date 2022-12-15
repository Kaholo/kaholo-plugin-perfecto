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

function handleChildProcess(childProcess, options = {}) {
    const chunks = [];
    return new Promise((res, rej) => {
        const resolver = (code) => {
            const output = chunks.join("");
            if (options.verifyExitCode && code !== 0) {
                rej(new Error(`Code = ${code}\nOutput=${output}`));
            } else { res(output); }
        };

        childProcess.stdout.on("data", (chunk) => chunks.push(chunk));
        childProcess.stderr.on("data", (chunk) => chunks.push(chunk));

        if (options.finishSignal) {
            childProcess.on(options.finishSignal, resolver);
        } else { childProcess.on("exit", resolver); }
        childProcess.on("error", rej);
    });
}

function handleCommonErrors(error) {
    let message = (error.message || String(error)).toLowerCase();
    console.info(message)
}

function joinCommand(command) {
    const output = command.split("\n").map((item) => item.trim()).join(" ; ");
    return output;
  }
  
async function stopConnect(connect) {
    if (connect) {
        const stopConnect = `./perfectoconnect stop`;
        const proc = childProcess.exec(stopConnect, {});
        console.log(await handleChildProcess(proc, { verifyExitCode: true }).catch(handleCommonErrors));
    }
}

module.exports = {
    assertPathExistence,
    exec,
    handleChildProcess,
    handleCommonErrors,
    joinCommand,
    stopConnect
};