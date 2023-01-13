const { docker } = require("@kaholo/plugin-library");
const { homedir: getHomeDirectory } = require("os");
const {
  join: joinPaths,
  resolve: resolvePath,
} = require("path");

const {
  exec,
  assertPathExistence,
} = require("./helpers");
const {
  MAVEN_DOCKER_IMAGE,
  MAVEN_CLI_NAME,
  MAVEN_CACHE_DIRECTORY_NAME,
} = require("./consts.json");

async function execute(params, additionalCommandArguments = []) {
  const {
    command,
    workingDirectory,
    environmentVariables,
    secretEnvVars,
    customImage = MAVEN_DOCKER_IMAGE,
    securityToken,
  } = params;

  const resolvedCommand = `${command} ${additionalCommandArguments.join(" ")}`;
  const dockerCommandBuildOptions = {
    command: docker.sanitizeCommand(resolvedCommand, MAVEN_CLI_NAME),
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
    throw new Error(error.toString().replace(securityToken, "--"));
  });

  if (commandOutput.stderr && !commandOutput.stdout) {
    throw new Error(commandOutput.stderr);
  } else if (commandOutput.stdout) {
    console.error(commandOutput.stderr);
  }

  return commandOutput.stdout;
}

module.exports = {
  execute,
};
