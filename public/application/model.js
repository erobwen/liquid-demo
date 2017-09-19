// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
		root.model = factory();
		// // Special behavior: Add all module names in global space
        // let module = factory(); 
		// for (property in module) {
			// root[property] = module[property];
		// }
    }
}(this, function () {
	// let liquid = require("./liquid.js");  // Cannot do! see coment below.
	// This has to follow the injected dependency pattern to avoid circular package dependencies. This is since reallyDumbRequire cannot deal with circularity, dumb as it is...

	let liquidEntity = require("../liquid/liquidEntity.js");
	let LiquidUser = liquidEntity.LiquidUser;
	let LiquidEntity = liquidEntity.LiquidEntity;
	
	let liquid; 
	function injectLiquid(injectedLiquid) {
		liquid = injectedLiquid;
	}

	// Reference service
	var defined = function(something) {
		return typeof(something) !== 'undefined';
	};

	var alphabeticSorter = function(getterName) {
		return function(a, b) {
			var aProperty = a[getterName]();
			var bProperty = b[getterName]();
			
			if(aProperty < bProperty) return -1;
			if(aProperty > bProperty) return 1;
			return 0;		
		}
	};

	
	class User extends LiquidUser {
		constructor() {} // Always leave empty

		initialize(data) {
			super(data);
			this.name = '';
			this.email = '';
			this.addedReferences = liquid.create('LiquidIndex');
			this.ownedCategories = liquid.create('LiquidIndex');
		}
		
		selectAllCategories(selection) {
			this.ownedCategories.forEach(function(category) {
				liquid.addToSelection(selection, category);
			});
		}
		
		getRootCategories() {
			let result = [];
			this.ownedCategories.forEach(function(category) {
				if (category.getParents().length === 0) {
					result.push(category);
				}
			});
			return result;
		}		
	}

	class Category extends LiquidEntity {
		function initialize(data) {
			this.name = '';
			this.description = '';
			
			this.subCategories = create("LiquidIndex"); //liquid.create([]);
			this.references = create("LiquidIndex"); //liquid.create([]);
			if (typeof(data.user) !== 'undefined') {
				data.user.ownedCategories.push(this);
			} 
		}
			
		__() {
			liquid.withoutRecording(function() {
				return "(" + this._className() + "." + this._idString() + ":" + unloadedOrName + ")";				
			});
			// Old:
			// return "(" + this.className + "." + this._idString() + ":" + unloadedOrName + ")";

			// New: TODO: Create a without observation syntax?
			
			// var unloadedOrName = this._propertyInstances['name'].data; //this.getName(); //+ liquid.onClient && !liquid. ?;
		}
		
		// Return values, "noAccess", "readOnly", "readAndWrite".
		accessLevel(user) {
			// trace('security', "Considering security: ", page, " access level to ",  this);
			var pageUserIsOwner = this.getOwner() === user;
			if (pageUserIsOwner)  {
				return "readAndWrite";
			} else {
				return this.name.startsWith("X") ? "noAccess" : "readOnly";
			}
		}
	}
	liquidEntity.addIncomingSetProperty(Category, "owner", User, "ownedCategories"); 
	liquidEntity.addIncomingProperty(Category, "parents", Category, "subCategories"); 
	
	function defined(entity) {
		return typeof(entity) !== 'undefined';
	}
	
	class Reference extends LiquidEntity {
		initialize(data) {
			super(data);
			this.url = "";
			this.pageExtractedTitle = "";
			this.pageExtractedSummary = "";
			this.pageExtractedImageUrl = "";
			
			if (defined(initialData.user)) {
				this.setOwner(initialData.user);
			}
			if (defined(initialData.categories)) {
				this.setCategories(initialData.categories);
			}
			if (defined(initialData.category)) {
				// console.log(this);
				this.setCategories([initialData.category]);
			}
		}
	}
	liquidEntity.addIncomingSetProperty(Reference, "categories", Category, "references"); 
	liquidEntity.addIncomingProperty(Reference, "owner", User, "addedReferences"); 

	return {
		injectLiquid : injectLiquid,
		User : User,
		Category : Category,
		Reference : Reference
	}	
}));
