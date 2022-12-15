# Kaholo Perfecto Plugin
This plugin provides [Perfecto](https://www.perfecto.io/) integration to Kaholo Pipelines. Perfecto by Perforce is the web and mobile app testing platform most trusted in the industry. 

## Plugin Installation
For download, installation, upgrade, downgrade and troubleshooting of plugins in general, see [INSTALL.md](./INSTALL.md).

## Method: Run Maven Command
This method run any command that begins with `mvn`, for example `mvn package`. To run commands that do NOT start with `mvn`, see the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd) instead.

### Parameter: Working Directory
A path within which the project requiring building exists. This is typically a repository cloned to the agent using the [Git Plugin](https://github.com/Kaholo/kaholo-plugin-git) earlier in the pipeline. It is simplest if this directory contains the main pom.xml. Only files within this directory will be available to the maven command.

Working directory is typically a path relative to the default one, e.g. `/twiddlebug/workspace`. For example if you used the Git plugin to clone your project, e.g. `myproject`, and you did not specify any clone path, the relative path for working directory is simply `myproject`.

The absolute path in this case would be `/twiddlebug/workspace/myproject`. You could also leave Working Directory empty and descend into `myproject` using the Maven Command... `mvn package -f myproject/pom.xml`.

### Parameter: Environment Variables
This parameter is a one-per-line KEY=VALUE list of environment variables that will be set in the environment where the Maven Command runs. For example:

    TARGET_ENVIRONMENT=dev
    IP_ADDR=10.55.23.2
    JAVA_VERSION=18

### Parameter: Secret Environment Variables
This parameter is a one-per-line KEY=VALUE list of environment variables that will be set in the environment where the Maven Command runs. The only difference from parameter `Environment Variables` is that these are securely stored in the Kaholo Vault and will not appear in the logs or user interface.

### Parameter: Custom Docker Image
By default the plugin uses the standarad `maven:3.8.6` image from Docker Hub. If there is a requirement to use another image, for example one supporting Selenium testing, then you can specify another image here. Try `maven:latest` for the most recently build maven image.

### Parameter: Command
This is where you put the maven command you'd like to run, for example `mvn package`. Note that pom.xml should probably be found in the Working Directoy for most commands to work, unless an alternative location is specified in the command with `-f`.

A good command to just test if the plugin is correctly installed and working is `mvn --version`.

### Parameter: Perfecto Connect
Starts Perfecto Connect tunnel if needed.


## Notes:
* The current plugin support running on Maven at the moment.
* Perfecto connect downloads the linux file at the moment.

## Use of Docker
This plugin relies on the [official Docker image](https://hub.docker.com/_/maven) "maven" to run the Maven command, `mvn`. This has many upsides but a few downsides as well of which the user should be aware.

The first time the plugin is used on each agent, docker may spend a minute or two downloading the image. After that the delay of starting up another docker image each time is quite small, a second or two. Method "Get Maven Version" is a quick and simple way to force the image to download and/or test if the image is already cached locally on the Kaholo agent.

Next, because the CLI is running inside a docker container, it will not have access to the complete filesystem on the Kaholo agent. Parameter "Working Directory" is particularly important for this. Files outside of Working Directory will not be accessible within the docker image running the `mvn` command.

The docker container is destroyed once the command has successfully run, so output files will also be destroyed, apart from those within your working directory.