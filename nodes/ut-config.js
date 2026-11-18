module.exports = function(RED) {
  function Coreut_configFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {

      const path = require('path');
      const runtime = require("@node-red/runtime");

      // this is taken from the start script for Node-RED
      // https://github.com/node-red/node-red/blob/e4f7fc516cd8da1b4b4d571169cf6937b500bb30/packages/node_modules/node-red/red.js#L466-L481
      // and is used as basis for the getHttpServer function below.
      let getListenPath = (settings) => {
        var port = settings.serverPort;
        if (port === undefined) {
          port = settings.uiPort;
        }

        var listenPath = 'http' + (settings.https ? 's' : '') + '://' +
          (settings.uiHost == '::' ? 'localhost' : (settings.uiHost == '0.0.0.0' ? '127.0.0.1' : settings.uiHost)) +
          ':' + port;
        if (settings.httpAdminRoot !== false) {
          listenPath += settings.httpAdminRoot;
        } else if (settings.httpStatic) {
          listenPath += "/";
        }
        return listenPath;
      }

      let getHttpServer = (settings) => {
        var port = settings.serverPort;
        if (port === undefined) {
          port = settings.uiPort;
        }

        var listenPath = 'http' + (settings.https ? 's' : '') + '://' +
          (settings.uiHost == '::' ? 'localhost' : (settings.uiHost == '0.0.0.0' ? '127.0.0.1' : settings.uiHost)) +
          ':' + port;

        return listenPath;
      }

      // Send a message and how to handle errors.
      try {
        try {
          msg.utcfg = {
            "priv": path.resolve(path.dirname(__filename), "..", "priv"),
            "host": getHttpServer(runtime._.settings),
            "isNodeRed": true
          }
          send(msg);
          done();
        } catch ( err ) {
          // use node.error if the node might send subsequent messages
          node.error("error occurred", { ...msg, error: err })
          done();
        }
      } catch (err) {
        // use done if the node won't send anymore messages for the
        // message it received.
        msg.error = err
        done(err.message, msg)
      }
    });
  }

  RED.nodes.registerType("ut-config", Coreut_configFunctionality);

}
