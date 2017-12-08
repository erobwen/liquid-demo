// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
        root.objectlog = factory(); // Support browser global
    }
}(this, function () {
	
	// let bufferWidth = 56;
	let bufferWidth = 83;
	// let bufferWidth = 76;
	
	let globalIndentLevel = 0;

	function indentString(level) {
		let string = "";
		while (level-- > 0) {
			string = string + "  ";
		}
		return string;
	}

	function createBasicContext() {
		return {
			terminated : false,
			rootLevel : true,
			horizontal : false,
			indentLevel : globalIndentLevel,
			unfinishedLine : false
		}		
	}
	
	function createToStringContext() {
		let context = createBasicContext();
		context.result = "";
		context.log = function(string) {
			if (this.unfinishedLine) {
				this.result += string;
				this.unfinishedLine = true;
			} else {
				this.result += indentString(this.indentLevel) + string;
				this.unfinishedLine = true;
			}
		};
		context.finishOpenLine = function() {
			if (this.unfinishedLine && !this.horizontal) {
				this.result += "\n";
				this.unfinishedLine = false;
			}
		};		
		return context;
	}
	
	function createStdoutContext() {
		let context = createBasicContext();
		context.log = function(string) {
			if (this.unfinishedLine) {
				process.stdout.write(string); 						
				this.unfinishedLine = true;
			} else {
				let indent = indentString(this.indentLevel);
				process.stdout.write(indent + string);
				this.unfinishedLine = true;
			}
		};
		context.finishOpenLine = function() {
			if (this.unfinishedLine && !this.horizontal) {
				console.log();
				this.unfinishedLine = false;
			}
		};
		return context;
	}

	function createHorizontalMeasureContext(limit) {
		let context = createBasicContext();
		context.horizontal = true;
		context.count = 0;
		context.limit = limit;
		
		context.log = function(string) {
			if (this.unfinishedLine) {
				this.count += string.length;
				this.terminated = this.count > this.limit;
				this.unfinishedLine = true;
			} else {
				let indent = indentString(this.indentLevel);
				this.count += (indent + string).length;
				this.terminated = this.count > this.limit;
				this.unfinishedLine = true;
			}
		};
		context.finishOpenLine = function() {};		
		return context;
	}
		
	function horizontalLogFitsWithinWidthLimit(entity, pattern, limit) {		
		let context = createHorizontalMeasureContext(limit);
		logPattern(entity, pattern, context);
		return !context.terminated;
	}

	function logPattern(entity, pattern, context) {
		if (typeof(pattern) === "undefined") {
			pattern = 1;
		} 
		
		// Setup of process
		let outer = false;
		if (typeof(context) === 'undefined') {
			context = createStdoutContext();
			outer = true;
		}
		
		// Bail out if terminated
		if (context.terminated) return;

		// Recursive rendering
		if (typeof(entity) !== 'object') {
			if (typeof(entity) === 'function') {
				context.log("function( ... ) { ... }");				
			} else if (typeof(entity) === 'string') {
				if (context.rootLevel) {
					context.log(entity);
				} else {
					context.log('"' + entity + '"');								
				}
			} else {
				context.log(entity + "");				
			}
		} else if (entity === null) {
			context.log("null");
		} else {
			if (pattern === 0) {
				if (entity instanceof Array) {
					context.log("[...]"); 
				} else {
					context.log("{...}"); 				
				}
			} else {
				let isArray = (entity instanceof Array);
				let startedHorizontal = false;
				if (!context.horizontal) {
					context.horizontal = horizontalLogFitsWithinWidthLimit(entity, pattern, bufferWidth - context.indentLevel * 2); // - 
					startedHorizontal = true;
				}
				if (isArray) context.finishOpenLine(); // Should not be when enforced single row.
				context.log(isArray ? "[" : "{");
				// context.log(context.horizontal ? "-" : "|");
				context.finishOpenLine();
				context.indentLevel++;
				let first = true;
				for (p in entity) {
					if (!first) {
						context.log(", ");
						context.finishOpenLine();
					}
					if (!isArray || isNaN(p)) context.log(p + " : ");
					
					let nextPattern = null;
					if (typeof(pattern) === 'object') {
						nextPattern = pattern[p];
					} else {
						nextPattern = pattern - 1;
					}
					
					if(!isArray) context.indentLevel++;
					context.rootLevel = false;
					logPattern(entity[p], nextPattern, context);
					if(!isArray) context.indentLevel--;
					first = false;
				}
				context.indentLevel--;
				context.finishOpenLine();
				context.log(isArray ? "]" : "}");
				if (startedHorizontal) {
					context.horizontal = false;
				}
			}
		}
		if (outer) context.finishOpenLine();
	}
	
	
	let objectlog = {
		toString: function(entity, pattern) {
			let context = createToStringContext();
			logPattern(entity, pattern, context);
			return context.result;
		}, 
		findLogs : false,
		useConsoleDefault : false,
		log : function(entity, pattern) {
			if (objectlog.findLogs) throw new Error("No logs allowed!");
			if (objectlog.useConsoleDefault) {
				console.log(entity);
			} else {
				logPattern(entity, pattern);
			}
		},
		enter : function(entity, pattern) {
			if (objectlog.findLogs) throw new Error("No logs allowed!");
			if (objectlog.useConsoleDefault) {
				console.group(entity);
			} else {
				if (typeof(entity) !== 'undefined') {
					logPattern(entity, pattern);
				}
				globalIndentLevel++;
			}
		},
		exit : function() {
			if (objectlog.findLogs) throw new Error("No logs allowed!");
			if (objectlog.useConsoleDefault) {
				console.groupEnd();
			} else {
				globalIndentLevel--;
			}
		} 		
	}
	return objectlog;
}));


		 

