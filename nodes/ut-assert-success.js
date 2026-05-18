module.exports = function (RED) {
  function CoreutassertsuccessFunctionality(config) {
    RED.nodes.createNode(this, config);

    var node = this;
    var cfg = config;

    let hasFailed = () => {
      if (!cfg.msglimit) { cfg.msglimit = "==" }
      if (cfg.count == 0) { return (node.context().get("msgcnt") || 0) < 1 }
      else if (cfg.msglimit == "==") { return (node.context().get("msgcnt") || 0) != cfg.count }
      else if (cfg.msglimit == ">=") { return (node.context().get("msgcnt") || 0) < cfg.count }
      else if (cfg.msglimit == "<=") { return (node.context().get("msgcnt") || 0) > cfg.count }
      return false
    }

    node.on('close', function (removed, done) {
      if (removed) {
        if ( hasFailed() ) {
          RED.comms.publish("unittesting:testresults", {
            flowid: node.z,
            status: "failed"
          })
          node.status({ fill: "red", shape: "ring", text: RED._("ut-assert-success.label.failed") + `: ${cfg.count} != ${node.context().get("msgcnt")}` });
          // use node.log(..) here because node.error(..) sends a message to the debug
          // panel but that errors out because the frontend can't find the workspace:
          //    Uncaught TypeError: can't access property "label", RED.nodes.workspace(...) is undefined
          // that has follow-on effects.
          // see https://nodered.org/docs/creating-nodes/node-js#logging-events for more details
          node.log(`ASSERT FAILURE [${node.z}] assert true node failed`)
        }
      } else {
        node.status({});
      }

      node.context().set("msgcnt", 0)
      done();
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function (msg, send, done) {
      let msgcnt = (node.context().get("msgcnt") || 0) + 1;
      node.context().set("msgcnt", msgcnt)

      // How to send a status update
      if ((cfg.count || 1) == msgcnt) {
        node.status({ fill: "green", shape: "ring", text: RED._("ut-assert-success.label.succeed") });
        setTimeout(() => { node.status({}); }, 1000)
      } else {
        // node.status({ fill: "red", shape: "ring", text: RED._("ut-assert-success.label.failed") + `: ${cfg.count} != ${msgcnt}` });
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
