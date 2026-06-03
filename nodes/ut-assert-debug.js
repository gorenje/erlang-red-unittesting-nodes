module.exports = function(RED) {
  function Coreut_assert_debugFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;
    
    var testFailed = (msgstr) => {
      node.status({ fill: "red", shape: "ring", text: RED._("ut-assert-debug.status.failed") });
      RED.comms.publish("unittesting:testresults", { flowid: node.z, status: "failed" })
      // sending a message to the debug panel will faile because the node isn't part 
      // of the workspace, hence use `log` instead of `error`.
      node.log(`FAILED [${node.z}] Assert Debug '${msgstr}'`)
    }

    var testSucceed = () => {
      node.status({ fill: "green", shape: "dot", text: RED._("ut-assert-debug.status.succeed") })
      setTimeout(() => { node.status({}); }, 1000)      
    }

    var handler = (msg) => {
      // msg has to be debug and also originating from the node we've been configured to check
      if (msg.topic != "debug" || cfg.scope.indexOf(msg.data.id) < 0) { return }

      node.context().set("receivedmsg", true)

      // set status according to .... settings
      if (cfg.inverse) {
        testFailed("recevied debug message where none was expected")
      } else {
        if ( (cfg.msgtype == "warning" && msg.data.level == 30) 
          || (cfg.msgtype == "error" && msg.data.level == 20)
          || (cfg.msgtype == "normal" && !msg.data.level) ) {
          testSucceed()
        } else {
          testFailed(`debug message type did not match ${cfg.msgtype} != ${msg.data.level}`)
        }
      }

      node.send(msg)
    }

    node.context().set("receivedmsg", false)
    require("@node-red/util").events.on('comms', handler)

    node.on('close', function (removed, done) {
      if (removed) {
        // This node has been disabled/deleted
        let receivedmsg = (node.context().get("receivedmsg") ?? false)
        if (!receivedmsg) {
          if (!cfg.inverse) {
            testFailed("expected debug message but none received")
          } else {
            testSucceed()
          }
        }
      } else {
        // This node is being restarted
        node.status({})
        node.context().set("receivedmsg", false)
      }
      
      require("@node-red/util").events.off("comms", handler)
      done();
    });
  }

  RED.nodes.registerType("ut-assert-debug", Coreut_assert_debugFunctionality);

  // Backend endpoints
RED.httpAdmin.get("/UnitTesting/:flowid/runtest",
  (req, res) => {
    const path = require('path');
    const fs = require('fs')
    const jsonClone = require("rfdc")();
    
    // API defined here --> https://github.com/node-red/node-red/blob/master/packages/node_modules/%40node-red/runtime/lib/index.js
    const runtime = require("@node-red/runtime");

    let testDir = path.resolve(path.dirname(__filename), "..", "examples")

    // if a test generates an uncaught exception, then captcha that and generate
// a failure - tests are considered failed if they generate uncaught exceptions/errors.
let createExtraCatchNode = () => {
  let changeId = runtime.util.generateId()
  let assertId = runtime.util.generateId()
  let debugId = runtime.util.generateId()

  return [
    {
      "id": runtime.util.generateId(),
      "type": "catch",
      "name": "",
      "scope": null,
      "uncaught": true,
      "wires": [
        [
          changeId
        ]
      ]
    },
    {
      "id": changeId,
      "type": "change",
      "name": "",
      "rules": [
        {
          "t": "set",
          "p": "_unittest_triggered",
          "pt": "msg",
          "to": "true",
          "tot": "bool"
        }
      ],
      "action": "",
      "property": "",
      "from": "",
      "to": "",
      "reg": false,
      "wires": [
        [
          assertId,
          debugId
        ]
      ]
    },
    {
      "id": debugId,
      "type": "debug",
      "name": "",
      "active": true,
      "tosidebar": false,
      "console": true,
      "tostatus": false,
      "complete": "payload",
      "targetType": "msg",
      "statusVal": "",
      "statusType": "auto",
      "wires": []
    },
    {
      "id": assertId,
      "type": "ut-assert-failure",
      "name": "",
      "wires": []
    }
  ]
}

let isTestPending = (tabDetails) => {
  return tabDetails.env.filter(d => d.name == "NRED_PENDING")[0]?.value == "true"
}

// chunkify an array into chunks of `size` size
let chunkify = (array, size) => {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}

// respond to request with a list of total tests to be done. The frontend then
// shows a progress indication of success / pending / failure
let respondWithCount = (res, count) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: "ok", todo: count }));
}


    if (req.params.flowid == "all") {
      //
      // Run all tests. This is a little more complicated as this runs all tests in batches
      // of ten tests at a time but these have to be added in serial and also removed in 
      // serial, so there has to be promise handling ... and that makes this stuff a little
      // more complicated.
      //

      let allTests = fs.globSync(`${testDir}/**/*.json`)

      // if a limit (i.e. a list of testFlow ids) is provided, only peform those tests.
      if (req.query.limit) {
        let testIds = req.query.limit.split(",")

        allTests = allTests.filter( filename => {
          let origFlowId = path.basename(path.parse(filename).dir)
          return testIds.indexOf(origFlowId) > -1
        })
      }

      let chunkedFilenames = chunkify(allTests, 10)

      respondWithCount(res, allTests.length)

      let runTestsForFileNames = (fileIdx) => {
        if (fileIdx >= chunkedFilenames.length) { return }

        // test all is a multi step process, first we have to add all flows to the main show
        // then we have to trigger them and finally we have to remove those that weren't
        // there in the first place.
        let flowIdsToBeRemoved = []
        let injNodesToBeTriggered = {}

        let timeoutValues = []

        let flowsToAdd = chunkedFilenames[fileIdx].map((filename) => {
          
          let origFlowId = path.basename(path.parse(filename).dir)

          let flowDetails = JSON.parse(fs.readFileSync(filename))
          let tabDetails = flowDetails.filter(d => d.type == "tab")[0]
          let injNodesIds = flowDetails.filter(d => d.type == "inject").map(d => d.id)
          
          RED.log.debug(`unittest: adding test case [${origFlowId}] - '${tabDetails.label}'`)

          if (isTestPending(tabDetails) && req.query["testpend"] != "true") {
            RED.comms.publish("unittesting:testresults", {
              flowid: origFlowId,
              status: "pending"
            })
            return null
          }

          // compute any timeout that is defined for the flow test
          tabDetails.env.filter(d => d.name == "NRED_TIMEOUT").forEach( d => {
            timeoutValues.push(parseInt(d.value) * 1000)
          })

          // add an catch all and trigger a assert false if any exceptions are
          // raised by the test - if there isn't already a catch all node.
          if (flowDetails.filter(d => d.type == "catch").filter(d => d.scope == null).length == 0) {
            flowDetails = flowDetails.concat(createExtraCatchNode())
          }

          if (runtime._.flows.getFlow(origFlowId)) {
            injNodesToBeTriggered[origFlowId] = injNodesIds.map(d => d)
            return null
          } else {
            return {
              injNodesIds: injNodesIds, origFlowId: origFlowId, nodes: flowDetails
            }
          }
        }).filter(d => !!d)

        // addFlow is a promise but I want to add flows in series not parallel, so the
        // promise returns a promise that adds the next flow after the initial flow
        // has been added. It's promises all the way down - until the turtles start.
        let addFlow = (idx) => {
          if (idx >= flowsToAdd.length) { return }
          var { injNodesIds, origFlowId, nodes } = flowsToAdd[idx]

          var newConfig = jsonClone(runtime._.flows.getFlows().flows);
          newConfig = newConfig.concat(nodes);

          return runtime._.flows.setFlows(newConfig, null, 'flows', false, null, "root")
            .then(() => {
              let newFlowId = origFlowId
              injNodesToBeTriggered[newFlowId] = injNodesIds.map(d => d)
              flowIdsToBeRemoved.push(newFlowId)
            })
            .catch(e => { RED.log.error(e); RED.log.error(`Exception happened with ${origFlowId}`) })
            .finally(() => addFlow(idx + 1))
        }

        Promise.all([addFlow(0)]).then(() => {
          RED.log.debug("unittest: done adding all flows")

          runtime._.flows.startFlows("full", null, false, true).then(d => {
            Object.keys(injNodesToBeTriggered).forEach(flowId => {
              injNodesToBeTriggered[flowId].forEach(ndeId => {
                RED.log.debug(`unittest: triggering inject node: ${ndeId}`)
                RED.nodes.getNode(ndeId)?.receive({"_unittest_triggered": true})
              })
            })

            let removeFlow = (idx) => {
              if (idx >= flowIdsToBeRemoved.length) { return }
              let flowid = flowIdsToBeRemoved[idx]

              return runtime._.flows.removeFlow(flowid, "root")
                .then((_ignore) => {
                  RED.comms.publish("unittesting:testresults", {
                    flowid: flowid,
                    status: "stopped"
                  })
                })
                .catch(e => {
                  RED.log.error(e);
                  RED.log.error(`Error happened removing flow ${flowid}`)
                  RED.comms.publish("unittesting:testresults", {
                    flowid: flowid,
                    status: "stopped"
                  })
                })
                .finally(() => removeFlow(idx + 1))
            }

            setTimeout(() => {
              Promise.all([removeFlow(0)]).then(() => {
                RED.log.debug("unittest: removed all flows")
                runTestsForFileNames(fileIdx+1)
              })
            }, Math.max(...(timeoutValues.concat([5000]))))
          })
        })
      }
      runTestsForFileNames(0)
    } else {

      //
      // run a single unit test but ensure that the test case does exist on disk
      //

      respondWithCount(res, 1)

      fs.globSync(`${testDir}/**/*.json`).filter(d => d.includes(req.params.flowid)).forEach(filename => {
        let flowDetails = JSON.parse(fs.readFileSync(filename))
        let origFlowId = req.params.flowid

        let tabDetails = flowDetails.filter(d => d.type == "tab")[0]
        let injNodesIds = flowDetails.filter(d => d.type == "inject").map(d => d.id)

        let timeoutValues = []

        if (isTestPending(tabDetails) && req.query["testpend"] != "true") {
          RED.comms.publish("unittesting:testresults", {
            flowid: origFlowId,
            status: "pending"
          })
          return null
        }

        // compute any timeout that is defined for the flow test
        tabDetails.env.filter(d => d.name == "NRED_TIMEOUT").forEach(d => {
          timeoutValues.push(parseInt(d.value) * 1000)
        })
        
        // add an catch all and trigger a assert false if any exceptions are
        // raised by the test - if there isn't already a catch all node.
        if (flowDetails.filter(d => d.type == "catch").filter(d => d.scope == null).length == 0) {
          flowDetails = flowDetails.concat(createExtraCatchNode())
        }

        // if flow already exists, then just trigger the inject nodes
        if (runtime._.flows.getFlow(origFlowId)) {
          setTimeout(() => {
            injNodesIds.forEach(ndeId => {
              RED.nodes.getNode(ndeId)?.receive({"_unittest_triggered": true})
            })
          }, 500)

          setTimeout(() => {
            // tell the frontend that we've done with the test. If no 
            // status has been posted for the unit test, then it succeeds.                
            RED.comms.publish("unittesting:testresults", {
              flowid: origFlowId,
              status: "stopped"
            })
          }, Math.max(...(timeoutValues.concat([5000]))))
        } else {
          var newConfig = jsonClone(runtime._.flows.getFlows().flows);
          newConfig = newConfig.concat(flowDetails);

          runtime._.flows.setFlows(newConfig, null, 'flows', false, null, "root").then(() => {
            runtime._.flows.startFlows("full", null, false, true).then(d => {
              setTimeout(() => {
                injNodesIds.forEach(ndeId => {
                  RED.nodes.getNode(ndeId)?.receive({"_unittest_triggered": true})
                })
              }, 500)

              setTimeout(() => {
                runtime._.flows.removeFlow(origFlowId, "root").then(result => {
                  // tell the frontend that we've done with the test. If no 
                  // status has been posted for the unit test, then it succeeds.                
                  RED.comms.publish("unittesting:testresults", {
                    flowid: origFlowId,
                    status: "stopped"
                  })
                })
              }, Math.max(...(timeoutValues.concat([5000]))))
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

    let fileName = path.resolve(path.dirname(__filename), "..", "examples", req.params.flowid, "flows.json")
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

    let testDir = path.resolve(path.dirname(__filename), "..", "examples")

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
