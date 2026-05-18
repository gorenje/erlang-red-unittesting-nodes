module.exports = function(RED) {
  function CoreutassertvaluesFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;
 

    //
    // 
    // Helper Code
    //
    //


    /*
    * Note to self: getMessageProperty(..) and getObjectProperty(...) only differ in that
    * getMessageProperty will remove any 'msg.' prefix from the property name. This is not
    * the case here since we're using the Node-RED inbuilt helpers for setting values.
    * --> here: https://github.com/node-red/node-red/blob/0f653ed7b2640feba8885e48b9448df7d42acaf0/packages/node_modules/%40node-red/util/lib/util.js#L397-L402
    *
    *
    * from --> https://github.com/node-red/node-red/blob/0f653ed7b2640feba8885e48b9448df7d42acaf0/packages/node_modules/%40node-red/util/lib/util.js#L407-L418
    *
    *  getObjectProperty will return undefined if a property isn't set.
    */

    var sendToDebug = (nde,rule,msgc,lvl) => {
     try {
      let msg = {
        id:     nde.id,
        z:      nde.z,
        _alias: nde._alias,
        path:   nde._flow.path,
        name:   nde.name,
        topic:  msgc.topic,
        msg:    {msg: msgc, rule: rule},
        level:  lvl
      }

      msg = RED.util.encodeObject(msg);
      if (!cfg.ignore_failure_if_succeed) {
        // don't post debug, causes error in the editor because the flow does not 
        // exist in the workspace of the editor - flow is loaded in the backend only.
        if (!msg._unittest_triggered) {
          RED.comms.publish("debug", msg);
        } else {
          // send details to the console.
          node.log(`ASSERT FAILURE [${node.z}] assert values failed`)
          console.log(msg)
        }
      }
     } catch (ex) {
      console.error(ex)
     }
     return ["failure", rule];
    }

    var postUnsupported = (rule, msg) => {
      node.status({ fill: "red", shape: "dot", 
                      text: RED._("ut-assert-values.label.unsupported", { property: JSON.stringify(rule) }) });
      sendToDebug(node, rule, msg, 30)

      RED.comms.publish("unittesting:testresults", {
        flowid: node.z,
        status: "pending"
      })

      return ["unsupported", rule]
    }

    var escapeSpecials = (str) => {
      return (str && str.replace && (typeof str.replace == "function")) ? str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replaceAll(/\t/g, "\\t") : str
    }

    //
    //
    // Event Hander code
    //
    //

    /* initialise and close handler - if removed is false, then this is an initailise */
    node.on('close', function(removed, done) {
      if (removed) {
        if ((!node.context().get("succeed") && !cfg.ignore_failure_if_succeed) || !node.context().get("received_message")) {
          RED.comms.publish("unittesting:testresults", {
            flowid: node.z,
            status: "failed"
          })

          node.status({ fill: "red", shape: "dot", text: "assert failed" })
          
          // use node.log(..) here because node.error(..) sends a message to the debug
          // panel but that errors out because the frontend can't find the workspace:
          //    Uncaught TypeError: can't access property "label", RED.nodes.workspace(...) is undefined
          // that has follow-on effects.
          // see https://nodered.org/docs/creating-nodes/node-js#logging-events for more details
          if (!node.context().get("received_message")) {
            node.log(`FAILED [${node.z}] Assert Values node not reached`)
          } else {
            node.log(`FAILED [${node.z}] Assert values node failed`)
          }
        } 
      } else {
        node.status({});
        node.context().set("succeed", false)
        node.context().set("received_message", false)
      }

      done()
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
        var failures = [];
        var unsupported = [];
        node.context().set("received_message", true)

        try {
          cfg.rules.forEach(rule => {     
            /*
            * Rule is Equal
            */   
            if ( rule.t == "eql" && rule.pt == "msg") {
              if ( rule.tot == "str") {
                if ( rule.to != escapeSpecials(RED.util.getObjectProperty(msg,rule.p)) ) {
                  rule._vt = escapeSpecials(RED.util.getObjectProperty(msg, rule.p))
                  failures.push(sendToDebug(node, rule, msg, 20))
                }
              } else if ( rule.tot == "num") {
                if (rule.to == "NaN") {
                  if ( !isNaN(RED.util.getObjectProperty(msg, rule.p)) ) {
                    failures.push(sendToDebug(node, rule, msg, 20))
                  }
                } else {
                  if ( rule.to != RED.util.getObjectProperty(msg,rule.p) ) {
                    failures.push(sendToDebug(node, rule, msg, 20))                
                  }
                }
              } else if (rule.tot == "bin") {
                let expBuffer = Buffer.from(JSON.parse(rule.to));
                let valBuffer = RED.util.getObjectProperty(msg, rule.p);
                if ( Buffer.compare( expBuffer, valBuffer) != 0 ) {
                  failures.push(sendToDebug(node, rule, msg, 20))
                }
              } else if (rule.tot == "bool") {
                if ( rule.to == "true" && !RED.util.getObjectProperty(msg, rule.p)) {
                  failures.push(sendToDebug(node, rule, msg, 20))
                } else if (rule.to == "false" && !!RED.util.getObjectProperty(msg, rule.p) ) {
                  failures.push(sendToDebug(node, rule, msg, 20))
                }
              } else if (rule.tot == "jsonata") {
                try {
                  let jsonExpr = RED.util.prepareJSONataExpression(rule.to, node);
                  
                  RED.util.evaluateJSONataExpression(jsonExpr, msg, (err, value) => {
                    if (err) {
                      rule._err = err
                      failures.push(sendToDebug(node, rule, msg, 20))
                    } else {
                      if (value != escapeSpecials(RED.util.getObjectProperty(msg, rule.p))) {
                        rule._vt = escapeSpecials(RED.util.getObjectProperty(msg, rule.p))
                        failures.push(sendToDebug(node, rule, msg, 20))
                      }
                    }
                  });
                } catch (e) {
                  rule._err = e
                  failures.push(sendToDebug(node, rule, msg, 20))
                }                

              } else if (rule.tot == "json") {
                let expObj = JSON.parse(rule.to)
                let oldObj = RED.util.getObjectProperty(msg, rule.p)

                // special case: null or undefined
                if (!expObj) {
                  if (oldObj != null && oldObj != undefined) {
                    failures.push(sendToDebug(node, rule, msg, 20))
                  }
                } else {
                  if ( Array.isArray(expObj)) {
                    if (JSON.stringify(oldObj) != JSON.stringify(expObj)) {
                      failures.push(sendToDebug(node, rule, msg, 20))
                    }
                  } else {
                    if ( JSON.stringify(oldObj, Object.keys(oldObj).sort()) != JSON.stringify(expObj, Object.keys(expObj).sort()) ) {
                      failures.push(sendToDebug(node, rule, msg, 20))                
                    }
                  }
                }
              } else if (rule.tot == "msg") {
                if ( RED.util.getObjectProperty(msg,rule.to) != RED.util.getObjectProperty(msg,rule.p) ) {
                  failures.push(sendToDebug(node, rule, msg, 20))
                }
              } else {
                unsupported.push(postUnsupported(rule,msg))
              }
            /*
            * Rule is not set on message object
            */
            } else if (rule.t == "notset" && rule.pt == "msg") {     
              if (RED.util.getObjectProperty(msg, rule.p) !== undefined) {
                failures.push(sendToDebug(node, rule, msg, 20))
              }
            /*
            * Rule is not set on message object
            */
            } else if (rule.t == "set" && rule.pt == "msg") {
              if (RED.util.getObjectProperty(msg, rule.p) === undefined) {
                failures.push(sendToDebug(node, rule, msg, 20))
              }
            /*
            * Rule is match
            */
            } else if ( rule.t == "mth" && rule.pt == "msg") {
              if (rule.tot == "str") {
                let reExp = new RegExp(rule.to)
                if ( !reExp.test(RED.util.getObjectProperty(msg, rule.p)) ) {
                  failures.push(sendToDebug(node, rule, msg, 20))                
                }
              } else {
                unsupported.push(postUnsupported(rule,msg))
              }
            /*
            * Rule is not equal - both value are msg properties
            */
            } else if (rule.t == "noteql" && rule.pt == "msg" && rule.tot == "msg") {
              let expObj = RED.util.getObjectProperty(msg, rule.to)
              let oldObj = RED.util.getObjectProperty(msg, rule.p)
              if (expObj == oldObj) {
                failures.push(sendToDebug(node, rule, msg, 20))
              }
            /*
            * Rule is not equal - comparing message property to string value
            */
            } else if (rule.t == "noteql" && rule.pt == "msg" && rule.tot == "str") {
              let expValue = rule.to
              let msgValue = RED.util.getObjectProperty(msg, rule.p)
              if (expValue == escapeSpecials(msgValue)) {
                rule._vt = escapeSpecials(msgValue)
                failures.push(sendToDebug(node, rule, msg, 20))
              }

            /*
            * Rule is not equal - comparing message property to number value
            */
            } else if (rule.t == "noteql" && rule.pt == "msg" && rule.tot == "num") {
              let expValue = rule.to
              let msgValue = RED.util.getObjectProperty(msg, rule.p)
              if (expValue == msgValue) {
                rule._vt = msgValue
                failures.push(sendToDebug(node, rule, msg, 20))
              }

            /*
            * Other rule types are not supported
            */
            } else {
              unsupported.push(postUnsupported(rule,msg))
            }
          })

          if (node.context().get("succeed") && cfg.ignore_failure_if_succeed) {
            node.status({ fill: "green", shape: "ring", text: "assert succeed" })
            setTimeout(() => { node.status({}); }, 1000)
          } else {
            if (failures.length > 0 ) {
              node.status({fill: "red", shape: "dot", text: "assert failed"})
              msg.assert_succeed = false
              msg.assert_failures = failures.concat(unsupported)
            } else {
              if ( unsupported.length > 0) {
                node.status({ fill: "yellow", shape: "ring", text: "unsupported errors - check debug" })
                msg.assert_succeed = false
                msg.assert_failures = failures.concat( unsupported )
              } else {
                node.context().set("succeed",true)
                node.status({ fill: "green", shape: "ring", text: "assert succeed" })
                setTimeout(() => { node.status({}); }, 1000)
                
                msg.assert_succeed = true
                delete msg.assert_failures
              }
            }
          }
          send(msg);
          done();
        } catch ( e ) {
          node.status({ fill: "red", shape: "ring", text: "exception see log" })
          done()
          throw(e) // re-raise so that exception appears in the debug log
        }
    });
  }

  RED.nodes.registerType("ut-assert-values", CoreutassertvaluesFunctionality);
}
