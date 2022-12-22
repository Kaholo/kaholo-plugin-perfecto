const kaholoPluginLibrary = require("@kaholo/plugin-library");

const { execute } = require("./mvn-cli");
const {
  safeInstallPerfectoBinary,
  safeStartPerfecto,
  stopPerfecto,
  ensurePerfectoBinaryIsInstalled,
} = require("./perfecto");

async function runCommand(params) {
  const {
    connect,
    perfectoCustomDownloadUrl,
    cloudName,
    securityToken,
    jobName,
  } = params;

  const jobNumber = Math.floor(Date.now() / 1000);
  const additionalArguments = [
    "-B",
    `-Dreportium-job-name=${jobName}`,
    `-Dreportium-job-number=${jobNumber}`,
    `-DcloudName=${cloudName}`,
    `-DsecurityToken=${securityToken}`,
  ];

  // If "connect" is false, do not use perfecto tunnel
  if (!connect) {
    return execute(params, additionalArguments);
  }

  const { installed, error } = await ensurePerfectoBinaryIsInstalled(perfectoCustomDownloadUrl);
  if (!installed) {
    console.error("Perfecto installation failed, see error details below");
    throw error;
  }

  const { tunnelId } = await safeStartPerfecto({ cloudName, securityToken });
  additionalArguments.push(
    `-DtunnelId="${tunnelId}"`,
  );
  const mavenOutput = await execute(params, additionalArguments).finally(stopPerfecto);

  const reportLink = `https://${cloudName}.app.perfectomobile.com/reporting/library?jobName[0]=${jobName}&jobNumber[0]=${jobNumber}`;
  return `${mavenOutput}\nReport Link: ${reportLink}`;
}

async function updatePerfectoClient(params) {
  const { customDownloadUrl } = params;

  // if perfectoCustomDownloadUrl is undefined, the PERFECTO_DOWNLOAD_URL will be used
  return safeInstallPerfectoBinary(customDownloadUrl);
}

module.exports = kaholoPluginLibrary.bootstrap({
  runCommand,
  updatePerfectoClient,
});
