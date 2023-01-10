const path = require("path");

const {
  exec,
  pathExists,
  onProcessTermination,
} = require("./helpers");

const {
  PERFECTO_DEFAULT_DOWNLOAD_URL,
} = require("./consts.json");

const PLUGIN_PATH = path.dirname(process.argv[2]);
const PERFECTO_BIN_PATH = path.resolve(PLUGIN_PATH, "perfecto-client/perfectoconnect");
const PERFECTO_DIR = path.dirname(PERFECTO_BIN_PATH);
const PERFECTO_BIN_NAME = path.basename(PERFECTO_BIN_PATH);

async function ensurePerfectoBinaryIsInstalled(downloadUrl = PERFECTO_DEFAULT_DOWNLOAD_URL) {
  if (await isPerfectoInstalled()) {
    return;
  }
  await installPerfectoBinary(downloadUrl);
}

async function installPerfectoBinary(downloadUrl = PERFECTO_DEFAULT_DOWNLOAD_URL) {
  const installCommand = [
    "mkdir -p $PERFECTO_DIR",
    "cd $PERFECTO_DIR",
    "wget $PERFECTO_DOWNLOAD_URL -O $PERFECTO_ARCHIVE",
    "tar -xf $PERFECTO_ARCHIVE",
    "rm $PERFECTO_ARCHIVE",
  ].join(" && ");

  try {
    await exec(installCommand, {
      env: {
        PERFECTO_ARCHIVE: "perfecto.tar",
        PERFECTO_DOWNLOAD_URL: downloadUrl,
        PERFECTO_DIR,
      },
    });
  } catch (error) {
    console.error("Perfecto installation failed, see error details below");
    throw new Error(error.stderr || error.message);
  }
}

async function startPerfecto(params) {
  await assertPerfectoIsInstalled();

  const {
    cloudName,
    securityToken,
  } = params;

  const startCommand = `./${PERFECTO_BIN_NAME} start -c ${cloudName}.perfectomobile.com -s $SECURITY_TOKEN`;
  const startResult = await exec(startCommand, {
    env: {
      ...process.env,
      SECURITY_TOKEN: securityToken,
    },
    cwd: PERFECTO_DIR,
  }).catch(handlePerfectoError);

  // Make sure Perfecto tunnel is closed when the process exits/gets killed or terminated
  onProcessTermination(stopPerfecto);

  const tunnelId = startResult.stdout.trim().split("\n").pop();
  return { tunnelId, fullOutput: startResult.stdout };
}

async function stopPerfecto() {
  await assertPerfectoIsInstalled();

  const stopCommand = `./${PERFECTO_BIN_NAME} stop`;
  const stopResult = await exec(stopCommand, {
    cwd: PERFECTO_DIR,
  }).catch(handlePerfectoError);

  // typically this errors, leaving behind a [perfectoconnect] zombie child of process 1 (npm start)
  // MESSAGE: Command failed: ./perfectoconnect stop
  if (stopResult) {
    console.error(JSON.stringify(stopResult));
  }
}

function handlePerfectoError(error) {
  if (error.stderr) {
    throw new Error(error);
  }
  if (error.stdout) {
    console.error(`[STDOUT] ${error.stdout}`);
  }
  if (error.message) {
    console.error(`[MESSAGE] ${error.message}`);
  }
  // const message = (error.stdout || error.message || String(error)).toLowerCase();
  // throw new Error(message);
}

function isPerfectoInstalled() {
  return pathExists(PERFECTO_BIN_PATH);
}

async function assertPerfectoIsInstalled() {
  if (!await isPerfectoInstalled()) {
    throw new Error(`Perfecto is not installed on the agent! Make sure there is a perfecto binary at ${PERFECTO_BIN_PATH}`);
  }
}

module.exports = {
  ensurePerfectoBinaryIsInstalled,
  installPerfectoBinary,
  startPerfecto,
  stopPerfecto,
};
