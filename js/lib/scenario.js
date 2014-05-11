(function (window) {
	var document = window.document,
	console = window.console;

	function Scenario(definition) {
		var scenario,
			key,
			obj,
			get, set,
			output;

		function makeAliasGetter(node, name) {
			return function () {
				//todo: what if it points to a scenario?
				return node[name];
			};
		}

		function makeAliasSetter(node, name) {
			return function (val) {
				if (val instanceof Scenario) {
					val = Scenario.output();
				}
				node[name] = val;
			};
		}

		scenario = definition.call(this);
		this.render = scenario.render || function () {};
		this.start = scenario.start || function () {};
		this.stop = scenario.stop || function () {};

		if (typeof scenario.output === 'function') {
			output = scenario.output;
		} else {
			output = function () {
				return scenario.output;
			}
		}

		Object.defineProperty(this, 'output', {
			configurable: true,
			enumerable: true,
			get: output
		});

		for (key in scenario.aliases) {
			//todo: blacklist certain key names
			if (scenario.aliases.hasOwnProperty(key) && scenario.aliases[key]) {
				obj = scenario.aliases[key];
				if (typeof obj === 'function') {
					get = obj;
					set = obj;

				// todo: only duck typing for now, but need a way to check that it's a node
				} else if (obj instanceof Scenario || obj.on && obj.off && obj.isReady && obj[key] !== undefined) {
					get = makeAliasGetter(obj, key);
					set = makeAliasSetter(obj, key);
				} else {
					//todo: error checking on valid object here
					get = makeAliasGetter(obj.node, obj.input);
					set = makeAliasSetter(obj.node, obj.input);
				}

				Object.defineProperty(this, key, {
					configurable: true,
					enumerable: true,
					get: get,
					set: set
				});
			}
		}
	}

	Scenario.factory = function (factory) {
		return function () {
			var args = arguments,
				definition = function () {
					return factory.apply(this, args);
				};
			Scenario.call(this, definition);
		};
	};

	/*
	Every scenario needs:
	- render method
	- aliases - point directly to a node input or to a function
	- output node (can either be a function or just return a specific node)
	- exported nodes
	- import a blob describing the scenario?

	May add to scenarios if/when integrated with Seriously
	- "go" method, just like Seriously and Target, with callbacks
	- start and stop, which turn
	- this = seriously instance
	- way to destroy
	- initialize all aliases immediately? or allow defaults
	- keep track of all locally created nodes so we can clean them up
	- isReady method
	- factory works as plugin architecture
	- make a simple Scenario plugin that takes a list of already connected nodes and automatically finds the output and
	*/

	/*
	var Layers = Scenario.factory(function (seriously, numLayers) {
		var layers,
			aliases = {},
			i;

		numLayers = numLayers || 4

		layers = seriously.effect('layers', {
			count: numLayers
		});

		for (i = 0; i < numLayers; i++) {
			aliases['source' + i]  = layers;
			aliases['opacity' + i]  = layers;
		}

		return {
			output: layers,
			aliases: aliases
		};
	});

	//var seriously = new Seriously();
	//var layers = new Layers(seriously, 7);
	*/

	window.Scenario = Scenario;
}(window));