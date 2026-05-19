## Unit testing nodes for Erlang-Red and Node-RED

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

## Specification of core functionality for Node-RED. 

A collection of nodes also contains a set of flows that represent unit tests that test core functionality of core nodes. 

The intention is to have a set of visual flows that test specific functionality of the Node-RED core nodes. In this package form, tests can be installed in future versions of Node-RED to ensure that functionality is maintained. 

**Why do this?**

Because it provides a method for anyone to create flows to test functionality. As opposed to unit tests and integration tests defined in the project as NodeJS code, this approach, a visual approach allows anyone who has an interest to create mini unit-tests to ensure that the functionality that they expect is maintained in Node-RED.

What is provided is a collection of 200 tests that can be executed via a sidebar plugin. Tests are executed in the background on the server. Existing flows may be affected, so it is best to do this **without** any existing flows defined.

It is intended to be done once, maybe for an initial release of Node-RED. There is no real reason to do this continually. It does provide a way of doing unit tests as well. So the idea is also to provide a mechanism—a visual mechanism—for defining unit tests for other projects as well. Future releases of this package will allow independent collections of unit tests for your own projects.

The aim would be to have a project directory, and within that project directory, there are a set of flows that test specifics of that project. Those tests would then be shown in the plugin on the sidebar, and those tests would then be executed for changes to the project, to the flows, the existing flows. So that's the goal in the long term: to provide a visual unit testing framework for projects. 

So far this is only a demonstration of how to do this for the Node-RED project itself.

## How do the provided unit tests work? 

Each unit test defines one or more inject nodes that are triggered when the test starts. Once the test is started, the assert nodes are triggered and test specific conditions. If any assert node fails, the entire test fails.

Assert nodes can either test that a message arrives or that a message doesn't arrive. The assert false asserts that if a message arrives, it will fail. The assert success node ensures that one or more messages arrive, a limit of messages arrive, or a maximum number of messages arrive. If the assert success node is configured with zero message count, then 1 or more messages are expected.

The assert values node is used to test specific values on the message object and ensure that those are correct. Assert values node fails if values aren't correct or if a message is not received. The assert values node expects at least a single message, multiple messages are tested against the same conditions.

Failures of all assert nodes are shown in the Node-RED console log.

## Configuration via flow environment values

Tests can also be given specific properties via the flow-tab environment variables. Features such as pending tests can be indicated, so that if a test haven’t been completed yet or will fail, tests can be set to pending. 

A test can be given a timeout period, to specify when tests time out. The timeout defaults to 5 seconds, so after a test starts, it has 5 seconds to complete. If it requires longer, then a timeout value of higher than 5 can be given. The timeout values are in seconds, and are provided in the environment values of the flow tab.

## Sidebar Plugin Functionality

The sidebar functionality provides testing features for testing all tests, a subset of tests and a single test. Also tests can be loaded into the editor using a double click on the test name.

Modifications of tests are not stored nor can tests be modified inside the package. Defining your own tests will require creating your own flow files.

## What is correct functionality? 

What do I define as core node functionality? What I mean by that is that things like status and debug messages are also core functionality. So if a node generates a status message, then I want to test that it generates that status message. And if it generates a debug message, then I want to test that it generates that debug message.

That's why the assert status and assert debug nodes in this package - that is what they are testing for. I consider this part of the core functionality, of a core node because folks could rely on that. 

Especially the debug count: when you see how many messages are going through, that could be a very important dependency that might be used for ensuring that flows work correctly, depending on the setup. So, that's why for me, also checking that nodes generate the expected debug message and the expected status messages or status indications is also part of core functionality of core nodes.

## True Negatives and False Positives 

Obviously, the testing is not 100 percent; nothing’s perfect in this world. I have tried my best to get it as accurate as possible, but sometimes because of timing issues with the tests, I do make assumptions about certain things happening in a certain order or taking a certain amount of time. Sometimes these conditions don't hold, and so the test do fail.

I have endeavoured to indicate that on those tests that are potentially not so consistent. However, I haven't obviously covered everything, as it is just a first attempt. There are cases where there are sometimes tests failing, and I have endeavoured to mark those, comment on those, and ensure that you know, to the best of my abilities, I've tried to make these tests as stable and correct as possible.

That includes making certain assumptions about functionality that might not actually be correct, as there is no written-down standardised functionality for Node-RED. Sometimes I might even be testing functionality that isn't actually meant to be correct.

However, that is the intention of this package: it is also to define those things and make that clearer—what is functionality and what isn't. That is, I think, part of this project: to define that a little bit more clearly.

## Incomplete implementation

The assert values node isn't completely implemented; certain values aren't supported. The assert debug and the assert status nodes don't work either; they aren't supported yet.

What this package doesn't provide, unfortunately, are the two assert nodes related to status and debug. So these nodes are designed to capture any debug messages sent by a node or any status generated by the node. 

So this is partly, obviously, for the status. One can use the status node itself, but it's difficult to test the status node if you're using the status node. So that's why there's an assert status node and the assert debug cannot be replaced by anything else because there's no way in Node-RED to capture the debug output generated by a node. 

The unfortunate thing is then it's hard to test the output generated by nodes. That meaning debug messages or status messages to ensure that there's actually something generated. This is also part of the functionality of Node-RED. So I see that if a node generates a status message, then that should be tested for. If a node generates a debug message, then that should be tested for. So that's what these debug nodes, assert debug and assert status are meant to be doing. 

But they are unfortunately not implementable for Node-RED because there's no way of adding hooks to these messages. Or at least none that I found.

## Discussion: why is this important enough for me?

Why do I see this standardisation as important? Obviously, I've invested quite a bit of time into making these tests and creating this package. Why do I think that's so important? There are a couple of reasons.

One is that I see this as a way of ensuring that there's a benchmark for Node-RED functionality. So you say, okay, the complete node does just this, completes, and the change node can do this, this, and this, and it can only do that. That's then well-defined as a test or a series of tests to say, "Okay, this is what it has to be doing”. With that, it is clear: okay, this is within the bounds of the change node, and this is not within the bounds of the change nodes. Then a discussion can be started to say whether the bounds of the change node should be extended, or whether a new node should be defined for some specific functionality. So that's one thing I think is important: to define clearly what core nodes do and, equally important, what they will not do - the boundary of their functionality.

In a [long discussion](https://discourse.nodered.org/t/brittle-flows-or-is-it-the-visual-paradigm/100911/30) with Nick, it became clear that there is no such standardisation or definition for the functionality of nodes. It's kind of like whatever feels good and feels right, a "will do" type of decision-making, which is fine, and I'm not criticising that. My second point is to say, okay, well, for industry applications and for industries which are based on standards, it could be important to say, okay, well, if we're going to use Node-RED, then we want to know that version X of Node-RED will be doing the same thing as version Y down the road. And this kind of node package, this unit testing of the functionality, can be a guarantee of that consistency into the future. 

Thirdly, it could also show when there's a divergence of functionality. And this makes upgrading versions of Node-RED for an industry application safer. That's another thing that I see could be useful for this package.

The final point that I see is also the origins of this entire project: compatibility testing. So, having created Erlang-RED, which is the Erlang-backed Node-RED (the Node-RED frontend editor with an Erlang backend), I was kind of interested in how do I define the functionality of the nodes. How do I know that my nodes are working correctly according to what Node-RED is doing? Because I want to do want to have 100% compatibility with Node-RED flows. Why do I want that? It's because I want to be able to take in a visual abstraction, a Node-RED flow, and have it run as Erlang code, or as NodeJS code, or Python code, or whatever code. So that the visualisation, the visual flow representation, becomes an abstraction between different programming languages.

Therefore, to be able to do that, to be able to port flows one-to-one to Erlang-RED, I need to be able to ensure that the Erlang-RED nodes are doing what the Node-RED nodes are doing. And so that's why I started creating these unit tests, which run both in Erlang-RED and in Node-RED. So this Node package I actually use for Erlang-RED as well, with a slightly modified set of tests than the ones defined here.

## Forum Discussions

- [Standardisation of core functionality - May 2026](https://discourse.nodered.org/t/brittle-flows-or-is-it-the-visual-paradigm/100911)
- [Flow testsuite for testing core node functionality - May 2025](https://discourse.nodered.org/t/flow-testsuite-for-testing-core-node-functionality/97106)

## Tee Time

<a href="https://www.buymeacoffee.com/gorenje" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Tee" style="height: 42px !important;width: 152px !important;" ></a>

## Artifacts

- [NPMjs Package](https://www.npmjs.com/package/@gregoriusrippenstein/erlang-red-unittest)
- [Node-RED node package](https://flows.nodered.org/node/@gregoriusrippenstein/erlang-red-unittest)
- [GitHub Repo](https://github.com/gorenje/erlang-red-unittesting-nodes)
- Node-RED flow that maintains this [codebase](https://flowhub.org/f/ef91cb280e1bfd72).
