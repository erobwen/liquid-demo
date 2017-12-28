
window.TodoList = React.createClass(liquidClassData({	
	getInitialState: function() {
		return { state : create({}) };
	},

	addAfter : function(referenceItem, item) {
		let i = 0;
		let itemIndex;
		this.props.todoList.forEach((scannedItem) => {
			if (scannedItem === item) {
				itemIndex = i; 
			}
			i++;
		});
		// console.log("remove old object at index:" + itemIndex);
		this.props.todoList.splice(itemIndex, 1);
		
		let referenceIndex;
		i = 0;
		this.props.todoList.forEach((scannedItem) => {
			if (scannedItem === referenceItem) {
				referenceIndex = i + 1; 
			}
			i++;
		});
		// console.log("remove old object at index:" + referenceIndex);
		this.props.todoList.splice(referenceIndex, 0, item);
		// this.props.todoList.push(item);
	},
	
	render: function() {
		trace.ui && log("render: TodoList");
		return invalidateUponLiquidChange("TodoList", this, function() {
			var todoItems = [];
			// todoItems.push(<TodoDropPlaceholder state = { this.state } />); 
			this.props.todoList.forEach(function(item) {
				// trace.ui && log("A key: " + item.const.id);
				todoItems.push(
					<TodoItem 
						key = { item.const.id }
						item = { item }
						addAfter = { this.addAfter }
					/>
				);
				// todoItems.push(<TodoDropPlaceholder/>); 
			}.bind(this));
			return ( 
				<div className="TodoList">
					{todoItems}
				</div>
			);
		}.bind(this));
	}
}));


let draggedItem = null;
let draggedElement = null;
let leftEdgeOffset = 0;

window.TodoItem = React.createClass(liquidClassData({
	getInitialState: function() {
		return { draggingOver : false, isDragging : false };
	},

	getHeadPropertyField() {
		if (typeof(this.itemHeadDiv) !== 'undefined') {
			let propertyContents = this.itemHeadDiv.getElementsByClassName('propertyContents');
			return propertyContents[0];
		} else {
			console.log(this.itemHeadDiv);
			window.errorDiv = this.itemHeadDiv;
			throw new Error("could not find property field... ");
		}
	},

	
	onDragStart: function(event) {
		let headPropertyField = this.getHeadPropertyField();
		window.headPropertyField = headPropertyField;
		leftEdgeOffset = (event.screenX - headPropertyField.offsetLeft);
		log("leftEdgeOffset: " + leftEdgeOffset);
		
		// trace.ui && log("onDragStart:" + this.props.item.name);
		draggedItem = this.props.item;
		draggedElement = this.todoItem;
		this.setState({ 
			isDragging: true, 
			draggingOver : false
		});
		
		setTimeout(function(){
			this.todoItem.style.transform = "translateX(-9999px)";
			this.todoItem.style.height = "0";
		}.bind(this));


		// style={{ transform: this.state.isDragging ? "translateX(-9999px)" : "translateX(0px)"}}
		// event.dataTransfer.setData("itemId", this.props.item.const.id);
	},

	onDragEnd : function(event) {
		this.todoItem.removeAttribute("style");//element.removeAttribute("style")
	},
	
	dragEnterCounter: 0,
	onDragEnter: function(event) {
		// trace.ui && log("onDragEnter:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter++;
		if (draggedItem !== this.props.item) {
			var item = this.props.item;
			if (this.dragEnterCounter === 1) {
				// trace.ui && log("Drag enter counter is one!");
				// if (item.writeable() && item.canAddSubCategory(draggedItem)) {
					// trace.ui && log("Actually enter!");
					this.setState({ 
						draggingOver: true,
						isDragging : false
					});
				// } else {
					// this.setState({});
				// }
			} else {
				this.setState({});
			}			
		}
	},
	
	onDragLeave: function(event) {
		// trace.ui && log("onDragLeave:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter--;
		var item = this.props.item;
		if (this.dragEnterCounter === 0) {
			// trace.ui && log("Drag leave counter is zero!");
			// if (item.writeable() && item.canAddSubCategory(draggedItem)) {
				// trace.ui && log("Actually leave!");
				this.setState({ 
					draggingOver: false,
					isDragging : false
				});
			// } else {
				// this.setState({});
			// }
		}  else {
			this.setState({});
		}
	},
	
	onDragExit: function(event) {
		// trace.ui && log("onDragExit:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.setState({ 
			draggingOver : false
		});
	},
	
	onDragOver: function(event) {
		let headPropertyField = this.getHeadPropertyField();
		window.headPropertyField = headPropertyField;
		// log("onDragOver");
		// log(this);
		// log("headPropertyField:");
		// log(headPropertyField);
		// log(headPropertyField.offsetLeft);
		// log(headPropertyField.offsetWidth);
		// log("event:");
		// log(event.pageX);
		// log(event.screenX);
		let xWithinField = event.screenX - headPropertyField.offsetLeft;
		let leftEdgeXWithinField =  xWithinField - leftEdgeOffset;
		let divider = 10; //headPropertyField.offsetWidth / 2;
		
		let left = leftEdgeXWithinField <= divider;
		this.setState({
			draggingOver : true,
			addAsNextSibling : left,
			addAsFirstChild : !left,
			isDragging : false
		});
		// log(left);
		// log(event.scrollX);

		// trace.ui && log("onDragOver:" + this.props.item.name);
		event.preventDefault();
	},
	
	onDrop: function(event) {
		//trace.ui && log("onDrop:" + this.props.item.name + ", " + this.dragEnterCounter);

		// event.persist() // NOTE: don't forget to remove it post debug
		// console.log(event);
		// trace.ui && log(this.props.item);
		event.preventDefault();
		this.dragEnterCounter = 0;
		var item = this.props.item;
		var droppedItem = draggedItem;
		// delete this.todoItem.style.transform;
		// this.todoItem.style.transform = "";
		draggedElement.removeAttribute("style");//element.removeAttribute("style")
		console.log(this.todoItem);
		this.props.addAfter(this.props.item, droppedItem);
		draggedItem = null;
		this.setState({ 
			draggingOver: false,
			isDragging : false
		});
		// if (item.writeable()) {
			// liquid.pulse(function() {
				// // trace.ui && log(droppedItem.parents.length);
				// // trace.ui && log(droppedItem.parents);
				// // var parents = copyArray(droppedItem.parents);
				// droppedItem.parents.forEach(function(parentCategory) {
					// // trace.ui && log("Dropping parent: " + parentCategory.__());
					// parentCategory.subCategories.remove(droppedItem);
				// });
				// item.subCategories.add(droppedItem);	
			// });
		// }
	},
	
	render: function() {
		return invalidateUponLiquidChange("TodoItem", this, function() {
			trace.ui && log("render: TodoItem");
			
			if (this.props.isPreview) {			
				return (
					<div className="TodoItem">
						<span ref= {(element) => { this.itemHeadDiv = element; }}>
							<PropertyField label={"Todo"} object = { this.props.item} propertyName = "name"/>
						</span>				
					</div>
				);				
			} else {
				// Get the drop item
				let dropItem;
				if (this.state.draggingOver) {
					if (this.state.addAsNextSibling) {
						dropItem = (<TodoItem key = { draggedItem.const.id + "_dragged"} item = { draggedItem } isPreview = { true }/>);
					} else {
						dropItem = (
							<div style={{ marginLeft: this.state.draggingOver ? "0.6em" : "0em"}}>
								<TodoItem key = { draggedItem.const.id + "_dragged"} item = { draggedItem } isPreview = { true }/>
							</div>
						);
					}
				} else {
					dropItem = (<div></div>);
				}
				
				return (
					<div className="TodoItem" ref= {(element) => { this.todoItem = element; }}
						draggable = "true"
						onDragStart = { this.onDragStart }
						onDragEnd = { this.onDragEnd }
						onDragEnter = { this.onDragEnter }
						onDragOver = { this.onDragOver }
						onDragExit = { this.onDragExit }
						onDragLeave = { this.onDragLeave }
						onDrop = { this.onDrop }>
						<span ref= {(element) => { this.itemHeadDiv = element; }} >
							<PropertyField label={"Todo"} object = { this.props.item} propertyName = "name"/>
							{ dropItem }
						</span>				
					</div>
				);				
			}
		}.bind(this));
	}
}));



























// Useful pages
// onDrag onDragEnd onDragEnter onDragExit onDragLeave onDragOver onDragStart 
// https://jsfiddle.net/lovedota/22hmo479/
// http://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome
// http://unitstep.net/blog/2015/03/03/using-react-animations-to-transition-between-ui-states/
// https://css-tricks.com/restart-css-animation/
			 
// var draggedItem = null;
// window.TodoItem = React.createClass(liquidClassData({
	// getInitialState: function() {
		// return { draggingOver : false, collapsed: false };
	// },

	// // getHeadPropertyField() {
		// // if (typeof(this.itemHeadDiv) !== 'undefined') {
			// // let propertyContents = this.itemHeadDiv.getElementsByClassName('propertyContents');
			// // return propertyContents[0];
		// // } else {
			// // throw new Error("could not find property field... ");
		// // }
	// // },
	
	// onDragStart: function(event) {
		// // trace.ui && log("onDragStart:" + this.props.item.name);
		// draggedItem = this.props.item;
		// // event.dataTransfer.setData("itemId", this.props.item.const.id);
	// },
	
	// dragEnterCounter: 0,
	
	// onDragEnter: function(event) {
		// // trace.ui && log("onDragEnter:" + this.props.item.name + ", " + this.dragEnterCounter);
		// event.preventDefault();
		// this.dragEnterCounter++;
		// var item = this.props.item;
		// if (this.dragEnterCounter === 1) {
			// // trace.ui && log("Drag enter counter is one!");
			// if (item.writeable() && item.canAddSubCategory(draggedItem)) {
				// // trace.ui && log("Actually enter!");
				// this.setState({ 
					// draggingOver: true
				// });
			// } else {
				// this.setState({});
			// }
		// } else {
			// this.setState({});
		// }
	// },
	
	// onDragLeave: function(event) {
		// // trace.ui && log("onDragLeave:" + this.props.item.name + ", " + this.dragEnterCounter);
		// event.preventDefault();
		// this.dragEnterCounter--;
		// var item = this.props.item;
		// if (this.dragEnterCounter === 0) {
			// // trace.ui && log("Drag leave counter is zero!");
			// if (item.writeable() && item.canAddSubCategory(draggedItem)) {
				// // trace.ui && log("Actually leave!");
				// this.setState({ 
					// draggingOver: false
				// });
			// } else {
				// this.setState({});
			// }
		// }  else {
			// this.setState({});
		// }
	// },
	
	// onDragExit: function(event) {
		// // trace.ui && log("onDragExit:" + this.props.item.name + ", " + this.dragEnterCounter);
		// event.preventDefault();
		// this.setState({ 
			// draggingOver: false
		// });
	// },
	
	// onDragOver: function(event) {
		// // trace.ui && log("onDragOver:" + this.props.item.name);
		// event.preventDefault();
	// },
	
	// onDrop: function(event) {
		// let headPropertyField = this.getHeadPropertyField();
		// log("dropping");
		// log(this);
		// log("headPropertyField:");
		// log(headPropertyField);
		// log(headPropertyField.offsetLeft);
		// log(headPropertyField.clientWidth);
		// log("event:");
		// log(event.pageX);
		// log(event.screenX);
		// log(event.scrollX);
		// //trace.ui && log("onDrop:" + this.props.item.name + ", " + this.dragEnterCounter);
		// // trace.ui && log(this.props.item);
		// event.preventDefault();
		// this.dragEnterCounter = 0;
		// var item = this.props.item;
		// var droppedItem = draggedItem;
		// draggedItem = null;
		// if (item.writeable() && item.canAddSubCategory(droppedItem)) {
			// liquid.pulse(function() {
				// // trace.ui && log(droppedItem.parents.length);
				// // trace.ui && log(droppedItem.parents);
				// // var parents = copyArray(droppedItem.parents);
				// droppedItem.parents.forEach(function(parentCategory) {
					// // trace.ui && log("Dropping parent: " + parentCategory.__());
					// parentCategory.subCategories.remove(droppedItem);
				// });
				// item.subCategories.add(droppedItem);	
			// });
		// }
		// this.setState({ 
			// draggingOver: false
		// });
	// },
	
	// render: function() {
		// trace.ui && log("render: CategoryView");
		// return invalidateUponLiquidChange("CategoryView", this, function() {
			// var subCategories = [];
			// var itemViewElementName ="CategoryView"

			// // To replace the plus sign when not showing
			// var createCollapseSpacer = function() {
				// return (
					// <span
						// style={{opacity: 0, marginRight: "0.61em"}}
						// className={ "fa fa-plus-square-o" }>
					// </span>);
			// };
			
			// // this.props.item.subCategories.forEach(function(item) {
				// // trace.ui && log(item);
				// // // How to do it with standard syntax:

				// // subCategories.push(
					// // <CategoryView 
						// // key = { this.props.item.const.id + "." + item.const.id }
						// // item = {item}
					// // />
				// // );
				
				// // // How to do it if we get element name as a string:
				// // // subCategories.push(React.createElement(window[itemViewElementName], { key : item.const.id, item : item }));				
			// // }.bind(this));


					
			// return (
				// <div className="CategoryView">
					// <div 
						// ref= {(div) => { this.itemHeadDiv = div; }}
						// draggable = "true"
						// // style={{ marginBottom: this.state.draggingOver ? "0.6em" : "0em"}}
						// onDragStart = { this.onDragStart }
						// onDragEnter = { this.onDragEnter }
						// onDragOver = { this.onDragOver }
						// onDragExit = { this.onDragExit }
						// onDragLeave = { this.onDragLeave }
						// onDrop = { this.onDrop }>
						// <span>
							// <PropertyField label={null} object = { this.props.item} propertyName = "name"/>
						// </span>
					// </div>
					// <div ref="subCategoriesDiv" style={{marginLeft:'1em'}}>
						// { subCategories }
					// </div>
				// </div>
			// );
		// }.bind(this));
	// }
// }));