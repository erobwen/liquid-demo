(function(root) {
	let liquid = require('liquid')();
	let trace = liquid.trace;
	let log = liquid.log;
	let logGroup = liquid.logGroup;
	let logUngroup = liquid.logUngroup;
	liquid.trace.demo = 1; 
	trace.demo && log("demo.js");
	
	// Create one single liquid instance
	liquid.addClasses(require("todoList"));  // TODO: Can we make it possible to load everything under a specific library?
	liquid.assignClassNamesTo(root); // Optional: Make all class names global
	
	// Raw data from server
	trace.demo && log("Initial serialized data: ");
	trace.demo && log(data);

	// Setup and unserialize data
	liquid.receiveInitialDataFromUpstream(data);
	trace.demo && log("upstreamIdObjectMap");
	trace.demo && log(liquid.upstreamIdObjectMap);
	
	
	/*--------------------
	*     Debugging
	* -------------------*/

	// Setup trace (after initial data is added)
	// liquid.trace.incoming = 1; 
	// liquid.trace.socket = 1; 
	// liquid.trace.render = 1; 
	// liquid.trace.event = 1;
	// liquid.trace.ui = 1; 
	// liquid.trace.pulse = 1; 
	// liquid.trace.liquid = 1; 
	// liquid.trace.unserialize = 1; 

	// Debugging 
	root.page = liquid.instancePage;

	root.user = page.session.user;
	
	window.test = function() {
		// Manual test code here
	}
	
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

	// Setup global variables for each local entity: TODO... for all in the server map only?
	// for (id in liquid.idObjectMap) {
		// var object = liquid.idObjectMap[id];
		// if (typeof(object.name) !== 'undefined') {
			// var name = object.name;
			// var variableName = nameToVariable(name);
			// root[variableName] = object;
		// }
	// }	

	/*--------------------
	*     Socket IO
	* -------------------*/

	(function () {
		var socket = io('http://localhost:8080');

		socket.on('connect', function(){
			trace.socket && logGroup("socket.on: connect");
			trace.socket && log(liquid.instancePage);
			socket.emit("connectPageWithSocket", liquid.instancePage.token);
			trace.socket && logUngroup();
		});
		
		socket.on('couldNotConnectPageWithSocket', function() {
			trace.socket && logGroup("socket.on: couldNotConnectPageWithSocket");
			throw new Error("Could not connect propertly with server.");
			trace.socket && logUngroup();
		});

		socket.on('message', function(message) {
			trace.socket && logGroup("socket.on: message");
			trace.socket && log(message, 10);
			liquid.messageFromUpstream(message);
			trace.socket && logUngroup();
		});

		liquid.setPushMessageUpstreamCallback(function(message) {
			trace.socket && logGroup("socket.emit: message");
			trace.socket && log(message, 10);
			socket.emit('message', liquid.instancePage.token, message);	
			trace.socket && logUngroup();
		});		

		socket.on('disconnect', function(){
			trace.socket && log("socket.on: disconnect");
			throw new Error("Unexpected dissconnect.");
		});		
	})();
	
	/*-----------------------------
	*     Setup global variables
	* -----------------------------*/

	// root.find = liquid.find;
	root.liquid = liquid;
	root.uponChangeDo = liquid.uponChangeDo;
	root.repeatOnChange = liquid.repeatOnChange;
	root.repeat = liquid.repeatOnChange;
	root.create = liquid.create;
	root.page = liquid.instancePage;
	root.pageService = liquid.instancePage.pageService;
	
	
}(this));