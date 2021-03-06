// var ReactTransitionGroup = React.addons.TransitionGroup;
// http://react-toolbox.com/#/components/autocomplete
//
// var performScript = function() {
// 	// trace.ui && log("performScript");
// 	setTimeout(
// 		function(){
// 			// trace.ui && log("=== Setting name ===")
// 			data.user.setName("Foobar");
// 		},
// 		1000
// 	);
//
// 	setTimeout(
// 		function(){
// 			// var rootCategories = data.user.getRootCategories();
// 			// rootCategories[0].addSubCategory(rootCategories[1]);
// 		},
// 		2000
// 	);
// }

// let liquid = window.require('liquid')();
// console.log(window);
// console.log(window.require);
// console.log(window.require('liquid')());

// let trace = liquid.trace;
// let log = liquid.log;
// let logGroup = liquid.logGroup;
// let logUngroup = liquid.logUngroup;

let trace = {};
// let log = function() {};
let log = console.log;
let logGroup = function() {};
let logUngroup = function() {};


// <div>
// <span>Username: </span><input type="text"></input>
// <span>Password: </span><input type="password"></input>
// <span>Password repeat: </span><input type="password"></input>
// <button>Register</button>
// </div>


var UserView = React.createClass(liquidClassData({
	onDragEnter: function(event) {
		event.preventDefault();
	},
	
	onDragLeave: function(event) {
		event.preventDefault();
	},
	
	onDragExit: function(event) {
		event.preventDefault();
	},
	
	onDragOver: function(event) {
		event.preventDefault();
	},
	
	onDrop: function(a) {
		// https://www.kirupa.com/html5/get_element_position_using_javascript.htm
		// console.log(a);
		//trace.ui && log("onDrop:" + this.props.category.name + ", " + this.dragEnterCounter);
		// trace.ui && log(this.props.category);
		event.preventDefault();
		// this.dragEnterCounter = 0;
		// var category = this.props.category;
		var droppedCategory = draggedCategory;
		draggedCategory = null;
		// if (category.writeable() && category.canAddSubCategory(droppedCategory)) {
			liquid.pulse(function() {
				// trace.ui && log(droppedCategory.parents.length);
				// trace.ui && log(droppedCategory.parents);
				// var parents = copyArray(droppedCategory.parents);
				droppedCategory.parents.forEach(function(parentCategory) {
					// trace.ui && log("Dropping parent: " + parentCategory.__());
					parentCategory.subCategories.remove(droppedCategory);
				});
				// category.subCategories.add(droppedCategory);	
			});
		// }
		// this.setState({ 
			// draggingOver: false
		// });
	},
	
	render: function() {
		trace.ui && log("render: UserView");
		return invalidateUponLiquidChange("UserView", this, function() {
			// trace('react', "Render in user view. ");
			var rootCategories = this.props.user.cached('getRootCategories');
			// trace.ui && log("rootCategories");
					// <button onClick= { function() { performScript(); }} >Execute script</button>
						// onDragStart = { this.onDragStart }
			return (
				<div className="UserView">
					<span 
						onDragEnter = { this.onDragEnter }
						onDragOver = { this.onDragOver }
						onDragExit = { this.onDragExit }
						onDragLeave = { this.onDragLeave }
						onDrop = { this.onDrop }>
						{ this.props.user.name }'s categories
					</span>
					<div style={{height: "1em", draggable: "true"}}></div>
					<CategoriesView
						key = { this.props.user.const.id }
						categories = { rootCategories }  // This should evaluate to a new list upon change. This would not work with a relation... Should we create a new object on every change? However, it still means that both components needs reevaluation
					/>
				</div>
			);
		}.bind(this));
	}
}));



var CategoriesView = React.createClass(liquidClassData({	
	render: function() {
		trace.ui && log("render: CategoriesView");
		return invalidateUponLiquidChange("CategoriesView", this, function() {
			var categoriesElements = [];
			this.props.categories.forEach(function(category) {
				// trace.ui && log("A key: " + category.const.id);
				categoriesElements.push(
					<CategoryView 
						key = { category.const.id }
						category = {category}
					/>
				);
			}.bind(this));
			return ( 
				<div className="CategoriesView">
					{categoriesElements}
				</div>
			);
		}.bind(this));
	}
}));


// Useful pages
// onDrag onDragEnd onDragEnter onDragExit onDragLeave onDragOver onDragStart 
// https://jsfiddle.net/lovedota/22hmo479/
// http://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome
// http://unitstep.net/blog/2015/03/03/using-react-animations-to-transition-between-ui-states/
// https://css-tricks.com/restart-css-animation/
			 
var draggedCategory = null;
window.CategoryView = React.createClass(liquidClassData({
	getInitialState: function() {
		return { draggingOver : false, collapsed: false };
	},

	getHeadPropertyField() {
		if (typeof(this.categoryHeadDiv) !== 'undefined') {
			let propertyContents = this.categoryHeadDiv.getElementsByClassName('propertyContents');
			return propertyContents[0];
		} else {
			throw new Error("could not find property field... ");
		}
	},
	
	componentDidMount: function() {
		if (typeof(this.refs.subCategoriesDiv) !== 'undefined') {
			var subCategoriesDiv = this.refs.subCategoriesDiv;
			// trace.ui && log(subCategoriesDiv.style.marginLeft);
			subCategoriesDiv.style.overflow = 'hidden';
			subCategoriesDiv.style.height = 'auto';
			subCategoriesDiv.style.transition = 'height .5s';
			subCategoriesDiv.addEventListener("transitionend", function() {
				// trace.ui && log("Finished transition");
				// trace.ui && log(subCategoriesDiv);
				// trace.ui && log(this);
				// trace.ui && log("Height: " + subCategoriesDiv.clientHeight);
				if (subCategoriesDiv.clientHeight !== 0) {
					// trace.ui && log("Tree open");
					subCategoriesDiv.style.height = "auto";
					// trace.ui && log(this);
					this.setState({collapsed : false});
				} else {
					// trace.ui && log("Tree closed");
					// trace.ui && log(this);
					this.setState({collapsed : true});
				}
			}.bind(this), false);
		}
    },
		
	
	onDragStart: function(event) {
		// trace.ui && log("onDragStart:" + this.props.category.name);
		draggedCategory = this.props.category;
		// event.dataTransfer.setData("categoryId", this.props.category.const.id);
	},
	
	dragEnterCounter: 0,
	onDragEnter: function(event) {
		// trace.ui && log("onDragEnter:" + this.props.category.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter++;
		var category = this.props.category;
		if (this.dragEnterCounter === 1) {
			// trace.ui && log("Drag enter counter is one!");
			if (category.writeable() && category.canAddSubCategory(draggedCategory)) {
				// trace.ui && log("Actually enter!");
				this.setState({ 
					draggingOver: true
				});
			} else {
				this.setState({});
			}
		} else {
			this.setState({});
		}
	},
	
	onDragLeave: function(event) {
		// trace.ui && log("onDragLeave:" + this.props.category.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter--;
		var category = this.props.category;
		if (this.dragEnterCounter === 0) {
			// trace.ui && log("Drag leave counter is zero!");
			if (category.writeable() && category.canAddSubCategory(draggedCategory)) {
				// trace.ui && log("Actually leave!");
				this.setState({ 
					draggingOver: false
				});
			} else {
				this.setState({});
			}
		}  else {
			this.setState({});
		}
	},
	
	onDragExit: function(event) {
		// trace.ui && log("onDragExit:" + this.props.category.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.setState({ 
			draggingOver: false
		});
	},
	
	onDragOver: function(event) {
		// trace.ui && log("onDragOver:" + this.props.category.name);
		event.preventDefault();
	},
	
	onDrop: function(event) {
		let headPropertyField = this.getHeadPropertyField();
		log("dropping");
		log(this);
		log("headPropertyField:");
		log(headPropertyField);
		log(headPropertyField.offsetLeft);
		log(headPropertyField.clientWidth);
		log("event:");
		log(event.pageX);
		log(event.screenX);
		log(event.scrollX);
		//trace.ui && log("onDrop:" + this.props.category.name + ", " + this.dragEnterCounter);
		// trace.ui && log(this.props.category);
		event.preventDefault();
		this.dragEnterCounter = 0;
		var category = this.props.category;
		var droppedCategory = draggedCategory;
		draggedCategory = null;
		if (category.writeable() && category.canAddSubCategory(droppedCategory)) {
			liquid.pulse(function() {
				// trace.ui && log(droppedCategory.parents.length);
				// trace.ui && log(droppedCategory.parents);
				// var parents = copyArray(droppedCategory.parents);
				droppedCategory.parents.forEach(function(parentCategory) {
					// trace.ui && log("Dropping parent: " + parentCategory.__());
					parentCategory.subCategories.remove(droppedCategory);
				});
				category.subCategories.add(droppedCategory);	
			});
		}
		this.setState({ 
			draggingOver: false
		});
	},
	
	collapseOrExpand: function() {
		// trace.ui && log("collapseOrExpand");
		var subCategoriesDiv = this.refs.subCategoriesDiv;							
		if (subCategoriesDiv.clientHeight === 0) {
			// trace.ui && log("... opening");
			// trace.ui && log(subCategoriesDiv);
			// trace.ui && log(subCategoriesDiv.scrollHeight);
			subCategoriesDiv.style.height = subCategoriesDiv.scrollHeight + "px";
		} else {
			// trace.ui && log("... closing");
			subCategoriesDiv.style.height = subCategoriesDiv.scrollHeight + "px";
			setTimeout(function() {
				subCategoriesDiv.style.height = 0; 
			}, 0);
		}
	},
	
	render: function() {
		trace.ui && log("render: CategoryView");
		return invalidateUponLiquidChange("CategoryView", this, function() {
			var subCategories = [];
			var categoryViewElementName ="CategoryView"

			// To replace the plus sign when not showing
			var createCollapseSpacer = function() {
				return (
					<span
						style={{opacity: 0, marginRight: "0.61em"}}
						className={ "fa fa-plus-square-o" }>
					</span>);
			};
			
			// This category is locked
			// trace.ui && log("In rendering!");
			// var value = this.props.category.readable();
			// trace.ui && log(value);
			// trace.ui && log(typeof(value));
			if (!this.props.category.readable()) {
				return (
					<div className="CategoryView">
						{ createCollapseSpacer() }
						<span
							style={{marginRight: "0.61em"}}
							className={ "fa fa-lock" }>
						</span>
					</div>);
			}

			// This category is not loaded
			if (this.props.category.isPlaceholder) {
				return (
					<div className="CategoryView">
						{ createCollapseSpacer() }
						<span
							style={{marginRight: "0.61em"}}
							className={ "fa fa-spinner" }>
						</span>
					</div>);
			}


			this.props.category.subCategories.forEach(function(category) {
				trace.ui && log(category);
				// How to do it with standard syntax:

				subCategories.push(
					<CategoryView 
						key = { this.props.category.const.id + "." + category.const.id }
						category = {category}
					/>
				);
				
				// How to do it if we get element name as a string:
				// subCategories.push(React.createElement(window[categoryViewElementName], { key : category.const.id, category : category }));				
			}.bind(this));

			var collapseButton = 
				(this.props.category.subCategories.get().length > 0) ? 
					(<span 
						onClick={ this.collapseOrExpand } 
						style={{marginRight: "0.61em"}} 
						className={ this.state.collapsed ? "fa fa-plus-square-o" : "fa fa-minus-square-o"}>
					</span>)
					:
					(<span 
						style={{opacity: 0, marginRight: "0.61em"}}
						className={ "fa fa-plus-square-o" }>
					</span>);
					
			return (
				<div className="CategoryView">
					<div 
						ref= {(div) => { this.categoryHeadDiv = div; }}
						style={{ marginBottom: this.state.draggingOver ? "0.6em" : "0em"}}
						draggable = "true"
						onDragStart = { this.onDragStart }
						onDragEnter = { this.onDragEnter }
						onDragOver = { this.onDragOver }
						onDragExit = { this.onDragExit }
						onDragLeave = { this.onDragLeave }
						onDrop = { this.onDrop }>
						<span>
							{ collapseButton }
							<PropertyField label={null} object = { this.props.category} propertyName = "name"/>
						</span>
					</div>
					<div ref="subCategoriesDiv" style={{marginLeft:'1em'}}>
						{ subCategories }
					</div>
				</div>
			);
		}.bind(this));
	}
}));

