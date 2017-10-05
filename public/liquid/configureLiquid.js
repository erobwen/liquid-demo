(function() {
	let liquid = require("liquid")({
		usePersistency: false, 
		causalityConfiguration : {}
	});
	liquid.setAsDefaultConfiguration();
})();