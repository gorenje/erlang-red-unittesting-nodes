module.exports = function(RED) {
  function CoreutassertvaluesFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;
 
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
      RED.comms.publish("debug", msg);
     } catch (ex) {
      console.error(ex)
     }
     return ["failure", rule];
    }

    var postUnsupported = (rule, msg) => {
      node.status({ fill: "red", shape: "dot", 
                      text: RED._("ut-assert-values.label.unsupported", { property: JSON.stringify(rule) }) });
      sendToDebug(node, rule, msg, 30)
      
      return ["unsupported", rule]
    }

    var escapeSpecials = (str) => {
      return str ? str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replaceAll(/\t/g, "\\t") : str
    }

    node.on('close', function() {
      node.context().set("succeed", false)
      node.status({});
    });

    /* msg handler, in this case pass the message on unchanged */
    node.on("input", function(msg, send, done) {
        var failures = [];
        var unsupported = [];

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
              if ( parseInt(rule.to) != parseInt(RED.util.getObjectProperty(msg,rule.p)) ) {
                failures.push(sendToDebug(node, rule, msg, 20))                
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
            } else if (rule.tot == "json") {
              let expObj = JSON.parse(rule.to)
              let oldObj = RED.util.getObjectProperty(msg, rule.p)
              if ( JSON.stringify(oldObj, Object.keys(oldObj).sort()) != JSON.stringify(expObj, Object.keys(expObj).sort()) ) {
                failures.push(sendToDebug(node, rule, msg, 20))                
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
           * Rule is not equal
           */
          } else if (rule.t == "noteql" && rule.pt == "msg" && rule.tot == "msg") {
            /* comparing two values on the message object */
            let expObj = RED.util.getObjectProperty(msg, rule.to)
            let oldObj = RED.util.getObjectProperty(msg, rule.p)
            if (expObj == oldObj) {
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
              msg.assert_succeed = true
              delete msg.assert_failures
            }
          }
        }
        send(msg);
        done();
    });
  }

  RED.nodes.registerType("ut-assert-values", CoreutassertvaluesFunctionality);
}
