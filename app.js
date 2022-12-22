const kaholoPluginLibrary = require("@kaholo/plugin-library");
const { execute } = require("./mvn-cli");

module.exports = kaholoPluginLibrary.bootstrap({
  runCommand: execute,
});
