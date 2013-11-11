#!/usr/bin/env node

var program = require("commander");
var Server = require("../lib/server.js");
var packageData = require("../package.json");

program.version(packageData.version);
program.option("-c, --config <filename>", "Configuration file", "./conf/config.json");

program
  .command("server")
  .description("Start the Hive.js server")
  .action(function(options)
  {
    console.log(packageData.name + " version " + packageData.version + " started");
    
    var server = new Server(program);
  });

program.parse(process.argv);

if (program.args.length === 0)
{
  console.log("No command given");
  program.help();
}