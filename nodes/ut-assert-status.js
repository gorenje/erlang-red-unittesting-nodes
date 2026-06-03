module.exports = function(RED) {
  function Coreut_assert_statusFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    var testFailed = (msgstr) => {
      node.status({ fill: "red", shape: "ring", text: RED._("ut-assert-status.status.failed") });
      RED.comms.publish("unittesting:testresults", { flowid: node.z, status: "failed" })
      // sending a message to the debug panel will faile because the node isn't part 
      // of the workspace, hence use `log` instead of `error`.
      node.log(`FAILED [${node.z}] Assert Status '${msgstr}'`)
    }

    var testSucceed = () => {
      node.status({ fill: "green", shape: "dot", text: RED._("ut-assert-status.status.succeed") })
      setTimeout(() => { node.status({}); }, 1000)
    }

    var handler = (msg) => {
      if ((cfg.scope || [cfg.nodeid]).indexOf(msg.id) < 0) { return }

      // ignore status resets - these are when status is undefined or is empty `{}`
      if (!msg.status || (typeof msg.status == "object" && Object.keys(msg.status).length == 0)) { return }

      node.context().set("receivedmsg", true)

      if (cfg.inverse) {
        testFailed("received status where none was expected")
      } else {
        if ((cfg.colour == msg.status.fill) && (cfg.shape == msg.status.shape) ) {
          if (cfg.content) {
            if (cfg.content == msg.status.text) {
              testSucceed()
            } else {
              testFailed(`content mismatch: '${cfg.content}' != '${msg.status.text}'`)
            }
          } else {
            testSucceed()
          }
        } else {
          testFailed(`shape/colour mismatch: expected ${cfg.colour},${cfg.shape} got ${msg.status.fill},${msg.status.shape}`)
        }
      }

      node.send(msg)
    }

    node.context().set("receivedmsg", false)
    require("@node-red/util").events.on('node-status', handler)

    node.on('close', function (removed, done) {
      if (removed) {
        // This node has been disabled/deleted
        let receivedmsg = (node.context().get("receivedmsg") ?? false)
        
        if (!receivedmsg) {
          if (!cfg.inverse) {
            testFailed("expected status message but none received")
          } else {
            testSucceed()
          }
        }
      } else {
        // This node is being restarted
        node.status({})
        node.context().set("receivedmsg", false)
      }

      require("@node-red/util").events.off("node-status", handler)
      done();
    });

  }

  RED.nodes.registerType("ut-assert-status", Coreut_assert_statusFunctionality);

}
