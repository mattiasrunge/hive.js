
var utils = require("../utils");

exports.next = function(latest)
{
  if (latest === "")
  {
    return "0.0.1";
  }
  
  var parts = latest.split(".");
  parts[parts.length - 1] = (parseInt(parts[parts.length - 1], 10) + 1).toString();
  
  return parts.join(".");
};

exports.sort = function(list)
{
  return list.sort(utils.naturalSort);
};

exports.valid = function(version)
{
  return true;
};

exports.settings = function(settings)
{
};
