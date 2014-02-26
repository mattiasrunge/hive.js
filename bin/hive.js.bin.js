#!/usr/bin/env node


var path = require("path");
var program = require("commander");
var Logger = require("basic-logger");
var Server = require("../lib/server.js");
var packageData = require("../package.json");

var log = new Logger();

program.version(packageData.version);
program.option("-c, --config <filename>", "Configuration file", path.normalize(path.join(__dirname, "..", "conf", "config.json")));

program
  .command("server")
  .description("Start the Hive.js server")
  .action(function(options)
  {
    log.info(packageData.name + " version " + packageData.version + " started");
    
    var server = new Server(program);
    
    process.on("SIGHUP", function()
    {
      log.error("Received SIGHUP, will do a soft restart...");
      server.close(function()
      {
        server = new Server(program);
      });
    });
  });

program.parse(process.argv);

if (program.args.length === 0)
{
  log.error("No command given");
  program.help();
}

