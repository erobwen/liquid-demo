(function() {
	let liquid = require("liquid")({
		usePersistency: false, 
		isClient: true,
		causalityConfiguration : {}
	});
	liquid.setAsDefaultConfiguration();
	// console.log("configured liquid");
	// console.log(liquid);
	// console.log(liquid.classRegistry)
})();