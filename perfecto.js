const path = require("path");

const {
  exec,
  pathExists,
  onProcessTermination,
} = require("./helpers");

const {
  PERFECTO_BIN_PATH,
  PERFECTO_DEFAULT_DOWNLOAD_URL,
} = require("./consts.json");

const PERFECTO_DIR = path.dirname(PERFECTO_BIN_PATH);
const PERFECTO_BIN_NAME = path.basename(PERFECTO_BIN_PATH);

async function ensurePerfectoBinaryIsInstalled(downloadUrl = PERFECTO_DEFAULT_DOWNLOAD_URL) {
  if (await isPerfectoInstalled()) {
    return { installed: true };
  }

  return safeInstallPerfectoBinary(downloadUrl);
}

async function safeInstallPerfectoBinary(downloadUrl = PERFECTO_DEFAULT_DOWNLOAD_URL) {
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
    return { installed: false, error };
  }

  return { installed: true };
}

async function safeStartPerfecto(params) {
  await assertPerfectoIsInstalled();

  const {
    cloudName,
    securityToken,
  } = params;

  const startCommand = `./${PERFECTO_BIN_NAME} start -c ${cloudName}.perfectomobile.com -s $SECURITY_TOKEN`;
  const startResult = await exec(startCommand, {
    env: { SECURITY_TOKEN: securityToken },
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

  return stopResult.stdout;
}

function handlePerfectoError(error) {
  const message = (error.stdout || error.message || String(error)).toLowerCase();
  throw new Error(message);
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
  safeInstallPerfectoBinary,
  safeStartPerfecto,
  stopPerfecto,
};
