
// https://cwiki.apache.org/confluence/display/MAVENOLD/Repository+Layout+-+Final
// http://maven.apache.org/pom.html#What_is_the_POM
// http://maven.apache.org/guides/mini/guide-3rd-party-jars-remote.html

var fs = require("fs");
var path = require("path");
var express = require("express");
var http = require("http");
var helpers = require("./helpers");


module.exports = function(program)
{
  var app = express();
  var server = http.createServer(app);
  var configData = helpers.readConfiguration(program.config);
  var repositories = helpers.getRepositories(configData.repositoriesPath);
    
  console.log("Repository path is " + configData.repositoriesPath);
  console.log("Re-deploy is " + (configData.enableRedeploy ? "enabled" : "disabled"));
  console.log("Found " + repositories.length + " repositories: " + repositories.join(","));
  
  app.use(express.compress());

  app.use(function(request, response, callback)
  { 
    if (request.auth)
    {
      for (var n = 0; n < configData.users.length; n++)
      {
        if (configData.users[n].username === request.auth.username && configData.users[n].password === request.auth.password)
        {
          //console.log("Client identified as " + configData.users[n].username);
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
      console.log("Client is not allowed to upload files");
      response.send(405, "You must be logged in to upload files");
      return;
    }

    helpers.decodeRepositoryUrl(request.params.repository, request.params[0], function(error, repositoryInfo)
    {
      if (error)
      {
        console.log("Failed to create to decode url, error: " +  error);
        response.send(500, error);
        return;
      }
      
      //console.log("New request to upload ", repositoryInfo);
      
      helpers.ensureGAVStructure(configData.repositoriesPath, repositoryInfo, function(error)
      {
        if (error)
        {
          console.log("Failed to create GAV structure in repository " + repositoryInfo.repository, repositoryInfo, error);
          response.send(500, error);
          return;
        }
        
        helpers.writeUploadedFile(configData.repositoriesPath, repositoryInfo, request, configData.enableRedeploy || !repositoryInfo.isArtifact, function(error, filename)
        {
          if (error)
          {
            console.log(error);
            response.send(500, error);
            return;
          }
          
          if (repositoryInfo.isArtifact)
          {
            console.log(request.auth.username + " uploaded new file (" + repositoryInfo.filename + ") to version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          }
          else
          {
            console.log(request.auth.username + " updated metadata file (" + repositoryInfo.filename + ") for artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
          }
          
          response.send(200);
        });
      });
    });
  }
  
  function handleReserve(request, response)
  {
    if (!request.allowed)
    {
      console.log("Client is not allowed to reserve version");
      response.send(405, "You must be logged in to reserve version");
      return;
    }
    
    helpers.decodeRepositoryUrl(request.params.repository, request.params[0] + "/reserve", function(error, repositoryInfo)
    {
      if (error)
      {
        console.log("Failed to create to decode url, error: " +  error);
        response.send(500, error);
        return;
      }
      
      //console.log("New request to upload ", repositoryInfo);
      
      helpers.ensureGAVStructure(configData.repositoriesPath, repositoryInfo, function(error, reservedVersion)
      {
        if (error)
        {
          console.log("Failed to create GAV structure in repository " + repositoryInfo.repository, repositoryInfo, error);
          response.send(500, error);
          return;
        }
        console.log(request.auth);
        console.log(request.auth.username + " reserved version " + reservedVersion + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
        
        response.send(200, reservedVersion);
      });
    });
  }
  
  for (var n = 0; n < repositories.length; n++)
  {
    app.put("/:repository/*", handlePut);
    app.get("/:repository/*/reserve", handleReserve);
  }

  app.get("*", function(request, response, callback)
  {
    console.log("Got request for " + request.url);
    callback();
  });

  app.use(express.directory(configData.repositoriesPath, { icons: true }));
  app.use(express.static(configData.repositoriesPath));

  server.listen(configData.port);
  console.log("Now listening for connections on port " + configData.port);
};