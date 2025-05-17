module.exports = function(RED) {
  function CoreutassertvaluesFunctionality(config) {
    RED.nodes.createNode(this,config);

    var node = this;
    var cfg = config;


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
     return false;
    }

    var postUnsupported = (rule, msg) => {
      node.status({ fill: "red", shape: "dot", 
                      text: RED._("ut-assert-values.label.unsupported", { property: JSON.stringify(rule) }) });
      sendToDebug(node, rule, msg, 30)
      return rule
    }

    var escapeSpecials = (str) => {
      return str ? str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replaceAll(/\t/g, "\\t") : str
    }

    node.on('close', function() {
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
           * Other rule types are not supported
           */
          } else {
             unsupported.push(postUnsupported(rule,msg))
          }
        
          console.log(rule)
        })

        if (failures.length > 0 ) {
          node.status({fill: "red", shape: "dot", text: "assert failed"})
        } else {
          if ( unsupported.length > 0) {
            node.status({ fill: "yellow", shape: "ring", text: "unsupported errors - check debug" })
          } else {
            node.status({ fill: "green", shape: "ring", text: "assert succeed" })
          }
        }
        
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

  RED.nodes.registerType("ut-assert-values", CoreutassertvaluesFunctionality);

}
