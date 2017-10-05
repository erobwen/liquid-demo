(function(root) {
	// Create one single liquid instance

	liquid.addClasses(require("model"));  // TODO: Can we make it possible to load everything under a specific library?
	liquid.setClassNamesTo(root); // Optional: Make all class names global
	
	// Setup data
	liquid.receiveInitialDataFromUpstream(data);
		
	// Setup socket io.
	(function () {
		var socket = io('http://localhost:8080');

		socket.on('connect', function(){
			// trace('serialize', "received CONNECT");
			// trace('serialize', liquid.instancePage, " Page token:", liquid.instancePage.token);
			socket.emit("registerPageId", liquid.instancePage.token);
		});

		socket.on('disconnect', function(){
			// trace('serialize', "Disconnected");
		});

		socket.on('pushChangesFromUpstream', function(changes){
			liquid.receiveChangesFromUpstream(changes);
		});

		liquid.setPushMessageUpstreamCallback(function(messageType, pageToken, data) {
			socket.emit(messageType, pageToken, data);	
		});		
	})();

	
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