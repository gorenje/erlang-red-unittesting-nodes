module.exports = function (RED) {
  function CoreutassertfailureFunctionality(config) {
    RED.nodes.createNode(this, config);

    var node = this;
    var cfg = config;

    node.on('close', function () {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function (msg, send, done) {

      RED.comms.publish("unittesting:testresults", {
        flowid: node.z,
        status: "failed"
      })

      // use node.log(..) here because node.error(..) sends a message to the debug
      // panel but that errors out because the frontend can't find the workspace:
      //    Uncaught TypeError: can't access property "label", RED.nodes.workspace(...) is undefined
      // that has follow-on effects.
      // see https://nodered.org/docs/creating-nodes/node-js#logging-events for more details
      node.log(`FAILED [${node.z}] assert failure was sent a message`, msg)
      node.status({ fill: "red", shape: "dot", text: RED._("ut-assert-failure.label.failed") });

      // Send a message and how to handle errors.
      try {
        try {
          send(msg);
          done();
        } catch (err) {
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

  RED.nodes.registerType("ut-assert-failure", CoreutassertfailureFunctionality);

}
