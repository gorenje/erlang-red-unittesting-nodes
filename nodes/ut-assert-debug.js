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
      fs.globSync(`${testDir}/**/*.json`).filter(d => d.includes(req.params.flowid)).forEach(filename => {
        let flowDetails = JSON.parse(fs.readFileSync(filename))
        let origFlowId = req.params.flowid

        let tabNode = flowDetails.filter( d => d.type == "tab")[0]
        let nonTabNodes = flowDetails.filter(d => d.type != "tab")
        let injNodesIds = flowDetails.filter(d => d.type == "inject").map(d => d.id)

        // add an catch all and trigger a assert false if any exceptions are
        // raised by the test - if there isn't already a catch all node.
        if (nonTabNodes.filter(d => d.type == "catch").filter(d => d.scope == null).length == 0) {
          var redUtil = require("@node-red/util").util;
          let assertId = redUtil.generateId()

          let extraCatchAll = [
            {
              "id": redUtil.generateId(),
              "type": "catch",
              "name": "",
              "scope": null,
              "uncaught": true, // ignore exceptions caught by other catch nodes
              "wires": [
                [
                  assertId
                ]
              ]
            },
            {
              "id": assertId,
              "type": "ut-assert-failure",
              "name": "",
              "wires": []
            }
          ]

          nonTabNodes = nonTabNodes.concat(extraCatchAll)
        }

        let details = {
          ...tabNode,
          nodes: nonTabNodes,
        }

        // if flow already exists, then just trigger the inject nodes
        if (runtime._.flows.getFlow(origFlowId)) {
          setTimeout(() => {
            injNodesIds.forEach(ndeId => {
              RED.nodes.getNode(ndeId)?.receive({ "_original_flow_id": origFlowId })
            })
          }, 500)

          setTimeout(() => {
            // tell the frontend that we've done with the test. If no 
            // status has been posted for the unit test, then it succeeds.                
            RED.comms.publish("unittesting:testresults", {
              flowid: origFlowId,
              status: "stopped"
            })
          }, 5000)
        } else {
          runtime._.flows.addFlow(details, "root").then(newFlowId => {
            runtime._.flows.startFlows("full", null, false, true).then( d => {
              setTimeout(() => {
                injNodesIds.forEach(ndeId => {
                  RED.nodes.getNode(ndeId)?.receive({"_original_flow_id": origFlowId})
                })
              }, 500)

              setTimeout( () => {
                runtime._.flows.removeFlow(newFlowId, "root").then(result => {
                  // tell the frontend that we've done with the test. If no 
                  // status has been posted for the unit test, then it succeeds.                
                  RED.comms.publish("unittesting:testresults", {
                    flowid: origFlowId,
                    status: "stopped" 
                  })
                })
              }, 5000)
            })
          })
        }
      })
    }
  });

RED.httpAdmin.get("/UnitTesting/halt",
  (req, res) => {
    var runtime = require("@node-red/runtime");
    runtime._.flows.stopFlows()
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
