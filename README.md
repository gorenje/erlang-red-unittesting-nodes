## Unit testing nodes for Erlang-RED

Node-RED Nodes for testing flow correctness in the [Erlang-Red](https://github.com/gorenje/erlang-red) project.

These nodes provide the basis for the *unofficial* [Visual Unit Testing Suite (VUTS)](https://github.com/gorenje/erlang-red-flow-testsuite) for Node-RED. The test-suite aims to create a collection of visual unit tests for regression testing of existing behaviour. However the test-suite also provides a proof of correctness for projects that emulate Node-RED behaviour, for example [Erlang-Red](https://github.com/gorenje/erlang-red).

Thus if others wish to implement a Node-RED engine in their favourite language, then implementing these nodes first and then loading this test-suite will provide a good roadmap for further development. For example.

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

## Actions

This package also defines the following actions that can be mapped to keyboard shortcuts:

- Test Current Workspace: triggers all inject buttons on the current workspace. Might well have undesired consequences if run on incorrect workspaces.
- Send Halt To Test Server: (Erlang-Red only) restarts the server
- Run All Tests: (Erlang-Red only) run all defined unit tests.

## Tee Time

<a href="https://www.buymeacoffee.com/gorenje" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Tee" style="height: 42px !important;width: 152px !important;" ></a>

## Artifacts

- [NPMjs Package](https://www.npmjs.com/package/@gregoriusrippenstein/erlang-red-unittest)
- [Node-RED node package](https://flows.nodered.org/node/@gregoriusrippenstein/erlang-red-unittest)
- [GitHub Repo](https://github.com/gorenje/erlang-red-unittesting-nodes)
- Node-RED flow that maintains this [codebase](https://flowhub.org/f/ef91cb280e1bfd72).
