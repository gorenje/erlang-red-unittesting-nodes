module.exports = function (RED) {
  function CoreutassertsuccessFunctionality(config) {
    RED.nodes.createNode(this, config);

    var node = this;
    var cfg = config;

    node.on('close', function () {
      if (cfg.count != node.context().get("msgcnt")) {
        RED.comms.publish("unittesting:testresults", {
          flowid: node.context().get("flowid"),
          status: "failed"
        })
      }

      node.context().set("msgcnt", 0)
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function (msg, send, done) {
      let msgcnt = (node.context().get("msgcnt") || 0) + 1;
      node.context().set("msgcnt", msgcnt)
      node.context().set("flowid", msg._original_flow_id || node.z)

      // How to send a status update
      if ((cfg.count || 1) == msgcnt) {
        node.status({ fill: "green", shape: "ring", text: RED._("ut-assert-success.label.succeed") });
        setTimeout(() => { node.status({}); }, 1000)
      } else {
        node.status({ fill: "red", shape: "ring", text: RED._("ut-assert-success.label.failed") + `: ${cfg.count} != ${msgcnt}` });
      }

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

  RED.nodes.registerType("ut-assert-success", CoreutassertsuccessFunctionality);

}
