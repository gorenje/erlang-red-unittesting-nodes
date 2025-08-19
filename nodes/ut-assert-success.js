module.exports = function(RED) {
  function CoreutassertsuccessFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;


    var sendToDebug = (nde, rule, msgc, lvl) => {
      try {
        let msg = {
          id: nde.id,
          z: nde.z,
          _alias: nde._alias,
          path: nde._flow.path,
          name: nde.name,
          topic: msgc.topic,
          msg: { msg: msgc, rule: rule },
          level: lvl
        }

        msg = RED.util.encodeObject(msg);
        RED.comms.publish("debug", msg);
      } catch (ex) {
        console.error(ex)
      }
      return ["failure", rule];
    }

    var postUnsupported = (rule, msg) => {
      node.status({
        fill: "red", shape: "dot",
        text: RED._("ut-assert-success.label.unsupported", { property: JSON.stringify(rule) })
      });
      sendToDebug(node, rule, msg, 30)

      return ["unsupported", rule]
    }


    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
        // How to send a status update
        if ( cfg.count == 1) {
          node.status({ fill: "green", shape: "ring", text: RED._("ut-assert-success.label.succeed") });
        } else {
          postUnsupported("count != 1", msg)
          node.status({ fill: "red", shape: "ring", text: RED._("ut-assert-success.label.failed") });
        }
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

  RED.nodes.registerType("ut-assert-success", CoreutassertsuccessFunctionality);

}
