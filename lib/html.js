
var fs = require('fs');
var url = require('url');
var path = require('path');
var utils = require('./utils');
var humanize = require("humanize");
var Chain = require("achain.js");
var moment = require("moment");

exports = module.exports = function html(root, options)
{
  options = options || {};

  if (!root)
  {
    throw new Error("Root path is required.");
  }
  
  root = path.normalize(root + "/");

  return function directory(request, response, next)
  {
    if ('GET' != request.method && 'HEAD' != request.method)
    {
      return next();
    }

    var dir = decodeURIComponent(url.parse(request.url).pathname);
    var directory = path.normalize(path.join(root, dir));
    var directoryPath = decodeURIComponent(url.parse(request.originalUrl).pathname);

    // null byte(s), bad requestuest
    if (~directory.indexOf('\0'))
    {
      return next(httpError(400));
    }

    // malicious path, forbidden
    if (0 != directory.indexOf(root))
    {
      return next(httpError(403));
    }

    // check if we have a directory
    fs.stat(directory, function(error, stat)
    {
      if (error)
      {
        return 'ENOENT' == error.code ? next() : next(error);
      }
      
      if (!stat.isDirectory())
      {
        return next();
      }

      fs.readdir(directory, function(error, files)
      {
        if (error)
        {
          return next(error);
        }
        
        files = files.filter(function(file)
        {
          return "." !== file[0];
        });

        files.sort(utils.naturalSort);
        
        var chain = new Chain();
        
        chain.addMany(files, function(file, options, callback)
        {
          fs.stat(path.join(directory, file), function(error, stat)
          {
            if (error)
            {
              callback(error);
              return;
            }
            
            options.files.push({ name: file, stat: stat });
            callback();
          });
        });
        
        chain.run({ files: [] }, function(error, options)
        {
          renderHtml(request, response, options.files, next, directoryPath);
        });
      });
    });
  };
};

function httpError(code, msg)
{
  var error = new Error(msg || http.STATUS_CODES[code]);
  error.status = code;
  return error;
}

function renderHtml(request, response, files, next, directoryPath)
{
  fs.readFile(__dirname + "/../resources/public/index.html", "utf8", function(error, data)
  {
    if (error)
    {
      return next(error);
    }
  
    data = data.replace("{files}", htmlFiles(files, directoryPath));
    data = data.replace("{directory}", directoryPath);
    data = data.replace("{linked-path}", htmlPath(directoryPath));
    
    response.setHeader("Content-Type", "text/html");
    response.setHeader("Content-Length", data.length);
    response.end(data);
  });
}

function htmlPath(directoryPath)
{
  var current = [];
  var parts = directoryPath.split("/");
  
  while (parts.length > 1 && parts[parts.length - 1] === "")
  {
    parts = parts.slice(1);
  }
  
  var html = "<ol class=\"breadcrumb\">\n";
  
  for (var n = 0; n < parts.length; n++)
  {
    var name = parts[n] !== "" ? parts[n] : "Repositories"
    
    current.push(parts[n] !== "" ? encodeURIComponent(parts[n]) : "");
    var url = current.join("/");
    
    if (n === parts.length - 1)
    {
      html += "  <li class=\"active\">" + name + "</li>\n";
    }
    else
    {
      html += "  <li><a href=\"" + (url === "" ? "/" : url) + "\">" + name + "</a></li>\n";
    }
  }
  
  html += "</ol>";
 
  return html;
}

function htmlFiles(files, directoryPath)
{
  var url = directoryPath.split("/").map(function (c) { return encodeURIComponent(c); }).join("/") + "/";
  
  var html = "<table class=\"table table-striped table-hover\">\n";
  
  html += "  <thead>\n";
  html += "    <tr>\n";
  html += "      <th>Name</th>\n";
  html += "      <th>Size</th>\n";
  html += "      <th>Created</th>\n";
  html += "    </tr>\n";
  html += "  </thead>\n";
  html += "  <tbody>\n";
  
  for (var n = 0; n < files.length; n++)
  {
    html += "      <tr>\n";
    html += "        <td><a href=\"" + path.normalize(url + encodeURIComponent(files[n].name)) + "\">\n"
    
    if (files[n].stat.isDirectory())
    {
      if (directoryPath === "/" || directoryPath === "")
      {
        html += "          <span class=\"glyphicon glyphicon-hdd\" style=\"margin-right: 6px;\"></span>\n";
      }
      else
      {
        html += "          <span class=\"glyphicon glyphicon-folder-open\" style=\"margin-right: 6px;\"></span>\n";
      }
    }
    else if (files[n].stat.isFile())
    {
      html += "          <span class=\"glyphicon glyphicon-file\" style=\"margin-right: 6px;\"></span>\n";
    }
    
    html += "          " + files[n].name + "\n";
    html += "        </a></td>\n";
    html += "        <td>" + (files[n].stat.isFile() ? humanize.filesize(files[n].stat.size) : "-") + "</td>\n";
    html += "        <td>" + moment(files[n].stat.mtime).format("dddd, MMMM Do YYYY, HH:mm:ss") + "</td>\n";
    html += "      </tr>\n";
  }
  
  html += "  </tbody>\n";
  html += "</table>\n";
    
  return html;
}
