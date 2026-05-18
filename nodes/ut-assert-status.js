module.exports = function(RED) {
  function Coreut_assert_statusFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.on('close', function(removed, done) {
      if ( removed) {
        node.status({});
      } else {
        // use node.log(..) here because node.error(..) sends a message to the debug
        // panel but that errors out because the frontend can't find the workspace:
        //    Uncaught TypeError: can't access property "label", RED.nodes.workspace(...) is undefined
        // that has follow-on effects.
        node.log(`UNSUPPORTED [${node.z}] status is not supported`)
      }
      done()
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
      // How to send a status update
      node.status({ fill: "green", shape: "ring", text: RED._("ut-assert-status.label.statusset") });
      setTimeout(() => { node.status({}); }, 1000)

      // Send a message and how to handle errors.
      try {
        try {
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

  RED.nodes.registerType("ut-assert-status", Coreut_assert_statusFunctionality);

}
