
var path = require("path");
var fs = require("fs");
var crypto = require("crypto");
var ensureDir = require("ensureDir");
var moment = require("moment");
var Logger = require("basic-logger");

var configData = {};
var log = new Logger();

exports.readConfiguration = function(filename)
{
  var config = {};
  
  if (filename)
  {
    filename = path.resolve(filename);
  }
  else
  {
    filename = path.normalize(__dirname + "/../conf/config.json");
  }
  
  log.info("Loading configuration from " + filename);
  
  if (fs.existsSync(filename))
  {
    config = require(filename);
  }
  
  config.repositoriesPath = path.resolve(config.repositoriesPath || __dirname + "/../repos");
  config.enableRedeploy = config.enableRedeploy || false;
  config.versionScheme = "default";
  config.port = config.port || 8081;
  config.users = config.users || [ { username: "admin", password: "admin123" } ];
  config.repos = config.repos || {};

  configData = config;
  
  return config;
};

exports.constructMessage = function(repositoryInfo, params, callback)
{
  if (!repositoryInfo.isArtifact)
  {
    callback("Messages can only be constructed for artifacts!");
    return;
  }

  var messageScheme = null;

  if (configData.mb && configData.mb.messageScheme)
  {
    messageScheme = require("./messageScheme/" + configData.mb.messageScheme);
  }
  else
  {
    messageScheme = require("./messageScheme/default");
  }

  callback(null, messageScheme(configData, repositoryInfo, params));
};

// For primary artifacts: /$groupId[0]/../${groupId[n]/$artifactId/$version/$artifactId-$version.$extension
// For secondary artifacts: /$groupId[0]/../$groupId[n]/$artifactId/$version/$artifactId-$version-$classifier.$extension
// For metadata: /$groupId[0]/../$groupId[n]/$artifactId/maven-metadata.$extension
exports.decodeRepositoryUrl = function(repository, url, callback)
{
  if (url[0] !== "/")
  {
    url = "/" + url;
  }
  
  var info = {};
  var parts = url.split("/");
  
  if (configData.repos && configData.repos[repository] && configData.repos[repository].versionScheme)
  {
    info.versionScheme = require("./versionScheme/" + configData.repos[repository].versionScheme);
  }
  else if (configData.versionScheme)
  {
    info.versionScheme = require("./versionScheme/" + configData.versionScheme);
  }
  else
  {
    info.versionScheme = require("./versionScheme/default");
  }
  
  info.repository = repository;
  info.filename = parts[parts.length - 1];
  info.directory = path.dirname(url) + "/";
  
  if (info.filename.indexOf("maven-metadata") !== -1 || info.filename === "reserve" || info.filename === "regenerate")
  {
    info.isArtifact = false;
    info.groupId = parts.splice(1, parts.length - 3).join(".");
    info.artifactId = parts[parts.length - 2];
  }
  else if (info.filename === "unreserve")
  {
    info.isArtifact = false;
    info.groupId = parts.splice(1, parts.length - 4).join(".");
    info.artifactId = parts[parts.length - 3];
    info.version = parts[parts.length - 2];
  }
  else
  {
    info.isArtifact = true;
    info.groupId = parts.splice(1, parts.length - 4).join(".");
    info.artifactId = parts[parts.length - 3];
    info.version = parts[parts.length - 2];
    info.classifier = false;
    
    if (!info.versionScheme.valid(info.version))
    {
      callback("Version (" + info.version + ") is not valid");
      return;
    }
    
    var classifierExt = info.filename.replace(info.artifactId + "-" + info.version, "");
    
    if (classifierExt[0] === "-")
    {
      parts = classifierExt.substr(1).split(".", 2);

      info.classifier = parts[0];
      info.extension = parts[1];
    }
    else if (classifierExt[0] === ".")
    {
      info.extension = classifierExt.substr(1);
    }
    else
    {
      callback("Url is malformed, classifierExt = \"" + classifierExt + "\"");
      return;
    }
  }

  callback(null, info);
};

exports.getRepositories = function(repositoriesPath)
{
  var repositories = [ ];
  var files = fs.readdirSync(repositoriesPath);

  for (var n = 0; n < files.length; n++)
  {
    var stat = fs.statSync(repositoriesPath + "/" + files[n]);
    
    if (stat.isDirectory())
    {
      repositories.push(files[n]);
    }
  }
  
  return repositories;
};

exports.writeUploadedFile = function(repositoriesPath, repositoryInfo, request, overwrite, callback)
{
  var filename = path.normalize(path.join(repositoriesPath, repositoryInfo.repository, repositoryInfo.directory, repositoryInfo.filename));
  
  fs.exists(filename, function(exist)
  {
    if (exist && !overwrite)
    {
      callback(filename + " already exist!", filename);
      return;
    }
  
    var stream = fs.createWriteStream(filename);
    
    stream.once("open", function()
    {
      request.on("data", function(chunk)
      {
        stream.write(chunk);
      });
      
      request.on("end", function()
      {
        stream.end();
        callback(null, filename);
      });
    });
  });
};

exports.ensureArtifactMetadata = function(repositoryPath, repositoryInfo, callback)
{
  var metadataPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId, "maven-metadata.xml"));
  
  fs.exists(metadataPath, function(exist)
  {
    if (!exist)
    {
      exports.updateArtifactMetadata(repositoryPath, repositoryInfo, callback);
    }
    else
    {
      callback();
    }
  });
};

exports.getVersions = function(repositoryPath, repositoryInfo)
{
  var artifactPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId));
  
  var files = fs.readdirSync(artifactPath);
  
  var result = {};
  result.versions = [];
  result.releases = [];
  result.reserved = [];

  for (var n = 0; n < files.length; n++)
  {
    var stat = fs.statSync(path.join(artifactPath, files[n]));
    
    if (stat.isDirectory())
    {
      result.versions.push(files[n]);
      result.releases.push(files[n]);
    }
    else if (stat.isFile() && files[n].indexOf("-RESERVED") !== -1)
    {
      var version = files[n].replace("-RESERVED", "");
      
      result.versions.push(version);
      result.reserved.push(version);
    }
  }
  
  result.versions = repositoryInfo.versionScheme.sort(result.versions);
  result.releases = repositoryInfo.versionScheme.sort(result.releases);
  result.reserved = repositoryInfo.versionScheme.sort(result.reserved);
  
  result.release = result.releases.length > 0 ? result.releases[result.releases.length - 1] : "";
  result.latest = result.versions.length > 0 ? result.versions[result.versions.length - 1] : "";
  result.next = repositoryInfo.versionScheme.next(result.latest);

  return result;
};

exports.updateArtifactMetadata = function(repositoryPath, repositoryInfo, callback)
{
  var artifactPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId));
  var metadataPath = path.normalize(path.join(artifactPath, "maven-metadata.xml"));
  
  var versionInfo = exports.getVersions(repositoryPath, repositoryInfo);
  
  var metadata = "<metadata modelVersion=\"1.1.0\">\n";
  metadata += "  <groupId>" + repositoryInfo.groupId + "</groupId>\n";
  metadata += "  <artifactId>" + repositoryInfo.artifactId + "</artifactId>\n";
  metadata += "  <versioning>\n";
  metadata += "    <latest>" + versionInfo.latest + "</latest>\n";
  metadata += "    <release>" + versionInfo.release + "</release>\n";
  metadata += "    <lastUpdated>" + moment().format("YYYYMMDDHHMMSS") + "</lastUpdated>\n";
  metadata += "    <versions>\n";
  
  for (var i = 0; i < versionInfo.releases.length; i++)
  {
    metadata += "      <version>" + versionInfo.releases[i] + "</version>\n";
  }
  
  metadata += "    </versions>\n";
  metadata += "  </versioning>\n";
  metadata += "</metadata>\n";
  
  var md5 = crypto.createHash("md5").update(metadata).digest("hex");
  var sha1 = crypto.createHash("sha1").update(metadata).digest("hex");
  
  fs.writeFile(metadataPath, metadata, function(error)
  {
    if (error)
    {
      callback(error);
      return;
    }
    
    fs.writeFile(metadataPath + ".sha1", sha1, function(error)
    {
      if (error)
      {
        callback(error);
        return;
      }
      
      fs.writeFile(metadataPath + ".md5", md5, function(error)
      {
        if (error)
        {
          callback(error);
          return;
        }
        
        callback();
      });
    });
  });
};

exports.ensureGAVStructure = function(repositoryPath, repositoryInfo, callback)
{
  var artifactPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId));

  ensureDir(artifactPath, 0755, function(error)
  {
    exports.ensureArtifactMetadata(repositoryPath, repositoryInfo, function(error)
    {
      if (error)
      {
        log.error("Could not ensure metadata file, error: " + error);
        callback(error);
        return;
      }

      if (repositoryInfo.isArtifact || repositoryInfo.filename === "unreserve")
      {
        var versionPath = path.normalize(path.join(artifactPath, repositoryInfo.version));
        var reservedPath = versionPath.replace(/\/$/, "") + "-RESERVED";
        
        if (fs.existsSync(reservedPath))
        {
          fs.unlinkSync(versionPath.replace(/\/$/, "") + "-RESERVED");
        }
        
        if (repositoryInfo.isArtifact)
        {
          ensureDir(versionPath, 0755, callback);
          return;
        }
      }
      else if (repositoryInfo.filename === "reserve")
      {
        var versionInfo = exports.getVersions(repositoryPath, repositoryInfo);
        var versionPath = path.normalize(path.join(artifactPath, versionInfo.next + "-RESERVED"));
        
        fs.writeFile(versionPath, moment().format(), function(error)
        {
          if (error)
          {
            callback(error);
            return;
          }
          
          repositoryInfo.version = versionInfo.next;
          
          callback();
        });
        
        return;
      }
      else if (repositoryInfo.filename === "regenerate")
      {
        exports.updateArtifactMetadata(repositoryPath, repositoryInfo, callback);
        return;
      }
      
      callback();
    });
  });
};
