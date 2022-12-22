const childProcess = require("child_process");
const { docker } = require("@kaholo/plugin-library");
const { homedir: getHomeDirectory } = require("os");
const {
  join: joinPaths,
  resolve: resolvePath,
} = require("path");

const {
  exec,
  handleChildProcess,
  handleCommonErrors,
  assertPathExistence,
  stopConnect,
} = require("./helpers");
const {
  MAVEN_DOCKER_IMAGE,
  MAVEN_CLI_NAME,
  MAVEN_CACHE_DIRECTORY_NAME,
} = require("./consts.json");

async function execute(params) {
  const {
    workingDirectory,
    environmentVariables,
    secretEnvVars,
    customImage = MAVEN_DOCKER_IMAGE,
    connect,
    jobName,
    cloudName,
    securityToken,
  } = params;

  let { command } = params;

  // if perfecto connect is required
  if (connect) {
    const { additionalCommandArguments } = await startConnect({ cloudName, securityToken });
    command += additionalCommandArguments;
  }

  const jobNumber = Math.floor(Date.now() / 1000);
  command += ` -B -Dreportium-job-name=${jobName} -Dreportium-job-number=${jobNumber} -DcloudName=${cloudName} -DsecurityToken=${securityToken}`;

  const dockerCommandBuildOptions = {
    command: docker.sanitizeCommand(command, MAVEN_CLI_NAME),
    image: customImage,
  };

  const mavenAgentCachePath = joinPaths(getHomeDirectory(), MAVEN_CACHE_DIRECTORY_NAME);
  const mavenCacheVolumeDefinition = docker.createVolumeDefinition(mavenAgentCachePath);
  // Change mount point to maven cache path
  mavenCacheVolumeDefinition.mountPoint.value = joinPaths("/root", MAVEN_CACHE_DIRECTORY_NAME);
  const volumeDefinitionsArray = [mavenCacheVolumeDefinition];

  const dockerEnvironmentalVariables = {
    [mavenCacheVolumeDefinition.mountPoint.name]: mavenCacheVolumeDefinition.mountPoint.value,
    ...environmentVariables,
    ...secretEnvVars,
  };
  let shellEnvironmentalVariables = {
    ...dockerEnvironmentalVariables,
    [mavenCacheVolumeDefinition.path.name]: mavenCacheVolumeDefinition.path.value,
  };

  const absoluteWorkingDirectory = workingDirectory ? resolvePath(workingDirectory) : process.cwd();
  await assertPathExistence(absoluteWorkingDirectory);
  const workingDirVolumeDefinition = docker.createVolumeDefinition(absoluteWorkingDirectory);

  dockerEnvironmentalVariables[workingDirVolumeDefinition.mountPoint.name] = (
    workingDirVolumeDefinition.mountPoint.value
  );

  shellEnvironmentalVariables = {
    ...shellEnvironmentalVariables,
    ...dockerEnvironmentalVariables,
    [workingDirVolumeDefinition.path.name]: workingDirVolumeDefinition.path.value,
  };

  volumeDefinitionsArray.push(workingDirVolumeDefinition);
  dockerCommandBuildOptions.workingDirectory = workingDirVolumeDefinition.mountPoint.value;

  dockerCommandBuildOptions.volumeDefinitionsArray = volumeDefinitionsArray;
  dockerCommandBuildOptions.environmentVariables = dockerEnvironmentalVariables;

  const dockerCommand = docker.buildDockerCommand(dockerCommandBuildOptions);

  const commandOutput = await exec(dockerCommand, {
    env: shellEnvironmentalVariables,
  }).catch(async (error) => {
    await stopConnect(connect);
    throw new Error(error.toString().replace(securityToken, "--"));
  });

  // stops perfecto connect, handling errors
  // and not throwing it as stop command needs to be executed
  await stopConnect(connect);

  if (commandOutput.stderr && !commandOutput.stdout) {
    throw new Error(commandOutput.stderr);
  } else if (commandOutput.stdout) {
    console.error(commandOutput.stderr);
  }

  return `${commandOutput.stdout}\nReport Link: https://${cloudName}.app.perfectomobile.com/reporting/library?jobName[0]=${jobName}&jobNumber[0]=${jobNumber}`;
}

async function startConnect({ cloudName, securityToken }) {
  await stopConnect(true);
  const startConnectCommand = [
    "wget https://downloads.connect.perfectomobile.com/clients/Perfecto-Connect-linux.tar",
    "tar -xf Perfecto-Connect-linux.tar",
    `./perfectoconnect start -c ${cloudName}.perfectomobile.com -s ${securityToken}`,
  ].join(" && ");

  const proc = childProcess.exec(startConnectCommand, {});
  const tunnelLogs = await handleChildProcess(
    proc,
    { verifyExitCode: true },
  ).catch(handleCommonErrors);

  const tunnelId = tunnelLogs.trim().split("\n").pop();

  console.info(tunnelLogs);
  console.info(`Tunnel ID: ${tunnelId}`);

  return { additionalCommandArguments: ` -DtunnelId="${tunnelId}" ` };
}

module.exports = {
  execute,
};
