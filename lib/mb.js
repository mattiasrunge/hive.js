
var amqp = require("amqp");

var connection = null;
var exchange = null;

exports.connect = function(config, callback)
{
  config.host = config.host || "localhost";
  config.port = config.port || 5672;
  config.login = config.login || "guest";
  config.password = config.password || "guest";
  config.vhost = config.vhost || "/";
  config.exchangeDurable = typeof config.exchangeDurable === "undefined" ? false : config.exchangeDurable;
  config.exchangePassive = typeof config.exchangePassive === "undefined" ? true : config.exchangePassive;

  var exchangeOptions = {
    durable: config.exchangeDurable, 
    passive: config.exchangePassive
  };

  connection = amqp.createConnection(config, { defaultExchangeName: config.exchange });

  connection.on("error", function(error)
  {
    callback(error);
  });

  connection.on("ready", function()
  {
    connection.exchange(config.exchange, exchangeOptions, function(_exchange) {
      exchange = _exchange;
                
      callback();
    });
  });
};

exports.close = function() 
{
  if (connection)
  {
    connection.end();
    connection = null;
    exchange = null;
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
  exchange.publish(routingKey, new Buffer(JSON.stringify(message)));
  callback();
};
