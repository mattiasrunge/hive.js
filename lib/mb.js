
var amqp = require("amqp");

var connection = null;

exports.connect = function(config, callback)
{
  config.host = config.host || "localhost";
  config.port = config.port || 5672;
  config.login = config.login || "guest";
  config.password = config.password || "guest";
  config.vhost = config.vhost || "/";

  connection = amqp.createConnection(config, { defaultExchangeName: config.exchange });

  connection.on("error", function(error)
  {
    callback(error);
  });

  connection.on("ready", function()
  {
    callback();
  });
};

exports.close = function() 
{
  if (connection)
  {
    connection.end();
    connection = null;
  }
};

exports.publish = function(routingKey, message, callback)
{
  if (!connection)
  {
    callback("No connection to message bus!");
    return;
  }

  //console.log("Publishing message, ", JSON.stringify(message));
  connection.publish(routingKey, new Buffer(message));
  callback();
};
