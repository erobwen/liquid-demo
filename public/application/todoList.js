// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
		root.todoList = factory();
    }
}(this, function () {
	let liquid = require("../liquid/liquid.js")();
	let log = liquid.log;
	let logGroup = liquid.logGroup;
	let logUngroup = liquid.logUngroup;
	let trace = liquid.trace;
	
	let create = liquid.create
	let LiquidUser = liquid.LiquidUser;
	let LiquidPage = liquid.LiquidPage;
	let LiquidEntity = liquid.LiquidEntity;

	class Page extends LiquidPage {
		initialize(data) {
			super.initialize(data);			
		}
	}
	
	class User extends LiquidUser {
		initialize(data) {
			super.initialize(data);			
			this.setProperty("name", data, '');
			this.setProperty("email", data, '');
		}
		
		selectBasics(selection) {
			trace.selection && logGroup(this.const.id + ".selectBasics");

			// Select basics (move to base class)
			liquid.addToSelection(selection, this);
			liquid.addToSelection(selection, this.passwordVault);
			
			// Select TODO list
			liquid.addToSelection(selection, this.todoList);
			this.todoList.forEach((item) => {
				liquid.addToSelection(selection, item);
			});
			
			trace.selection && logUngroup();
		}
	}

	class TodoItem extends LiquidEntity {
		initialize(data) {
			super.initialize(data);

			this.setProperty("name", data, "");
			this.setProperty("done", data, false);
		}
	}
		
	return {
		User : User,
		Page : Page,
		TodoItem : TodoItem
	}	
}));
