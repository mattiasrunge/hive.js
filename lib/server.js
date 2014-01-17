
// https://cwiki.apache.org/confluence/display/MAVENOLD/Repository+Layout+-+Final
// http://maven.apache.org/pom.html#What_is_the_POM
// http://maven.apache.org/guides/mini/guide-3rd-party-jars-remote.html

var fs = require("fs");
var path = require("path");
var express = require("express");
var http = require("http");
var helpers = require("./helpers");
var html = require("./html");
var mb = require("./mb");
var Logger = require("basic-logger");

var log = new Logger();

module.exports = function(program)
{
  var self = this;
  var app = express();
  var server = http.createServer(app);
  var configData = helpers.readConfiguration(program.config);
  var repositories = helpers.getRepositories(configData.repositoriesPath);
    
  log.info("Repository path is " + configData.repositoriesPath);
  log.info("Re-deploy is " + (configData.enableRedeploy ? "enabled" : "disabled") + " if not overridden on repository configuration");
  log.info("Found " + repositories.length + " repositories: " + repositories.join(","));
  
  if (configData.mb)
  {
    mb.connect(configData.mb, function(error)
    {
      if (error)
      {
        log.error("Failed to connect to message bus, error: " + error);
        return;
      }

      log.info("Successfully connected to message bus!");
    });
  }

  app.use(express.compress());

  app.use(function(request, response, callback)
  { 
    if (request.auth)
    {
      for (var n = 0; n < configData.users.length; n++)
      {
        if (configData.users[n].username === request.auth.username && configData.users[n].password === request.auth.password)
        {
          //log.info("Client identified as " + configData.users[n].username);
          request.allowed = true;
          break;
        }
      }
    }

    callback();
  });

  function handlePut(request, response)
  {
    if (!request.allowed)
    {
      log.warn("Client is not allowed to upload files");
      response.send(401, "You must be logged in to upload files");
      response.end();
      return;
    }
//log.info(request.query);
    helpers.decodeRepositoryUrl(request.params.repository, request.params[0], function(error, repositoryInfo)
    {
      if (error)
      {
        log.error("Failed to create to decode url, error: " +  error);
        response.send(400, error);
        response.end();
        return;
      }
      
      //log.info("New request to upload ", repositoryInfo);
      
      helpers.ensureGAVStructure(configData.repositoriesPath, repositoryInfo, function(error)
      {
        if (error)
        {
          log.error("Failed to create GAV structure in repository " + repositoryInfo.repository, repositoryInfo, error);
          response.send(400, error);
          response.end();
          return;
        }
        
        helpers.writeUploadedFile(configData.repositoriesPath, repositoryInfo, request, repositoryInfo.enableRedeploy || !repositoryInfo.isArtifact, function(error, filename)
        {
          if (error)
          {
            log.error(error);
            response.send(400, error);
            response.end();
            return;
          }
          
          if (repositoryInfo.isArtifact)
          {
            log.info(request.auth.username + " uploaded new file (" + repositoryInfo.filename + ") to version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          }
          else
          {
            log.info(request.auth.username + " updated metadata file (" + repositoryInfo.filename + ") for artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          }

          if (configData.mb)
          {
            helpers.constructMessage(repositoryInfo, request.query, function(error, message)
            {
              if (error)
              {
                log.error("Failed to construct message, error: " + error);
                return;
              }

              if (message)
              {
                mb.publish(configData.mb.routingKey, message, function(error)
                {
                  if (error)
                  {
                    log.error("Failed to publish message, error: " + error);
                    return;
                  }
                 
                  log.info("Published message to the message bus, ", JSON.stringify(message));
                });
              }
            });
          }
          
          response.send(200);
          response.end();
        });
      });
    });
  }
  
  function handleCommand(command, request, response)
  {
    if (!request.allowed)
    {
      log.warn("Client is not allowed to run command");
      response.send(401, "You must be logged in to run command");
      response.end();
      return;
    }
    
    helpers.decodeRepositoryUrl(request.params.repository, request.params[0] + "/" + command, function(error, repositoryInfo)
    {
      if (error)
      {
        log.error("Failed to create to decode url, error: " +  error);
        response.send(400, error);
        response.end();
        return;
      }
      
      //log.info("New request to upload ", repositoryInfo);
      
      helpers.ensureGAVStructure(configData.repositoriesPath, repositoryInfo, function(error)
      {
        if (error)
        {
          log.error("Failed to create GAV structure in repository " + repositoryInfo.repository, repositoryInfo, error);
          response.send(400, error);
          response.end();
          return;
        }
        
        if (command === "reserve")
        {
          log.info(request.auth.username + " reserved version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          
          response.send(201, repositoryInfo.version);
          response.end();
          return;
        }
        else if (command === "unreserve")
        {
          log.info(request.auth.username + " unreserved version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          
          response.send(200, "OK");
          response.end();
          return;
        }
        else if (command === "regenerate")
        {
          log.info(request.auth.username + " regenerated the metadata of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          
          response.send(200, "OK");
          response.end();
          return;
        }
        
        response.send(400, "Unknown command");
        response.end();
      });
    });
  }
  
  for (var n = 0; n < repositories.length; n++)
  {
    app.put("/:repository/*", handlePut);
    app.get("/:repository/*/reserve", function(request, response) { handleCommand("reserve", request, response); });
    app.get("/:repository/*/unreserve", function(request, response) { handleCommand("unreserve", request, response); });
    app.get("/:repository/*/regenerate", function(request, response) { handleCommand("regenerate", request, response); });
  }
  
  app.get("/status", function(request, response, callback)
  {
    response.send(200, "OK");
    response.end();
  });

  app.get("*", function(request, response, callback)
  {
    log.debug("Got request for " + request.url);
    callback();
  });

  app.use(html(configData.repositoriesPath));
  app.use(express.static(configData.repositoriesPath));
  app.use(express.static(path.normalize(__dirname + "/../resources/public/")));

  var sockets = [];

  server.on("connection", function(socket)
  {
    sockets.push(socket);

    socket.on("close", function()
    {
      sockets.splice(sockets.indexOf(socket), 1);
    });
  });
  
  server.listen(configData.port);
  log.info("Now listening for connections on port " + configData.port);
  
  self.close = function(callback)
  {
    log.info("Closing down server...");
    
    mb.close();

    for (var n = 0; n < sockets.length; n++)
    {
      sockets[n].destroy();
    }
    
    server.close(callback);
  };
};
