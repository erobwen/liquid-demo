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
	let create;
	
	// Debugging
	let log;
	let logGroup;
	let logUngroup;
	let trace;
	
	function injectLiquid(injectedLiquid) {
		liquid = injectedLiquid;
		create = liquid.create;
		
		log = liquid.log;
		logGroup = liquid.logGroup;
		logUngroup = liquid.logUngroup;
	
		trace = liquid.trace;
		// trace.entity = 1;
	}


	
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

	function encryptPassword(password) {
		return password + "[encrypted]";
	}
	
	/** ---------------------------------
	*       Create incoming properties
	-------------------------------------*/
	
	function createClassFilter(incomingClassFilter) { // filterClassNameConstructorOrPrototype
		if (incomingClassFilter === null) {
			return function() {
				return true;
			}
		} else if (typeof(incomingClassFilter) === 'string') {
			return function(object) {
				incomingPrototype = liquid.classRegistry[incomingClassFilter];
				if (typeof(incomingPrototype) !== 'function') incomingPrototype = incomingPrototype.constructor;
				return (object instanceof incomingPrototype);
			}
		} else if (typeof(incomingClassFilter) === 'function') {
			return function(object) {
				return (object instanceof incomingClassFilter);
			}
		}
	}
	
	function createIncomingProperty(object, name, incomingClassFilter, incomingProperty) {
		// Get the prototype if called with a constructor
		if (typeof(object) === 'function') object = object.prototype;
		
		// Create class filter
		let filter = createClassFilter(incomingClassFilter);
		
		Object.defineProperty(object, name, {
			get: function() {
				// console.log("inside getter");
				return liquid.getSingleIncomingReference(this, incomingProperty, filter);
			},
			set: function(newObject) {
				// console.log("Inside set incoming property");
				let result = liquid.isObject(newObject);
				// console.log(result);
				if (result) {
					// log("getting previous");
					let previousObject = this[name];
					// log("Previous and new object: ");
					// log(previousObject);
					// log(newObject);
					// log(filter(newObject));
					if (newObject !== previousObject && filter(newObject)) {
						if (previousObject !== null) {
							let previousOutgoingValue = previousObject[incomingProperty];
							if (previousOutgoingValue instanceof LiquidIndex) {
								previousOutgoingValue.remove(this);
							} else {
								previousObject[incomingProperty] = null; // Or delete by choice? 
							}
						}
						let nextOutgoingValue = newObject[incomingProperty];
						if (nextOutgoingValue instanceof LiquidIndex) {
							nextOutgoingValue.add(this);
						} else {
							newObject[incomingProperty] = this; // Or delete by choice? 
						}							
					}
					return true;
				} else {
					// console.log(newObject);
					// console.log(newObject.const.id);
					throw new Error("Expected an object when assigning an incoming property '" + name + "'.");
				}
			}
		});
	}
	
	function removeFromArray(object, array) {
		for(var i = 0; i < array.length; i++) {
			// console.log("Searching!");
			// console.log(array[i]);
			if (array[i] === object) {
				// console.log("found it!");
				array.splice(i, 1);
				break;
			}
		}		
	}
	
	function createIncomingSetProperty(object, name, incomingClassFilter, incomingProperty, sorter) {
		// Get the prototype if called with a constructor
		if (typeof(object) === 'function') object = object.prototype;
		
		// Create class filter
		let filter = createClassFilter(incomingClassFilter);
		
		// Add getters and setters
		Object.defineProperty(object, name, {
			get: function() {
				// log("createIncomingSetProperty: get");
				// log(this);
				let objects = liquid.getIncomingReferences(this, incomingProperty, filter);
				// log(objects);
				if (typeof(sorter) !== 'undefined') {
					objects.sort(sorter);
				}
				return objects;
			},
			set: function(newObjects) {
				// log("createIncomingSetProperty: set");
				// log("Inside setter!!!");
				// log(this.const);
				if (newObjects instanceof Array) {
					let newObjectsIdMap = createIdMap(newObjects);
					let previousObjectsIdMap = liquid.getIncomingReferencesMap(this, incomingProperty, filter);
					
					for(id in previousObjectsIdMap) {
						let previousObject = previousObjectsIdMap[id];
						if (!newObjectsIdMap[id]) {
							// if (previousObject.references instanceof LiquidIndex)
							if (previousObject[incomingProperty] instanceof LiquidIndex) {
								previousObject[incomingProperty].remove(this);
							} else {
								previousObject[incomingProperty] = null; // Or delete by choice? 
							}					
						}
					}
					
					for(id in newObjectsIdMap) {
						let newCategory = newObjectsIdMap[id];
						if (!previousObjectsIdMap[newCategory]) {
							if (newCategory[incomingProperty] instanceof LiquidIndex) {
								newCategory[incomingProperty].add(this);
							} else {
								newCategory[incomingProperty] = this;
							}
						}
					}
					return true;
				} else {
					throw new Error("Expected an array of objects to when assigning incoming set property.");					
				}
			}
		});

		object["addTo" + capitaliseFirstLetter(name)] = function(newObject) {
			objects = this[name];
			objects.push(newObject);
			this[name] = objects;
		}
		
		object["removeFrom" + capitaliseFirstLetter(name)] = function(removedObject) {
			objects = this[name];
			removeFromArray(removedObject, objects);
			this[name] = objects;
		}
	}

	/*---------------------------
	 *  With setters and getters
	 *---------------------------*/
	// function createIncomingProperty(object, name, incomingClassFilter, incomingProperty) {
		// // Get the prototype if called with a constructor
		// if (typeof(object) === 'function') object = object.prototype;
		
		// // Create class filter
		// let filter = createClassFilter(incomingClassFilter);
		
		// addIncomingPropertyGetter(object, name, incomingProperty, filter);
		// addIncomingPropertySetter(object, name, incomingProperty, filter);
	// }
	
	// function createIncomingSetProperty(object, name, incomingClassFilter, incomingProperty, sorter) {
		// // Get the prototype if called with a constructor
		// if (typeof(object) === 'function') object = object.prototype;
		
		// // Create class filter
		// let filter = createClassFilter(incomingClassFilter);
		
		// // Add getters and setters
		// addIncomingPropertySetGetter(object, name, incomingProperty, filter, sorter);
		// addIncomingPropertySetSetter(object, name, incomingProperty, filter);
	// }
	
	// function addIncomingPropertyGetter(object, name, incomingProperty, filter) {
		// let getterName = "get" + capitaliseFirstLetter(name);
		// object[getterName] = function() {
			// return getSingleIncomingReference(this, incomingProperty, filter);
		// }
	// }

	// function addIncomingPropertySetter(object, name, incomingProperty, filter) {
		// let setterName = "set" + capitaliseFirstLetter(name);
		// object[setterName] = function(newObject) {
			// let previousObject = this[getterName];
			// if (newObject !== previousObject && filter(newObject)) {
				// if (previousObject[incomingProperty] instanceof LiquidIndex) {
					// previousObject[incomingProperty].remove(this);
				// } else {
					// previousObject[incomingProperty] = null; // Or delete by choice? 
				// }
			// }
			// this[incomingProperty] = this;
		// }	
	// }

	// function addIncomingPropertySetGetter(object, getterName, incomingProperty, filter, sorter) {
		// let getterName = "get" + capitaliseFirstLetter(name);
		// object[getterName] = function() {
			// let objects = getIncomingReferences(this, incomingProperty, filter);
			// if (typeof(sorter) !== 'undefined') {
				// objects.sort(sorter);
			// }
			// return objects;
		// }
	// }	
	
	// function addIncomingPropertySetSetter(object, name, incomingProperty, filter) {
		// let setterName = "set" + capitaliseFirstLetter(name);
		// object[setterName] = function(newObjects) {
			// let newObjectsIdMap = createIdMap(newObjects);
			// let previousObjectsIdMap = getIncomingReferencesMap(this, incomingProperty, filter);
			
			// for(id in previousObjectsIdMap) {
				// let previousObject = previousObjectsIdMap[id];
				// if (!newObjectsIdMap[id]) {
					// // if (previousObject.references instanceof LiquidIndex)
					// if (previousObject[incomingProperty] instanceof LiquidIndex) {
						// previousObject[incomingProperty].remove(this);
					// } else {
						// previousObject[incomingProperty] = null; // Or delete by choice? 
					// }					
				// }
			// }
			
			// for(id in newObjectsIdMap) {
				// let newCategory = newObjectsIdMap[id];
				// if (!previousObjectsIdMap[newCategory]) {
					// if (newCategory[incomingProperty] instanceof LiquidIndex) {
						// newCategory[incomingProperty].add(this);
					// } else {
						// newCategory[incomingProperty] = this;
					// }
				// }
			// }
		// }
	// }
	
	// Helper
	function argumentsToArray(arguments) {
		return Array.prototype.slice.call(arguments);
	};
	
	/*---------------------------
	 *         Entity 
	 *---------------------------*/

	class LiquidEntity {
		constructor() {
			this.const = {};
		}

		initialize(data) {
			this._ = "{" + this.className() + "}";
			// log("LiquidEntity.initialize");
			// this.assign(data);
		}
		
		isUndefined(property) {
			return typeof(this[property]) === 'undefined';
		}
		
		setProperty(property, data, defaultValue) {
			if (typeof(this[property]) === 'undefined') {
				if (typeof(data[property]) !== 'undefined') {
					this[property] = data[property];
					return true;
				} else if (typeof(defaultValue) !== 'undefined'){
					this[property] = defaultValue;
					return true;
				}
				return false;
			} 				
			return true;
		}
		
		set(property, data, defaultValue) {
			if (typeof(data[property]) !== 'undefined') {
				this[property] = data[property];
			} else {
				this[property] = defaultValue;
			}
		}
		
		getProperty(value, defaultValue) {
			if (typeof(value) !== 'undefined') {
				return value;
			} else {
				return defaultValue;
			}
		}
		
		attatchIndex(property, index) {
			liquid.setIndex(this, property, index); // Has to use liquid to do this, since incoming needs to be disabled during this operation. 
		}

		// assign(data) {
			// for(property in data) {
				// this[property] = data[property];
			// }
		// }
		
		// assignWeak(data) {
			// for(property in data) {
				// if (typeof(this[property] === 'undefined')) {
					// this[property] = data[property];
				// }
			// }
		// }

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
			// } else if (this.const.id !== null) {
			//     idString = "id." + this.const.id;
			// }
			// return idString;
			function removeNull(value) {
				return (value === null || typeof(value) === 'undefined') ? 'x' : value;
			}
			return this.const.id + "." + removeNull(this._upstreamId); //  + "." + removeNull(this._persistentId) + "." + removeNull(this._globalId);
		};

		className() {
			let prototype = Object.getPrototypeOf(this);
			if (typeof(prototype) === 'undefined') return "No Prototype";
			let constructor = prototype.constructor;
			if (typeof(constructor) === 'undefined') return "No Prototype";
			return constructor.name;
		}
		
		cached() {
			let argumentsList = argumentsToArray(arguments);
			let functionName = argumentsList.shift();
			
			return liquid.callAndCacheForUniqueArgumentLists(
				liquid.getObjectAttatchedCache(liquid.configuration.reactiveStructuresAsCausalityObjects ? this : this.const, "_cachedCalls", functionName), 
				argumentsList,
				function() {
					return this[functionName].apply(this, argumentsList);
				}.bind(this)
			);
		}
		
		// isLoaded() {
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
		// }
		
		
		select(selectionTag) {
			let selection = {};
			this["select" + selectionTag](selection);
			return selection;
		}
		
		copySelection(selectionTag) {
			let selection = this.select(selectionTag);
			
			function copyRecursivley(entity, limit) {
				if (liquid.isObject(entity)) {
					if (typeof(limit[object.const.id]) !== 'undefined') {
						let copy = liquid.create(this.className());
						Object.keys(this).forEach((key) => {
							copy[key] = copyRecursivley(this[key], limit);
						});	
						return copy;				
					} else {
						return null;
					}					
				} else {
					return entity;
				}
			}
			
			return copyRecursivley(this, selection); 
		}
		
		copyFromSelection(source, selectionTag) {
			let sourceToFinishedTargetMap = {};
			let targetReusedMap = {};
			let selection = this.select(selectionTag);
			
			function copyFromSelectionRecursive(source, targetCandidate) {
				if (typeof(selection[source.const.id]) !== 'undefined') {
					// Already copied
					if (typeof(sourceToFinishedTargetMap[source.const.id]) !== 'undefined') {
						return sourceToFinishedTargetMap[source.const.id];
					}
					
					// Create a copy, candidate not already in use.
					let target;
					if (liquid.isObject(targetCandidate) && typeof(targetReusedMap[targetCandidate.const.id]) === 'undefined') {
						targetReusedMap[targetCandidate.const.id] = true; // Mark target as reused.
						sourceToFinishedTargetMap[source.const.id] = targetCandidate; // Map source to this target
						target = targetCandidate;
						
						// Clear out unused properties (that will not be overwritten)
						Object.keys(target).forEach((key) => {
							if (typeof(source[key]) !== 'undefined') {
								delete target[key];
							}
						});
					} else {
						target = liquid.create(source.className());
					}
					
					Object.keys(source).forEah((key) => {
						target[key] = copyFromSelectionRecursive(source[key], target[key]);
					});
					
					return target;
				} else {
					// No copy for you
					return source;
				}
			}
			
			copyFromSelectionRecursive(source, this);
		}
		
		pageAccessLevel(page) {
			return this.accessLevel(page.getActiveUser());
		}
		
		accessLevel(user) {
			return "readAndWrite"
		}
		
		readable() {
			return liquid.canRead(this);
		}

		writeable() {
			return liquid.canWrite(this);
		}
		
		pageAllowCallOnServer(page) {
			return this.allowCallOnServer(page.getActiveUser());			
		}
		
		allowCallOnServer(user) {
			trace.entity && log("LiquidEntity:allowCallOnServer");
			return false;
		}
		
		callOnServer() {
			if (typeof(this.const._upstreamId) !== 'undefined') {
				// Split arguments
				var argumentsArray = argumentsToArray(arguments);
				var methodName = argumentsArray.shift();
				var methodArguments = argumentsArray;
				var callData = {
					objectId: this.const._upstreamId,
					methodName: methodName,
					argumentList: argumentsArray 
				};
				liquid.makeCallOnServer(callData);				
			} else {
				throw new Error("Trying to make a call on server for an object that is not shared by the server!");
			}
			
			//cloneAndMapLiquidObjectsDeep(argumentsArray, function(liquidObject) {
					// if (liquidObject._upstreamId != null) {
						// return { id : liquidObject._upstreamId };
					// } else {
						// return null; // TODO: consider, should we push data to server?
					// }
				// })
			// traceGroup('serialize', "=== Call on server ===");
			// trace('serialize', callData.callId, callData.objectId, callData.methodName);
			// trace('serialize', callData.argumentList);
			// traceGroupEnd();
		}
	}


	/*---------------------------
	 *         Index 
	 *---------------------------*/
	// Note: the only reason we have to have indexParentRelation in the object, is so that it survives streaming etc.... Otherwise it ould have been in const. 
	let nonContentProperties = {
		'indexParentRelation' : true,
		'indexParent' : true, 
		'name' : true,
		'_' : true,
		'isPlaceholder' : true, 
		'isLocked' : true
	}
	
	class LiquidIndex extends LiquidEntity {	
		constructor() {
			super();
			// this.isLiquidIndex = true;
			// this.const.isIndex = true; // is this working.... maybe not... TODO: figure out something else.
			this.const.isIndex = true;
			// this._const_isIndex = true; // Tell causality to put something in the const? 
		}
		
		initialize(data) {
			super.initialize(data);
			this.setProperty("keyPropertyName", data, "const.id");
			this.setProperty("keyMethodName", data, null);
			this.setProperty("keyUnique", data, true);
			this.attatchIndex("contents", create({}));
			// this.setProperty("compareMethodName", data, null);
		}
		
		selectTree(selection) {
			trace.selection && logGroup("selectTree");
			liquid.addToSelection(selection, this);
			liquid.addToSelection(selection, this.contents);
			trace.selection && logUngroup();
		}
		
		selectAll(selection, elementSelector) {
			trace.selection && logGroup("selectAll");
			liquid.addToSelection(selection, this);
			liquid.addToSelection(selection, this.contents);
			Object.keys(this.contents).forEach(function(key) {
				if (!liquid.indexUsedNames[key]) {
					let element = this.contents[key];
					// if (liquid.isObject(element) {
					if (typeof(elementSelector) !== 'undefined') {
						if (typeof(element["select" + elementSelector]) !== 'function') {
							trace.entity && log(key);
							trace.entity && log("select" + elementSelector);
							trace.entity && log(element);
						}
						element["select" + elementSelector](selection);
					} else {
						liquid.addToSelection(selection, element);
					}					
				}
				// }
			}.bind(this));
			trace.selection && logUngroup();
		}
		
		setContents(objectArray) {
			let keys = Object.keys(this.contents);
			keys.forEach(function(property) {
				delete this.contents[property];
			}.bind(this)); 
			objectArray.forEach(function(object) {
				this.add(object)
			});
		}
		
		get() {
			let result = [];
			let keys = Object.keys(this.contents);
			keys.forEach(function(property) {
				if (!nonContentProperties[property])
					result.push(this.contents[property]);
			}.bind(this)); 
			return result;
		}
		
		forEach(callback) {
			trace.entity && logGroup("LiquidIndex.forEach");
			// trace.get++;
			Object.keys(this.contents).forEach(function(key) {
				if (!nonContentProperties[key] && typeof(this.contents[key]) !== 'undefined') {
					// log(liquid.state.incomingStructuresDisabled);
					let value = this.contents[key];
					trace.entity && log(value);
					callback(value);				
				} 
			}.bind(this));
			// trace.get--;
			trace.entity && logUngroup();
		}
		
		remove(object) {
			delete this.contents[liquid.idExpression(object.const.id)];
		}
		
		add(object) {
			this.contents[liquid.idExpression(object.const.id)] = object;		 
		}
		
		find(pattern) {
			log("find...")
			if (typeof(pattern) === 'string') {
				let value = pattern;
				pattern = {};
				pattern[this.keyPropertyName] = value;
			}
			log(pattern);
			let matchingObjects = [];
			this.forEach((object) => {
				log("searching... ");
				let matches = true;
				for (let property in pattern) {
					matches = matches && object[property] === pattern[property]
				}
				if (matches) {
					matchingObjects.push(object);
				}
			});
			return matchingObjects;
		}
		
		findOne(pattern) {
			let matchingObjects = this.find(pattern);
			if (matchingObjects.length > 1) {
				throw new Error("Expected to find at most one object that matches the pattern.");
			}
			return matchingObjects.length === 0 ? null : matchingObjects[0];
		}
	 }
	
	
	/*---------------------------
	 *         Session 
	 *---------------------------*/

	class LiquidSession extends LiquidEntity {
		initialize(data) {
			super.initialize(data);
			this.setProperty("token", data, null);
			this.setProperty("user", data, null);			
		}
		
		accessLevel(user) {
			return 'readOnly';
		}
	}
	createIncomingSetProperty(LiquidSession, "pages", "LiquidPage", "session");

	
	/*---------------------------
	 *         Page 
	 *---------------------------*/

	
	class LiquidPage extends LiquidEntity {
		constructor () {
			super();
			
			// Server variables
			this.const._selection = {};
			this.const._dirtySubscriptionSelections = true;
			this.const._socket = null;
			
			// Client variables
			this.const._requestingSubscription = false;
			this.const._subscriptionQueue = [];
		}
		
		initialize(data) {
			super.initialize(data);
			this.setProperty(data, "session", null);
			if (this.setProperty(data, "receivedSubscriptions")) {
				this.receivedSubscriptions = create([]); 				
			}
			if (this.isUndefined("session")) {
				this.session = this.getProperty(data.session, null);				
			}
			if (this.isUndefined("service")) {
				this.service = this.createPageService();				
			}
			this.service.orderedSubscriptions.push(create({selector: "Basics", object: this})); // Consider: Really have this? Or is it enough 
						
			// Register page 
			liquid.registerPage(this);
		}
		
		createPageService() {
			return create("LiquidPageService");
		}
		
		accessLevel(user) {
			return 'readOnly';
		}
		
		upstreamPulseReceived() {
			// TODO: activate this later
			// this.setReceivedSubscriptions(this.getOrderedSubscriptions()); // TODO: Consider, what happens if two subscriptions are requested at the same time?
			// this._requestingSubscription = false;
			// this.checkLoadQueue();
		}
		
		selectBasics(selection) {
			trace.selection && logGroup(this.const.id + ".selectBasics");

			liquid.addToSelection(selection, this);
			liquid.addToSelection(selection, this.session);
			liquid.addToSelection(selection, this.getActiveUser());
			liquid.addToSelection(selection, this.service);
			
			this.receivedSubscriptions.forEach(function(subscription) {
				liquid.addToSelection(selection, subscription);
				liquid.addToSelection(selection, subscription.targetObject);
			});
			this.service.orderedSubscriptions.forEach(function(subscription) {
				liquid.addToSelection(selection, subscription);
				liquid.addToSelection(selection, subscription.targetObject);
			});	
			
			trace.selection && logUngroup();
		}
		
		checkLoadQueue(selection) {
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
		
		ensureSubscribed(object, selector, prioritized, subscribedCallback) {
			return false;
		}
		
		ensureLoaded(object, selector, prioritized, loadedCallback) { // TODO: Optional parent subscription.
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
		
		getLoadedSelectionsFor(object) {
			// var idToSelectorsMap = this.cachedCall('getAllReceivedSelections');
			// return idToSelectorsMap[object.const.id];
		}

		getAllReceivedSelections() {
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

		getActiveUser() {
			// trace.entity && log("getActiveUser");
			// trace.entity && log(this.session, 2);
			if (this.session != null) {
				return this.session.user;
			}
			return null;
		}

		setActiveUser(user) {
			if (this.session != null) {
				return this.session.user = user;
			}
			return false;
		}
	}
	// Add getters and setters
	Object.defineProperty(LiquidPage, "user", {
		get: function() {
			return this.session.user;
		},
		set: function(user) {
			this.session.user = user;
		}
	});
	

	


	/*---------------------------
	 *      Page Service
	 *---------------------------*/

	class LiquidPageService extends LiquidEntity {
		initialize() {
			// log("LiquidPageService.initialize");
			this.orderedSubscriptions = create([]);
			
			// createIncomingProperty(LiquidPageService, "page", LiquidPage, "service");
		}
		
		accessLevel(user) {
			return 'readAndWrite';
		}

		pageAllowCallOnServer(page) {
			trace.entity && logGroup("LiquidPageService:pageAllowCallOnServer");
			return page === this.page;
			trace.entity && logUngroup();
		}

		tryLogin(loginName, liquidPassword) {
			// Use SHA and similar here!
			// alert('try login');
			this.callOnServer('tryLoginOnServer', loginName, encryptPassword(liquidPassword));
		}

		logout(loginName, liquidPassword) {
			trace.entity && log("logout");
			// Use SHA and similar here!
			this.callOnServer('logoutOnServer');
		}

		tryLoginOnServer(loginName, clientEncryptedPassword) {
			trace.entity && log("tryLoginOnServer");
			// console.log("Here");
			// console.log(loginName);
			// console.log(clientEncryptedPassword);
			var serverEncryptedPassword = encryptPassword(clientEncryptedPassword);
			var user = typeof(liquid.persistent) !== 'undefined' ? liquid.persistent.users.findOne(loginName) : liquid.users.findOne(loginName);
			log(user);
			if (user != null && user.passwordVault.encryptedPassword === serverEncryptedPassword) {
				this.page.session.user = user;
				return true;
			}
			log(serverEncryptedPassword);
			log(user.passwordVault.encryptedPassword);
			return false;
		}

		logoutOnServer(loginName, liquidPassword) {
			trace.entity && log("logoutOnServer");
			this.page.session.user = null;
		}
	}
	createIncomingProperty(LiquidPageService, "page", "LiquidPage", "service");

	


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
				// this.const.idToDownstreamIdMap = null;  // This is set in pulses where this page pushes data upstream.
			// });
		// }
	// });

			

	/*---------------------------------------
	 *      User 
	 *--------------------------------------*/

	class LiquidUser extends LiquidEntity {
		initialize(data) {
			// log("LiquidUser.initialize");
			super.initialize(data);
			this.setProperty("loginName", "");
			this.setProperty("alternativeLoginName", "");
			
			let encryptedPassword = null;
			if (typeof(data.password) !== 'undefined') {
				encryptedPassword = data.password + "[encrypted][encrypted]";
			} else if (typeof(data.clientEncryptedPassword) !== 'undefined') {
				encryptedPassword = data.clientEncryptedPassword + "[encrypted]";
			} else if (typeof(data.serverEncryptedPassword) !== 'undefined') {
				encryptedPassword = data.serverEncryptedPassword;
			}
			
			this.passwordVault = create("LiquidUserPasswordVault", { encryptedPassword: encryptedPassword });
		}
		
		selectBasics(selection) {
			trace.selection && logGroup(this.const.id + ".selectBasics");
			liquid.addToSelection(selection, this);
			liquid.addToSelection(selection, this.passwordVault);
			trace.selection && logUngroup();
		}
		
		getEncryptedPassword() {
			this.passwordVault.encryptedPassword;
		}
	}
	
	class LiquidUserPasswordVault extends LiquidEntity {
		initialize(data) {
			this.setProperty("encryptedPassword", data, "");
		}
		accessLevel(user) {  // Return values, "noAccess", "readOnly", "readAndWrite".
			return "noAccess"; // Only accessible on server call.
		}
	}
	
	return {
		injectLiquid : injectLiquid,
		functions : {
			createIncomingSetProperty : createIncomingSetProperty,
			createIncomingProperty : createIncomingProperty
		},
		classes : {
			LiquidEntity : LiquidEntity,
			LiquidIndex : LiquidIndex,
			LiquidSession : LiquidSession,
			LiquidPage : LiquidPage,
			LiquidPageService : LiquidPageService,
			LiquidUser : LiquidUser,	
			LiquidUserPasswordVault : LiquidUserPasswordVault
		}
	}	
}));

