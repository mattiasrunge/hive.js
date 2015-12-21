
var amqp = require("amqp");
var Chain = require("achain.js");

var connections = [];
var exchanges = [];

exports.connect = function(config, callback)
{
  if (!(config instanceof Array))
  {
    config = [ config ];
  }

  var chain = new Chain();

  chain.addMany(config, function(config, options, callback)
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

    var connection = amqp.createConnection(config, { defaultExchangeName: config.exchange });

    connection.on("error", function(error)
    {
      callback(error);
    });

    connection.on("ready", function()
    {
      connection.exchange(config.exchange, exchangeOptions, function(exchange) {
        exchanges.push(exchange);
        connections.push(connection);

        callback();
      });
    });
  });

  chain.run(callback);
};

exports.close = function()
{
  for (var n = 0; n < connections.length; n++)
  {
    connections[n].end();
  }

  connections = [];
  exchanges = [];
};

exports.publish = function(routingKey, message, callback)
{
  if (connections.length === 0)
  {
    callback("No connection to message bus!");
    return;
  }

  var chain = new Chain();

  chain.addMany(exchanges, function(exchange, options, callback)
  {
    //console.log("Publishing message, ", JSON.stringify(message));
    exchange.publish(routingKey, new Buffer(JSON.stringify(message)));
    callback();
  });

  chain.run(callback);
};
