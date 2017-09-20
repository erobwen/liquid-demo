// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
		root.liquidEntity = factory();
    }
}(this, function () {
	// let liquid = require("./liquid.js");  // Cannot do! see coment below.
	// This has to follow the injected dependency pattern to avoid circular package dependencies. This is since reallyDumbRequire cannot deal with circularity, dumb as it is...
	let liquid; 
	function injectLiquid(injectedLiquid) {
		liquid = injectedLiquid;
	}
	
	/*-----------------------------------------------
	 *              Helpers
	 *-----------------------------------------------*/

	function defaultInitializer(data) {
		for(property in data) {
			this[property] = data[property];
		}
	}

	// TODO: support class filter for incoming: 
	// return liquid.getSingleIncomingReference(this, "session");
	// return liquid.getSingleIncomingReference(this, "Page", "session");



	var capitaliseFirstLetter = function(string){
		return string.substr(0, 1).toUpperCase() + string.slice(1);
	};

	function createIncomingProperty(object, name, incomingProperty) {
		object["get" + capitaliseFirstLetter(name)] = function() {
			return getSingleIncomingReference(this, incomingProperty);
		}

		object["set" + capitaliseFirstLetter(name)] = function(page) {
			this[incomingProperty] = this;
		}	
	}


	// let LiquidSession = function() {
		// let Constructor = function() {
			// this.token = null; // Hard to guess session id
			// this.user = null;		
		// }
		
		// let Prototype = Constructor.prototype;
		
		// Prototype.init = defaultInitializer;
		
		// Prototype.encryptPassword = function() {
			// ...
		// }
		
		// return Constructor;
	// }();

	
		/** --------------------------
		*       Helpers
		------------------------------*/
		
		function createIdMap(arrayOfObjects) {
			let idMap = {};
			arrayOfObjects.forEach(function(object) {
				idMap[liquid.idExpression(object.const.id)] = object;
			});
			return idMap;
		}

		var capitaliseFirstLetter = function(string){
			return string.substr(0, 1).toUpperCase() + string.slice(1);
		};

		/** ---------------------------------
		*       Create incoming properties
		-------------------------------------*/
		
		// TODO: use javascript getters/setters.
		// (function(i) {
            // Object.defineProperty(self, i, {
                // // Create a new getter for the property
                // get: function () {
                    // return properties[i];
                // },
                // // Create a new setter for the property
                // set: function (val) {
                    // properties[i] = val;
                // }
            // })
        // })(i);

		
		function createIncomingProperty(object, name, incomingProperty, filter) {
			let getterName = "get" + capitaliseFirstLetter(name);
			object[getterName] = function() {
				return getSingleIncomingReference(this, incomingProperty, filter);
			}

			let setterName = "set" + capitaliseFirstLetter(name);
			object[setterName] = function(newObject) {
				let previousObject = object[getterName];
				if (newObject !== previousObject && filter(newObject)) {
					if (previousObject[incomingProperty] instanceof LiquidIndex) {
						previousObject[incomingProperty].remove(object);
					} else {
						previousObject[incomingProperty] = null; // Or delete by choice? 
					}
				}
				this[incomingProperty] = this;
			}	
		}

		
		function createIncomingSetProperty(object, name, incomingClassFilter, incomingProperty, sorter) {
			let filter = function(object) {
				return (object instanceof incomingClassFilter);
			}
			
			// filter, sorter
			let getterName = "get" + capitaliseFirstLetter(name);
			object[getterName] = function() {
				let objects = getIncomingReferences(this, incomingProperty, filter);
				if (typeof(sorter) !== 'undefined') {
					objects.sort(sorter);
				}
				return objects;
			}

			let setterName = "set" + capitaliseFirstLetter(name);
			object[setterName] = function(newObjects) {
				let newObjectsIdMap = createIdMap(newObjects);
				let previousObjectsIdMap = getIncomingReferencesMap(object, incomingProperty, filter);
				
				for(id in previousObjectsIdMap) {
					let previousObject = previousObjectsIdMap[id];
					if (!newObjectsIdMap[id]) {
						// if (previousObject.references instanceof LiquidIndex)
						if (previousObject[incomingProperty] instanceof LiquidIndex) {
							previousObject[incomingProperty].remove(object);
						} else {
							previousObject[incomingProperty] = null; // Or delete by choice? 
						}					
					}
				}
				
				for(id in newObjectsIdMap) {
					let newCategory = newObjectsIdMap[id];
					if (!previousObjectsIdMap[newCategory]) {
						if (newCategory[incomingProperty] instanceof LiquidIndex) {
							newCategory[incomingProperty].add(object);
						} else {
							newCategory[incomingProperty] = object;
						}
					}
				}
			}	
		}
		
	/*---------------------------
	 *         Entity 
	 *---------------------------*/

	class LiquidEntity {
		constructor() {
			// Client only (reactive) properties:
			if (liquid.configuration.onClient) {
				this.isPlaceholderObject = false;
				this.isLockedObject = false;			
			}
		}

		initialize(data) {
			for(property in data) {
				this[property] = data[property];
			}
		}

		// // This is the signum function, useful for debugging and tracing.
		__() {
			return "(" + this.className() + "." + this.idString() + ")";
		};


		idString() {
			// var idString = "";
			// if (this._globalId !== null) {
			//     idString = "¤." + this._globalId;
			// } else if (this._persistentId !== null){
			//     idString = "#." + this._persistsentId;
			// } else if (this._id !== null) {
			//     idString = "id." + this._id;
			// }
			// return idString;
			function removeNull(value) {
				return (value === null) ? 'x' : value;
			}
			return this._id + "." + removeNull(this._upstreamId) + "." + removeNull(this._persistentId) + "." + removeNull(this._globalId);
		};

		className(object) {
			return Object.getPrototypeOf(object).constructor.name;
		}
		
		cached() {
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();
			
			return liquid.callAndCacheForUniqueArgumentLists(
				liquid.getObjectAttatchedCache(this, "_cachedCalls", functionName), 
				argumentsList,
				function() {
					return this[functionName].apply(this, argumentsList);
				}.bind(this)
			);
		}
					
		selectAll = function(selection) {
			trace('selection', liquid.allowRead(this));
			if (typeof(selection[this.const.id]) === 'undefined' && liquid.allowRead(this)) {
				// console.log("Selecting " + this.__());
				selection[this.const.id] = true;
				for (property in this) {
					let value = this[property];
					if (value instanceof LiquidEntity) { //liquid.isObject(value)
						value.selectAll(selection);
					}
				}
			}
		}
		
		isLoaded() {
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
		
		pageAccessLevel(page) {
			return this.accessLevel(page.getActiveUser());
		}
		
		accessLevel(user) {
			return "readAndWrite"
		}
		
		readable() {
			return liquid.allowRead(this);
		}

		readable() {
			return liquid.allowWrite(this);
		}
		
		pageAllowCallOnServer(page) {
			return this.allowCallOnServer(page.getActiveUser());			
		}
		
		allowCallOnServer(user) {
			return false;
		}
	}


	/*---------------------------
	 *         Index 
	 *---------------------------*/

	 class LiquidIndex extends LiquidEntity {
		
		function initialize(data) {
			this.sorter = data.sorter;
			this.contents = liquid.create({});
		}
		
		function remove(object) {
			delete this.contents[liquid.idExpression(object.const.id)];
		}
		
		function add(object) {
			this.contents[liquid.idExpression(object.const.id)] = object;		 
		}
	 }
	
	
	/*---------------------------
	 *         Session 
	 *---------------------------*/

	function LiquidSession() {
		this.token = null; // Hard to guess session id
		this.user = null;
	}
	LiquidSession.prototype.init = defaultInitializer; 

	LiquidSession.prototype.encryptPassword = function(password) {
		return password + " [encrypted]";
	}

	createIncomingSetProperty(LiquidSession.prototype, "pages", LiquidPage, "session");

	// LiquidSession.prototype.getPage = function() {
		// return getSingleIncomingReference(this, "session");
	// }

	// LiquidSession.prototype.setPage = function(page) {
		// page.session = this;
	// }

	LiquidSession.prototype.accessLevel = function(page) {
		return 'readOnly';
	}

	/*---------------------------
	 *         Page 
	 *---------------------------*/

	function LiquidPage() {
		this.token = null;
		
		this.session = null;
		// this.service = null;
		this.receivedSubscriptions = []; // Do not do in constructor... besides, it needs a create. 
		this.pageService = null;
	}   

	LiquidPage.prototype.init = function(data) {
		for(property in data) {
			this[property] = data[property];
		}
		
		this.pageService = this.createPageService();
		this.pageService.orderedSubscriptions.push(create({selector: "Basics", object: this})); // Consider: Really have this? Or is it enough 
		
		// Server variables
		this.const._selection = {};
		this.const._dirtySubscriptionSelections = true;
		this.const._socket = null;
		
		// Client variables
		this.const._requestingSubscription = false;
		this.const._subscriptionQueue = [];
		
		this.token = liquid.generatePageId();
		liquid.pagesMap[this.token] = this;
		
	}

	LiquidPage.prototype.createPageService = function() {
		return new LiquidPageService();
	}

	LiquidPage.prototype.accessLevel = function(page) {
		return 'readOnly';
	}

	LiquidPage.prototype.upstreamPulseReceived = function() {
		// TODO: activate this later
		// this.setReceivedSubscriptions(this.getOrderedSubscriptions()); // TODO: Consider, what happens if two subscriptions are requested at the same time?
		// this._requestingSubscription = false;
		// this.checkLoadQueue();
	}

	LiquidPage.prototype.encryptPassword = function(password) {
		return password + " [encrypted]";
	}

	LiquidPage.prototype.selectBasics = function(selection) {
		liquid.addToSelection(selection, this);
		liquid.addToSelection(selection, this.session);
		liquid.addToSelection(selection, this.getActiveUser());
		liquid.addToSelection(selection, this.pageService);
		
		this.receivedSubscriptions.forEach(function(subscription) {
			liquid.addToSelection(selection, subscription);
			liquid.addToSelection(selection, subscription.targetObject);
		});
		this.pageService.orderedSubscriptions.forEach(function(subscription) {
			liquid.addToSelection(selection, subscription);
			liquid.addToSelection(selection, subscription.targetObject);
		});	
	}

	LiquidPage.prototype.checkLoadQueue = function(selection) {
	   return;
		// if (!this._requestingSubscription) {
			// this._requestingSubscription = true;
			// if (this._subscriptionQueue.length > 0) {
				// var subscription = this._subscriptionQueue.unshift();
				// subscription.setParent(subscription._parentSubscription);
				// this.getPageService().addOrderedSubscription(subscription);
			// }
		// }
	}

	LiquidPage.prototype.ensureLoaded = function(object, selector, prioritized, loadedCallback) { // TODO: Optional parent subscription.
		// var loadedSelections = this.getLoadedSelectionsFor(object);
		// if (typeof(loadedSelections[selector]) === 'undefined') {
			// // Find a parent subscription.
			// var parentSubscription = null;
			// for (selector in loadedSelections) {
				// var firstSelection = loadedSelections[selector];
				// parentSubscription = firstSelection[Object.keys(firstSelection)[0]];// Just take the first one, as good as anyone.
				// break;
			// }

			// var subscription = create('Subscription', {selector: selector, object: object}); // , Parent : parentSubscription
			// subscription._parentSubscription = parentSubscription;
			// subscription._loadedCallback = loadedCallback;
			// this._requestingSubscription = false;

			// if (!prioritized) {
				// this._subscriptionQueue.push(subscription);
			// } else {
				// this._subscriptionQueue.shift(subscription);
			// }
			// this.checkLoadQueue();
		// }
	}

	LiquidPage.prototype.getLoadedSelectionsFor = function(object) {
		// var idToSelectorsMap = this.cachedCall('getAllReceivedSelections');
		// return idToSelectorsMap[object._id];
	}

	LiquidPage.prototype.getAllReceivedSelections = function() {
		// liquid.recordSelectors = true;
		// liquid.idToSelectorsMap = {}; // Structure {id -> {selector -> {subscriptionId -> subscription}}}
		// this.getReceivedSubscriptions().forEach(function(subscription) {
			// liquid.recordingSubscription = subscription;
			// var selection = {};
			// var selectorFunctionName = capitaliseFirstLetter(selection.getSelector());
			// subscription.getTargetObject()[selectorFunctionName](selection);
		// });
		// liquid.recordingSelectors = false;
		// return liquid.idToSelectorsMap;
	}

	LiquidPage.prototype.getActiveUser = function() {
		// if (this.getSession() != null) {
			// // console.log(this.getSession());
			// // console.log(this.getSession().getUser);
			// return this.getSession().getUser();
		// }
		// return null;
	}

	LiquidPage.prototype.setActiveUser = function(user) {
		// if (this.getSession() != null) {
			// // console.log(this.getSession());
			// // console.log(this.getSession().getUser);
			// return this.getSession().setUser(user);
		// }
		// return null;
	}


	/*---------------------------
	 *      Page Service
	 *---------------------------*/

	function LiquidPageService() {
		this.orderedSubscriptions = [];
	}

	createIncomingProperty(LiquidPageService.prototype, "page", "pageService");

	LiquidPageService.prototype.init = defaultInitializer; // TODO: move to base class?

	LiquidPageService.prototype.accessLevel = function(page) {
		return 'readAndWrite';
	}

	LiquidPageService.prototype.allowCallOnServer = function(page) {
		return page === this.getPage();
	}

	LiquidPageService.prototype.encryptPassword = function(password) {
		return password + " [encrypted]";
	}

	LiquidPageService.prototype.tryLogin = function(loginName, liquidPassword) {
		// Use SHA and similar here!
		// alert('try login');
		this.callOnServer('tryLoginOnServer', loginName, this.encryptPassword(liquidPassword));
	}

	LiquidPageService.prototype.logout = function(loginName, liquidPassword) {
		// Use SHA and similar here!
		this.callOnServer('logoutOnServer');
	}

	LiquidPageService.prototype.logout = function(loginName, liquidPassword) {
		// Use SHA and similar here!
		this.callOnServer('logoutOnServer');
	}

	LiquidPageService.prototype.tryLoginOnServer = function(loginName, clientEncryptedPassword) {
		// console.log("Here");
		// console.log(loginName);
		// console.log(clientEncryptedPassword);
		var serverEncryptedPassword = this.encryptPassword(clientEncryptedPassword);
		var user = liquid.findLocalEntity({name: loginName});
		if (user != null && user.getEncryptedPassword() === serverEncryptedPassword) {
			this.getPage().setActiveUser(user);
		}
	}

	LiquidPageService.prototype.logoutOnServer = function(loginName, liquidPassword) {
		this.getPage().setActiveUser(null);
	}


	/*---------------------------------------
	 *     Subscription (simple list?) 
	 *--------------------------------------*/

	 // liquid.registerClass({
		// name: 'Subscription',  _extends: 'Entity',

		// addPropertiesAndRelations : function(object) {
			// // Basics
			// object.addProperty('selector', 'all'); //TODO: write once semantics.
			// object.addRelation('TargetObject','toOne'); //TODO: write once semantics

			// // Relations
			// object.addReverseRelationTo('LiquidPage_Subscriptions','Page', 'toOne');

			// object.addRelation('ChildSubscription', 'toMany');
			// object.addReverseRelationTo('Subscription_ChildSubscription', 'Parent', 'toOne');
		// },

		// addMethods : function(object) {
			// // Properties
			// object.overrideMethod('init', function(parent, initData) {
				// // parent(initData); // Should not be needed, has no data visible inside liquid.
				// this.setSelector(undefinedAsNull(initData.selector));
				// this.setTargetObject(initData.object);
				// this._previousSelection = {};
				// this._idToDownstreamIdMap = null;  // This is set in pulses where this page pushes data upstream.
			// });
		// }
	// });

			

	/*---------------------------------------
	 *      User 
	 *--------------------------------------*/

	function LiquidUser() {
		this.loginName = "";
		this.alternativeLoginName = "";
		this.passwordVault = liquid.create(new LiquidUserPasswordVault());
	}

	createIncomingProperty(LiquidUser.prototype, "session", "user");
	
	var addUserPageAndSessions = function(liquid) {
		liquid.addUserPageAndSessionClasses = function() {
			liquid.registerClass({
				name: 'LiquidUser', _extends: 'Entity',

				addPropertiesAndRelations : function (object) {
					// Properties
					object.addProperty('loginName', '');
					object.addProperty('alternativeLoginName', '');

					// Relations
					object.addRelation('PasswordVault', 'toOne');

					object.addReverseRelationTo('LiquidSession_User', 'Session', 'toOne');
				},

				addMethods : function (object) {
					object.overrideMethod('init', function(parent, initData) {
						parent(initData);

						var encryptedPassword = null;
						if (typeof(initData.password) !== 'undefined') {
							encryptedPassword = initData.password + "[encrypted][encrypted]";
						} else if (typeof(initData.clientEncryptedPassword) !== 'undefined') {
							encryptedPassword = initData.clientEncryptedPassword + "[encrypted]";
						} else if (typeof(initData.serverEncryptedPassword) !== 'undefined') {
							encryptedPassword = initData.serverEncryptedPassword;
						}

						this.setPasswordVault(create('LiquidUserPasswordVault', { encryptedPassword: encryptedPassword })); // TODO: really need init data?
					});

					object.addMethod('getEncryptedPassword', function() {
						return this.getPasswordVault().getEncryptedPassword();
					});
				}
			});

			liquid.registerClass({
				name: 'LiquidUserPasswordVault', _extends: 'Entity',

				addPropertiesAndRelations : function (object) {
					// Properties
					object.addProperty('encryptedPassword', '');

					// Relations
					object.addReverseRelationTo('LiquidSession_User', 'Session', 'toOne');
				},

				addMethods : function (object) {
					object.overrideMethod('accessLevel', function(page) {  // Return values, "noAccess", "readOnly", "readAndWrite".
						return "noAccess"; // Only accessible on server call.
					});
				}
			});
		};
	};
	
	return {
		injectLiquid : injectLiquid,
		LiquidEntity : LiquidEntity,
		LiquidSession : LiquidSession,
		LiquidPage : LiquidPage,
		LiquidPageService : LiquidPageService,
		LiquidUser : LiquidUser
		// LiquidUserPasswordVault : LiquidUserPasswordVault
	}	
}));

