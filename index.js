'use strict';

//
// Load in every server flavor, so all server tests have the same initial memory
// consumption.
//
var WebSocketServer = require('ws').Server
  , https = require('https')
  , http = require('http')
  , spdy = require('spdy');

//
// Select the server based on the flavor env variable.
//
//     FLAVOR=spdy node index.js    # Start a spdy server.
//     FLAVOR=https node index.js   # Start a https server.
//     FLAVOR=http node index.js    # Start a regular server.
//     node index.js                # Also starts a regular server.
//
var flavor = (process.env.FLAVOR || 'http').toLowerCase()
  , secure = !!~flavor.indexOf('s')
  , server = flavor === 'spdy' ? spdy : (flavor === 'https' ? https : http);

//
// Initialize the SSL
//
var fs = require('fs')
  , options = {
        cert: fs.readFileSync(__dirname +'/ssl/server.crt', 'utf8')
      , key: fs.readFileSync(__dirname +'/ssl/server.key', 'utf8')
    };

//
// Setup the WebSocket server.
//
var app = new WebSocketServer({
  server: !secure
  ? server.createServer(fourohfour)
  : server.createServer(options, fourohfour)
});

/**
 * Handle plain HTTP requests, we are only interested in HTTP requests.
 *
 * @param {Request} req HTTP request
 * @param {Response} res HTTP response
 * @api private
 */
function fourohfour(req, res) {
  res.statusCode = 404;
  res.end('ENOTFOUNDNUBCAKE');
}

//
// Start listening to WebSocket requests and send a message once in a while.
//
var connections = 0
  , disconnection = 0
  , messages = 0
  , failures = 0;

app.on('connection', function connection(socket) {
  ++connections;

  if (connections % 100 === 0) {
    console.log('Received %d connections', connections);
  }

  socket.on('message', function message(data) {
    ++messages;

    socket.send(data, function sending(err) {
      if (err) ++failures;
    });
  });

  socket.on('close', function close() {
    ++disconnection;
  });
});

//
// Output some server information.
//
process.once('exit', function exit() {
  console.log('');
  console.log('Statistics:');
  console.log('  - Connections established %d', connections);
  console.log('  - Connections disconnected %d', disconnection);
  console.log('  - Messages received %d', messages);
  console.log('  - Messages failed %d', failures);
  console.log('');
});

//
// Everything is configured, listen
//
app._server.listen(8080, function listening(err) {
  if (!err) return console.log('BalancerBattleApp (flavor: %s) is listening on port 8080', flavor);

  console.error('Failed to listen on port 8080, due to reasons');
  console.error('  - '+ err.message);
  process.exit(1);
});
