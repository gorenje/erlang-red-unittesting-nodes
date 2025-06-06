## Unit testing nodes for Erlang-RED

Node-RED Nodes for testing flow correctness in the [Erlang-RED](https://github.com/gorenje/erlang-red) project.

These could be thought of the first Erlang-RED-first nodes! They provided limited functionality within Node-RED as they deal with testing of node functionality and nodes are assumed to work in Node-RED.

## Assert Nodes

There are five assert nodes defined to:

- test whether a message contains the correct values (assert-values),
- whether a msg object arrived (assert-success),
- whether msg object was not received (assert-failure),
- whether a node generated a status message (assert-status), and
- whether a node generated a debug message (assert-debug)

Only the first three are partly implemented in Node-RED/NodeJS.

Their server-side implementations in Erlang-RED:

- [Assert Values](https://github.com/gorenje/erlang-red/blob/0be7a2f3a629c399ff2b5c6d763e3132f9f2ea9f/src/nodes/ered_node_assert_values.erl)
- [Assert Success](https://github.com/gorenje/erlang-red/blob/0be7a2f3a629c399ff2b5c6d763e3132f9f2ea9f/src/nodes/ered_node_assert_success.erl)
- [Assert Failure](https://github.com/gorenje/erlang-red/blob/0be7a2f3a629c399ff2b5c6d763e3132f9f2ea9f/src/nodes/ered_node_assert_failure.erl)
- [Assert Status](https://github.com/gorenje/erlang-red/blob/0be7a2f3a629c399ff2b5c6d763e3132f9f2ea9f/src/nodes/ered_node_assert_status.erl)
- [Assert Debug](https://github.com/gorenje/erlang-red/blob/0be7a2f3a629c399ff2b5c6d763e3132f9f2ea9f/src/nodes/ered_node_assert_debug.erl)

Admittedly the assert status node can be replaced by using a status node followed by an assert true node. These nodes provided the basis for the Erlang-RED project and therefore existed before any other nodes - hence the duplicity.

These nodes have been published because the [Erlang-RED flow testsuite](https://github.com/gorenje/erlang-red-flow-testsuite) utilises them.

## Artifacts

- [NPMjs Package](https://www.npmjs.com/package/@gregoriusrippenstein/erlang-red-unittest)
- [Node-RED node package](https://flows.nodered.org/node/@gregoriusrippenstein/erlang-red-unittest)
- [GitHub Repo](https://github.com/gorenje/erlang-red-unittesting-nodes)
- Node-RED flow that maintains this [codebase](https://flowhub.org/f/ef91cb280e1bfd72).


