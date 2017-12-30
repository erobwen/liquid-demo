
function removeFromList(list, item) {
	let itemIndex;
	let i = 0;
	list.forEach((scannedItem) => {
		if (scannedItem === item) {
			itemIndex = i; 
		}
		i++;
	});
	list.splice(itemIndex, 1);
}


function addAfterInList(list, referenceItem, item) {
	let referenceIndex;
	let i = 0;
	list.forEach((scannedItem) => {
		if (scannedItem === referenceItem) {
			referenceIndex = i + 1; 
		}
		i++;
	});
	list.splice(referenceIndex, 0, item);	
}


window.DemoApplication = React.createClass(liquidClassData({
	render: function() {
		trace.render && log("render: DemoApplication");
		return invalidateUponLiquidChange("DemoApplication", this, function() {
			let page = window.page;
			return (
				<div onClick={ function(event) { dropFocus(event);} }>
					<LoginUI page = { page }/>
					{ (page.session.user === null) ? null : <TodoList todoList = { page.session.user.todoList }/> }
				</div>
			);
		}.bind(this));
	}
}));


window.TodoList = React.createClass(liquidClassData({	
	getInitialState: function() {
		return { draggingOver: false };
	},
	
	/**
	* Drag n drop target for adding first
	*/
	dragEnterCounter: 0,
	onDragEnter: function(event) {
		trace.event && log("onDragEnter (root): " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter++;
		if (draggedItem !== this.props.item) {
			var item = this.props.item;
			if (this.dragEnterCounter === 1) {
				this.setState({ 
					draggingOver: true
				});
			} else {
				this.setState({});
			}			
		}
	},
	
	onDragLeave: function(event) {
		trace.event && log("onDragLeave (root): " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter--;
		var item = this.props.item;
		if (this.dragEnterCounter === 0) {
			this.setState({ 
				draggingOver: false
			});
		}  else {
			this.setState({});
		}
	},
	
	onDragExit: function(event) {
		trace.event && log("onDragExit (root): " + this.dragEnterCounter);
		event.preventDefault();
		this.setState({ 
			draggingOver : false
		});
	},
	
	onDragOver: function(event) {
		trace.event && log("onDragOver (root): " + this.dragEnterCounter);
		event.preventDefault();
		this.setState({
			draggingOver : true,
		});
	},

	onDrop: function(event) {
		trace.event && log("onDrop (root): " + this.dragEnterCounter);
		event.preventDefault();
		
		// Reset dragging
		var droppedItem = draggedItem;
		draggedItem = null;
		this.dragEnterCounter = 0;
		draggedElement.removeAttribute("style"); // Needed as we cannot trust onDragEnd

		removeFromList(this.props.todoList, droppedItem);
		this.props.todoList.unshift(droppedItem);
		this.setState({
			draggingOver : false,
		});
	},

	addAfter : function(referenceItem, item) {
		removeFromList(this.props.todoList, item);
		addAfterInList(this.props.todoList, referenceItem, item);
	},
	
	todoItems : function() {
		var result = [];
		this.props.todoList.forEach(function(item) {
			result.push(
				<TodoItem 
					key = { item.const.id }
					item = { item }
					addAfter = { this.addAfter }
				/>
			);
		}.bind(this));
		return result;
	},
	
	render: function() {
		trace.render && log("render: TodoList");
		return invalidateUponLiquidChange("TodoList", this, function() {
			return (
				<div className="TodoList">
					<div key = "dropTarget" onDragEnter = { this.onDragEnter }
						onDragOver = { this.onDragOver }
						onDragExit = { this.onDragExit }
						onDragLeave = { this.onDragLeave }
						onDrop = { this.onDrop }
						style={{ height: "1em"}}>
					</div>
					{ (this.state.draggingOver) ? <TodoItem key = "dropPreview" item = { draggedItem } isPreview = { true }/> : null }
					{ (() => { return this.todoItems(); })() }
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
		return { 
			draggingOver : false
		};
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

	// componentDidMount: function() {
		// if (this.previewArea) {
			// this.previewArea.addEventListener("transitionend", function() {
				// // trace.ui && log("Finished transition");
				// // trace.ui && log(subCategoriesDiv);
				// // trace.ui && log(this);
				// // trace.ui && log("Height: " + subCategoriesDiv.clientHeight);
				// if (this.previewArea.clientHeight !== 0) {
					// // trace.ui && log("Tree open");
					// this.previewArea.style.height = this.previewArea.clientHeight + "px";
					// // trace.ui && log(this);
				// }
			// }.bind(this), false);			
		// }
	// },
	
	/**
	*  Dragging this todoItem
	*/	
	onDragStart: function(event) {
		trace.event && logGroup("onDragStart:" + this.props.item.name);
		// let headPropertyField = this.getHeadPropertyField();
		// window.headPropertyField = headPropertyField;
		// leftEdgeOffset = (event.screenX - headPropertyField.offsetLeft);
		
		draggedItem = this.props.item;
		draggedElement = this.todoItem;
		
		// setTimeout(function(){
		// }.bind(this));
			// this.todoItem.style.transform = "translateX(-9999px)";
		// setTimeout(function(){
		// let a1 = this.todoItem.clientHeight;
		// let a2 = this.todoItem.scrollHeight;
		// let a3 = this.todoItem.offsetHeight;
		// let a4 = this.todoItem.style.height;
		// console.log(a1);
		// console.log(a2);
		// console.log(a3);
		// console.log(a4);
		// console.log(this.todoItem.style.transition);
		// console.log(this.todoItem.style);
		window.div = this.todoItem;
		this.todoItem.style.height = this.todoItem.clientHeight + "px";
		setTimeout(function(){
			trace.event && logGroup("onDragStart:" + this.props.item.name + " , set height of dragged to 0... ");
			this.todoItem.style.transform = "translateX(-9999px)";
			this.todoItem.style.height = "0px";
			trace.event && logUngroup();
		}.bind(this));
		trace.event && logUngroup();
		// }.bind(this));
	},

	onDragEnd : function(event) {
		trace.event && log("onDragEnd:" + this.props.item.name);
		this.todoItem.style.transform = "translateX(0px)";
		setTimeout(function(){
			this.todoItem.style.height = "auto";
		}.bind(this));
	},
	
	
	/**
	* Drag n drop target
	*/
	dragEnterCounter: 0,
	onDragEnter: function(event) {
		trace.event && logGroup("onDragEnter:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		let current = this.dragEnterCounter++;
		log(current);
		if (this.props.item === draggedItem) return;
		if (current === 0) {
			console.log("START DRAGGING OVER!!!!!");
			trace.event && logGroup("setState");
			this.setState({ draggingOver: true });
			trace.event && logUngroup();
			// if (this.previewArea) this.previewArea.style.display = "inline"
			setTimeout(function(){
				if (this.previewArea) {
					trace.event && logGroup("onDragEnter:" + this.props.item.name + ", opening preview area... ");
					// this.previewArea.style.display = "inline";
					setTimeout(function(){
						console.log("setting height to:" + this.previewArea.scrollHeight);
						window.div = this.previewArea;
						this.previewArea.style.height = "0px";					
						setTimeout(function(){
							this.previewArea.style.height = this.previewArea.scrollHeight + "px";					
						}.bind(this));
					}.bind(this));
					trace.event && logUngroup();
				}
			}.bind(this));
		}
		trace.event && logUngroup();
	},
	
	onDragLeave: function(event) {
		trace.event && log("onDragLeave:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item === draggedItem) return;
		if (--this.dragEnterCounter === 0) {
			if (this.previewArea) {
				console.log(this);
				this.previewArea.style.height = "0px";
			}
			this.setState({ 
				draggingOver: false
			});
			// this.preview.style.height = "0px";
		}
	},
	
	onDragExit: function(event) {
		trace.event && log("onDragExit:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item === draggedItem) return;
		throw new Error("did not expect this...");
	},
	
	onDragOver: function(event) {
		trace.event && log("onDragOver:" + this.props.item.name + ", " + this.dragEnterCounter);
		if (this.props.item === draggedItem) return;
		// let headPropertyField = this.getHeadPropertyField();
		// window.headPropertyField = headPropertyField;
		// let xWithinField = event.screenX - headPropertyField.offsetLeft;
		// let leftEdgeXWithinField =  xWithinField - leftEdgeOffset;
		// let divider = 10; //headPropertyField.offsetWidth / 2;
		// let left = leftEdgeXWithinField <= divider;
		
		// this.setState({
			// draggingOver : true,
		// });
		event.preventDefault();
	},

	onDrop: function(event) {
		trace.event && log("onDrop:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item === draggedItem) return;
		
		// Reset dragging
		var droppedItem = draggedItem;
		draggedItem = null;
		this.dragEnterCounter = 0;
		// draggedElement.removeAttribute("style"); // Needed as we cannot trust onDragEnd
		// this.todoItem.style.transform = "translateX(0px)";
		this.todoItem.style.height = "auto";

		this.props.addAfter(this.props.item, droppedItem);
		if (this.previewArea) {
			this.previewArea.style.height = "0px";
		}
		setTimeout(function(){
			console.log(this);
			if (this.previewArea) {
				// console.log(this);
				// this.previewArea.style.display = "none";
			}
		}.bind(this));
		this.setState({ 
			draggingOver : false
		});			
	},

	/**
	*  Render
	*/
	render: function() {
		return invalidateUponLiquidChange("TodoItem", this, function() {
			trace.render && log("render: TodoItem");
			// 
			if (this.props.isPreview) {			
				return (
					<div className="TodoItem" 
						style = {{ color : "gray"}}
						ref= {(element) => { this.todoItem = element; }}>
						<span ref= {(element) => { this.itemHeadDiv = element; }}>
							<PropertyField label={"Todo"} object = { this.props.item} propertyName = "name"/>
						</span>				
					</div>
				);				
			} else {

				let preview = (this.state.draggingOver) ? <TodoItem key = { draggedItem.const.id + "_dragged"} item = { draggedItem } isPreview = { true }/> : null;

				
				return (
					<div className="TodoItem" 
						ref = {(element) => { this.todoItem = element; }}
						style = {{ 
							transition : 'height .5s',
							height : 'auto',
							overflow : 'hidden'
							// , 
							// transform : (this.state.isDragging ? "translateX(200px)" : "translateX(0px)"), 
							// height: (this.state.isDragging ? "0" : "auto")
						}}
					
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
						</span>				
						<div className = "previewArea"
							ref = {(element) => { this.previewArea = element; }} 
							style = {{transition: "height .5s", height: "0px"}}>
							{ preview }
						</div>
					</div>
				);				
			}
		}.bind(this));
		//
	}
}));
