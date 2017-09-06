// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
        root.LiquidEntity = factory(); // Support browser global
    }
}(this, function () {
	// let liquid = require("./liquid.js");  // Cannot do! see coment below.
	// This has to follow the injected dependency pattern to avoid circular package dependencies. This is since reallyDumbRequire cannot deal with circularity, dumb as it is...
	let liquid; 
	function injectLiquid(injectedLiquid) {
		liquid = injectedLiquid;
	}
	
	// object.getGlobalId = function() {
		// // TODO: find source of object.
		// // Only some persitent servers can create global ids.
		// // https://github.com/rauschma/strint
	// };
			
	var LiquidEntity = function() {
		if (liquid.configuration.onClient) {
			// Client only (reactive) properties:
			this.isPlaceholderObject = false;
			this.isLockedObject = false;
		}
	}

	LiquidEntity.prototype.initialize = function(data) {
		for(property in data) {
			this[property] = data[property];
		}
	}


	LiquidEntity.prototype.isLoaded = function() {
		// if (liquid.onClient) {
			// if (arguments.length == 1) {
				// var selector = arguments[0];
				// if (typeof(liquid.instancePage) !== 'undefined' && liquid.instancePage !== null) {
					// return (typeof(liquid.instancePage.getLoadedSelectionsFor(this)[selector]) !== undefined);
				// } else {
					// return true;
				// }
			// } else {
				// return !this.getIsPlaceholderObject();
			// }
		// } else {
			// return true;
		// }
	}

	LiquidEntity.prototype.accessLevel = function(page) {
		return "readAndWrite";
	}

	LiquidEntity.prototype.allowCallOnServer = function(page) {
		return false;
	}

	LiquidEntity.prototype.readable = function() {
		return liquid.allowRead(this);
	}

	LiquidEntity.prototype.writeable = function() {
		return liquid.allowWrite(this);
	}

	// should use instanceof instead.
	// LiquidEntity.prototype.is = function(data) {
		// return typeof(this.classNames[className]) !== 'undefined';
	// }

	// object._idString = function() {
		// // var idString = "";
		// // if (this._globalId !== null) {
		// //     idString = "¤." + this._globalId;
		// // } else if (this._persistentId !== null){
		// //     idString = "#." + this._persistsentId;
		// // } else if (this._id !== null) {
		// //     idString = "id." + this._id;
		// // }
		// // return idString;
		// function removeNull(value) {
			// return (value === null) ? 'x' : value;
		// }
		// return this._id + "." + removeNull(this._upstreamId) + "." + removeNull(this._persistentId) + "." + removeNull(this._globalId);
	// };

	// // This is the signum function, useful for debugging and tracing.
	// object.__ = function() {
		// return "(" + this.className + "." + this._idString() + ")";
	// };

	LiquidEntity.prototype.selectAll = function(selection) {
		trace('selection', liquid.allowRead(this));
		if (typeof(selection[this.const.id]) === 'undefined' && liquid.allowRead(this)) {
			// console.log("Selecting " + this.__());
			selection[this.const.id] = true;
			for (property in this) {
				let value = this[property];
				if (value instanceof LiquidEntity) { //liquid.isObject(value)
					value.selectAll();
				}
			}
		}
	}
	
	
	return {
		LiquidEntity : LiquidEntity
	}	
}));
