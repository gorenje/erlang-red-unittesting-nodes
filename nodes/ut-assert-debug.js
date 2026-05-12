module.exports = function(RED) {
  function Coreut_assert_debugFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;

    node.on('close', function() {
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
      // How to send a status update
      node.status({ fill: "green", shape: "ring", text: RED._("ut-assert-debug.label.statusset") });
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

  RED.nodes.registerType("ut-assert-debug", Coreut_assert_debugFunctionality);

  // Backend endpoints
RED.httpAdmin.get("/UnitTesting/:flowid/runtest",
  (req, res) => {
    const path = require('path');
    const fs = require('fs')
    let testDir = path.resolve(path.dirname(__filename), "..", "testflows")

    res.sendStatus(200);

    var runtime = require("@node-red/runtime");

    if (req.params.flowid == "all") {
      fs.globSync(`${testDir}/**/*.json`).forEach(filename => {
        RED.comms.publish("unittesting:testresults", {
          flowid: path.basename(path.parse(filename).dir),
          status: "success"
        })
      })
    } else {
      fs.globSync(`${testDir}/**/*.json`).filter(d => d.includes(req.params.flowid) ).forEach(filename => {
        let flowDetails = JSON.parse(fs.readFileSync(filename))
        let flowId = req.params.flowid

        let tabNode = flowDetails.filter( d => d.type == "tab")[0]
        let nonTabNodes = flowDetails.filter(d => d.type != "tab")

        let details = {
          ...tabNode,
          nodes: nonTabNodes,
        }

        /*
        runtime._.flows.updateFlow(flowId, details, "root").then( _ignore => {
          runtime._.flows.removeFlow(flowId, "root").then( _alsoIgnore => {
            RED.comms.publish("unittesting:testresults", {
              flowid: path.basename(path.parse(filename).dir),
              status: "success"
            })
          })
        })
        */
        RED.comms.publish("unittesting:testresults", {
          flowid: path.basename(path.parse(filename).dir),
          status: "success"
        })
      })
    }
  });

RED.httpAdmin.get("/UnitTesting/halt",
  (req, res) => {
    res.sendStatus(200);
  });

RED.httpAdmin.get("/UnitTesting/:flowid/retrieve",
  (req, res) => {
    const path = require('path');
    const fs = require('fs')

    let fileName = path.resolve(path.dirname(__filename), "..", "testflows", req.params.flowid, "flows.json")
    const data = fs.readFileSync(fileName);

    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ flowdata: JSON.parse(data) }));
    } catch (err) {
      res.sendStatus(500);
    }
  });

RED.httpAdmin.get("/UnitTesting/tests.json",
  (req, res) => {
    let testData = {
      "status": "ok",
      "last_updated_at": "2025-04-09T14:54:01.665Z",
      "data": {
      }
    }

    const path = require('path');
    const fs = require('fs')

    let testDir = path.resolve(path.dirname(__filename), "..", "testflows")

    fs.globSync(`${testDir}/**/*.json`).forEach(filename => {
      let details = path.parse(filename)
      const data = fs.readFileSync(filename);

      testData.data[path.basename(details.dir)] = {
        "id": path.basename(details.dir),
        "name": JSON.parse(data).filter(d => d.type == "tab")[0].label
      }
    })

    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testData));
    } catch (err) {
      res.sendStatus(500);
    }
  });

}
