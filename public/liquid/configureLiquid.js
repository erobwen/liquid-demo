(function() {
	let liquid = require("liquid")({
		usePersistency: false, 
		isClient: true,
		causalityConfiguration : {
			useIncomingStructures : true,
			recordPulseEvents : true,
			reactiveStructuresAsCausalityObjects : false // Already default
		}
	});
	liquid.setConfigurationAsDefault();
	// console.log("configured liquid");
	// console.log(liquid);
	// console.log(liquid.classRegistry)
})();