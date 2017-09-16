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

		function initialize(data) {
			super(data);
			this.name = '';
			this.email = '';
			this.addedReferences = liquid.create([]);
			this.ownedCategories = liquid.create([]);
		}
		
		function selectAllCategories(selection) {
			this.ownedCategories.forEach(function(category) {
				liquid.addToSelection(selection, category);
			});
		}
		
		function getRootCategories() {
			let result = [];
			this.ownedCategories.forEach(function(category) {
				if (liquid.countIncoming("subCategory", category) === 0) {
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
			
			this.subCategories = liquid.create([]);
			this.references = liquid.create([]);
			if (typeof(data.user) !== 'undefined') {
				data.user.ownedCategories.push(this);
			} 
		}
		
		function getOwner() {
			return liquid.getSingleIncoming(this, "ownedCategories");
		}

		function getParent() {
			return liquid.getSingleIncoming(this, "subCategories");
		}
		
		function __() {
			// Old:
			// return "(" + this.className + "." + this._idString() + ":" + unloadedOrName + ")";

			// New: TODO: Create a without observation syntax?
			
			// var unloadedOrName = this._propertyInstances['name'].data; //this.getName(); //+ liquid.onClient && !liquid. ?;
			// return "(" + this.className + "." + this._idString() + ":" + unloadedOrName + ")";			
		}
	}
	
	registerClass({
		
		addMethods : function (object) {
			
			
			object.overrideMethod('__', function(parent) {
			});

			object.overrideMethod('accessLevel', function(parent, page) {  // Return values, "noAccess", "readOnly", "readAndWrite".
				trace('security', "Considering security: ", page, " access level to ",  this);
				var pageUserIsOwner = this.getOwner() === page.getActiveUser();
				if (pageUserIsOwner)  {
					return "readAndWrite";
				} else {
					return startsWith("X", this.getName()) ? "noAccess" : "readOnly";
				}
			});

		}
	});


	registerClass({
		name: 'Reference', _extends: 'Entity',
		
		addPropertiesAndRelations : function (object) {
			// Properties
			object.addProperty('url', '');
			object.addProperty('pageExtractedTitle', '');
			object.addProperty('pageExtractedSummary', '');
			object.addProperty('pageExtractedImageUrl', '');
					
			// Relations
			object.addReverseRelationTo('Category_Reference', 'Category', 'toMany');
			object.addReverseRelationTo('User_AddedReference', 'Owner', 'toOne');
		},
		
		addMethods : function (object) {
			// console.log("Adding methods in Reference");
			object.overrideMethod('init', function(parent, initialData) {
				// console.log("=== Initialize in Reference ===");
				parent(initialData);
				if (defined(initialData.user)) {
					this.setOwner(initialData.user);
				}
				if (defined(initialData.categories)) {
					// console.log(this);
					this.setCategories(initialData.categories);
				}
				// console.log(initialData);
				// console.log(defined(initialData.category));
				if (defined(initialData.category)) {
					// console.log(this);
					this.setCategories([initialData.category]);
				}
			});
		}
	});	


	registerClass({
		name: 'Comment', _extends: 'Entity',
		
		addPropertiesAndRelations : function (object) {
			// Properties
			object.addProperty('url', '');
			
			// Relations
			object.addRelation('AddedBy', 'toMany');
		},
		
		addMethods : function (object) {}
	});	

	registerClass({
		name: 'Title', _extends: 'Comment',
		
		addPropertiesAndRelations : function (object) {
			// Properties
			object.addProperty('value', '');
		},
		
		addMethods : function (object) {}
	});	

	registerClass({
		name: 'PlainTextComment', _extends: 'Comment',
		
		addPropertiesAndRelations : function (object) {
			// Properties
			object.addProperty('text', '');
		},
		
		addMethods : function (object) {}
	});	

	registerClass({
		name: 'TitledPlainTextComment', _extends: 'Comment',
		
		addPropertiesAndRelations : function (object) {
			// Properties
			object.addProperty('text', '');
			object.addProperty('title', '');
		},
		
		addMethods : function (object) {}
	});	
	return {
		injectLiquid : injectLiquid,
		User : User,
		Category : Category,
	}	
}));
