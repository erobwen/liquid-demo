(function(root) {
	let objectlog = require("../objectlog.js");
	let log = objectlog.log;
	let logGroup = objectlog.enter;
	let logUngroup = objectlog.exit;
	
	log("demo.js");
	// Create one single liquid instance

	liquid.addClasses(require("model"));  // TODO: Can we make it possible to load everything under a specific library?
	liquid.assignClassNamesTo(root); // Optional: Make all class names global
	
	// Setup data
	liquid.receiveInitialDataFromUpstream(data);
	log("upstreamIdObjectMap");
	log(liquid.upstreamIdObjectMap);
	
	// Setup global variables. 
	
	function lowerCaseFirstLetter(string){
		return string.substr(0, 1).toLowerCase() + string.slice(1);
	}

	function nameToVariable(string) {
		return lowerCaseFirstLetter(string.replace(/\s/g, ''));
	}

	for (id in liquid.upstreamIdObjectMap) {
		let object = liquid.upstreamIdObjectMap[id];
		if (object instanceof LiquidEntity && !(object instanceof LiquidIndex)) {
			if (typeof(object.name) !== 'undefined' && typeof(root[object.name]) === 'undefined') {
				root[nameToVariable(object.name)] = object; 
			}
		}
	}
	
	root.page = liquid.instancePage;
		
	// Setup socket io.
	(function () {
		var socket = io('http://localhost:8080');

		socket.on('connect', function(){
			log("socket.on: connect");
			log(liquid.instancePage);
			socket.emit("connectPageWithSocket", liquid.instancePage.token);
		});
		
		socket.on('couldNotConnectPageWithSocket', function() {
			log("socket.on: couldNotConnectPageWithSocket");
			throw new Error("Could not connect propertly with server.");
		});

		socket.on('message', function(message) {
			log("socket.on: message");
			liquid.messageFromUpstream(message);
		});

		liquid.setPushMessageUpstreamCallback(function(message) {
			log("socket.emit: message");
			socket.emit('message', liquid.instancePage.token, message);	
		});		

		socket.on('disconnect', function(){
			log("socket.on: disconnect");
			throw new Error("Unexpected dissconnect.");
		});		
	})();


		// socket.on('pushChangesFromUpstream', function(changes){
			// liquid.receiveChangesFromUpstream(changes);
		// });
	
	// Setup global variables
	// root.find = liquid.find;
	root.liquid = liquid;
	root.uponChangeDo = liquid.uponChangeDo;
	root.repeatOnChange = liquid.repeatOnChange;
	root.repeat = liquid.repeatOnChange;
	root.create = liquid.create;
	root.page = liquid.instancePage;
	root.pageService = liquid.instancePage.pageService;
	
	// Setup global variables for each local entity: TODO... for all in the server map only?
	for (id in liquid.idObjectMap) {
		var object = liquid.idObjectMap[id];
		if (typeof(object.name) !== 'undefined') {
			var name = object.name;
			var variableName = nameToVariable(name);
			root[variableName] = object;
		}
	}
	
}(this));