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
	// let objectlog = require("../liquid/objectlog.js");

	// console.log("in model...");
	let liquid = require("../liquid/liquid.js")();
	let log = liquid.log;
	let logGroup = liquid.logGroup;
	let logUngroup = liquid.logUngroup;
	let trace = liquid.trace;
	
	let create = liquid.create
	let LiquidUser = liquid.LiquidUser;
	let LiquidPage = liquid.LiquidPage;
	let LiquidEntity = liquid.LiquidEntity;

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

	class Page extends LiquidPage {
		initialize(data) {
			// log("User.initialize");
			super.initialize(data);			
			this.setProperty("viewedUser", data, null);
		}
	}
	
	class User extends LiquidUser {
		initialize(data) {
			// log("User.initialize");
			super.initialize(data);			
			this.setProperty("name", data, '');
			this.setProperty("email", data, '');
			if (this.isUndefined("addedReferences")) {
				this.attatchIndex("addedReferences", create('LiquidIndex'));
			}
			if (this.isUndefined("ownedCategories")) {
				this.attatchIndex("ownedCategories", create('LiquidIndex'));
			}
		}
		
		
		selectBasics(selection) {
			trace.selection && logGroup(this.const.id + ".selectBasics");
			liquid.addToSelection(selection, this);
			liquid.addToSelection(selection, this.passwordVault);
			this.ownedCategories.selectAll(selection, "WithIndexes");
			this.addedReferences.selectAll(selection);
			trace.selection && logUngroup();
		}

		getRootCategories() {
			let result = [];
			this.ownedCategories.forEach(function(category) {
				if (typeof(category.parents) === 'undefined') {
					trace.model && log("got a strange parents list... ");
					// trace.model && console.log(category);
				}
				if (category.parents.length === 0) {
					result.push(category);
				}
			});
			return result;
		}		
	}

	class Category extends LiquidEntity {
		initialize(data) {
			super.initialize(data);
			
			this._ = "";
			// console.log("initialize Category");
			this.setProperty("name", data, '');
			this.setProperty("description", data, '');
			// this.owner;  Incoming: User.categories

			// Sub categories
			this.attatchIndex("subCategories", create("LiquidIndex"));
			if (typeof(data['subCategories']) !== 'undefined') {
				data['subCategories'].forEach(function(subCategory) {
					this.subCategories.add(subCategory);					
				});
			}
			
			// References
			this.attatchIndex("references", create("LiquidIndex"));
			if (typeof(data['references']) !== 'undefined') {
				data['references'].forEach(function(subCategory) {
					this.references.add(subCategory);					
				});
			}

			// User
			if (typeof(data.owner) !== 'undefined') {
				// console.log("setting owner!");
				this.owner = data.owner;
			}
			// assignWeak(data);
			
		}
			
		selectWithIndexes(selection) {
			trace.selection && logGroup(this.const.id + ".selectWithIndexes");
			liquid.addToSelection(selection, this);
			this.subCategories.selectTree(selection);
			this.references.selectTree(selection);
			trace.selection && logUngroup();
		}
		
		allTransitiveSubCategories(set) {
			if (typeof(set) === 'undefined') {
				set = {};
			}
			
			if (typeof(set[this.const.id]) === 'undefined') {
				set[this.const.id] = this;
			
				this.subCategories.forEach(function(subCategory) {
					subCategory.allTransitiveSubCategories(set);
				});
			}
			return set;
		}
		
		canAddSubCategory(category) {
			trace.model && log(category.allTransitiveSubCategories(), 2);
			return typeof(category.allTransitiveSubCategories()[this.const.id]) === 'undefined';
		}
		// __() {
			// liquid.withoutRecording(function() {
				// return "(" + this._className() + "." + this._idString() + ":" + unloadedOrName + ")";				
			// });
			// // Old:
			// // return "(" + this.className + "." + this._idString() + ":" + unloadedOrName + ")";

			// // New: TODO: Create a without observation syntax?
			
			// // var unloadedOrName = this._propertyInstances['name'].data; //this.getName(); //+ liquid.onClient && !liquid. ?;
		// }
		
		// Return values, "noAccess", "readOnly", "readAndWrite".
		accessLevel(user) {
			// trace('security', "Considering security: ", page, " access level to ",  this);
			var pageUserIsOwner = this.owner === user;
			if (pageUserIsOwner)  {
				return "readAndWrite";
			} else {
				return this.name.startsWith("X") ? "noAccess" : "readOnly";
			}
		}
	}
	liquid.createIncomingProperty(Category, "owner", User, "ownedCategories"); 
	liquid.createIncomingSetProperty(Category, "parents", Category, "subCategories"); 
	
	function defined(entity) {
		return typeof(entity) !== 'undefined';
	}
	
	class Reference extends LiquidEntity {
		initialize(data) {
			super.initialize(data);
			this._ = "";
			
			this.url = "";
			this.pageExtractedTitle = "";
			this.pageExtractedSummary = "";
			this.pageExtractedImageUrl = "";
			
			this.setProperty("owner", data);
			this.setProperty("categories", data);
			if (defined(data.category)) {
				this.categories = [data.category];
			}
			// log("====================================================");
			// liquid.trace.basic = true;
			// logGroup();
			// this.assignWeak(data);
			// logUngroup();
			// liquid.trace.basic = false;
			// log("====================================================");
		}
	}
	liquid.createIncomingSetProperty(Reference, "categories", Category, "references"); 
	liquid.createIncomingProperty(Reference, "owner", User, "addedReferences"); 

	return {
		User : User,
		Page : Page,
		Category : Category,
		Reference : Reference
	}	
}));
