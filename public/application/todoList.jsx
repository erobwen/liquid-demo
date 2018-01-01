
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

// "2168-0002  2107-0445"
let draggedItem = null;
let draggedHtml = null;
let leftEdgeOffset = 0;

let currentDivider = null;
let currentDividerIndex = null;


window.TodoList = React.createClass(liquidClassData({
	getInitialState: function() {
		return { draggingOver: false };
	},

	clearDivider : function(divider) {
		log("...clear divider: " + currentDividerIndex);
		divider.style.height = "0px";
		divider.innerHTML = "";
		divider.style.display = "none";
		// setTimeout(function(){
		// }.bind(this));		
	},
	
	softCloseDivider : function(divider) {
		log("...start soft close: " + currentDividerIndex);
		divider.style.height = divider.clientHeight + "px";
		divider.innerHTML = "";
		console.log(divider);
		setTimeout(function(){
			log("...initiate soft close...");
			divider.style.height = "0px";
		}.bind(this));
		setTimeout(function(){
			log("...killing it after 500 ms");
			divider.style.display = "none";
		}.bind(this), 500);		
	},
	
	openDivider : function(divider) {
		log("...open divider: " + currentDividerIndex);
		divider.style.display = "block";
		divider.style.height = "0px";
		divider.innerHTML = "...preview... ";
		// divider.appendChild(draggedHtml);
		setTimeout(function(){
			divider.style.height = divider.scrollHeight + "px";
		}.bind(this));
	},
	
	previewAfter : function(itemIndex) {
		log("...preview after...");
		let newDividerIndex = itemIndex + 1;
		let newDivider = this.dividers[newDividerIndex];
		if (currentDivider !== newDivider) {
			if (currentDivider !== null) {
				this.softCloseDivider(currentDivider);
			}
			currentDividerIndex = newDividerIndex;
			currentDivider = newDivider;
			this.openDivider(currentDivider);
		}
		// 
	}, 
	
	abortDragging : function() {
		if (currentDivider) {
			this.clearDivider(currentDivider);			
			currentDividerIndex = null;
			currentDivider = null;		
		} 

		if (draggedItem) {
			draggedItem = null;
			draggedHtml = null;
			leftEdgeOffset = 0;			
		}		
	},
	
	dropDraggedItem : function() {
		logGroup("drop dragged item");
		console.log(this.dividers);
		// this.dividers.forEach(function(divider) {
			// if (divider !== null) {
				// divider.style.display = "none";				
			// }
		// });
		this.clearDivider(currentDivider);
		
		let referenceIndex = currentDividerIndex - 1;
		let referenceItem = this.props.todoList[currentDividerIndex - 1];
		let item = draggedItem;
		
		draggedItem = null;
		draggedHtml = null;
		leftEdgeOffset = 0;
		
		currentDivider = null;
		currentDividerIndex = null;
		
		removeFromList(this.props.todoList, item);
		addAfterInList(this.props.todoList, referenceItem, item);
		logUngroup();
	},


	todoItems : function() {
		let todoList = this.props.todoList;
		var result = [];
		if (todoList.length > 0) {
			result.push(<div ref= {(element) => { if (element !== null) this.dividers.push(element); }}
							key = { this.dividersCount++ } 
							style = {{display : "none", transition: "height .5s", height: "0px"}}>
						</div>); 
			let index = 0;
			todoList.forEach(function(item) {
				result.push(
					<TodoItem 
						key = { item.const.id }
						item = { item }
						itemIndex = { index++ }
						dropDraggedItem = { this.dropDraggedItem }
						abortDragging = { this.abortDragging }
						previewAfter = { this.previewAfter }
					/>
				);
				result.push(<div ref= {(element) => { if (element !== null) this.dividers.push(element); }}
								key = { this.dividersCount++ } 
								style = {{display : "none", transition: "height .5s", height: "0px"}}>
							</div>); 
			}.bind(this));			
		}
		return result;
	},
	
	// { (this.state.draggingOver) ? <TodoItem key = "dropPreview" item = { draggedItem } isPreview = { true }/> : null }
	render: function() {
		return invalidateUponLiquidChange("TodoList", this, function() {
			trace.render && log("render: TodoList");
			this.dividers = [];
			this.dividersCount = 0;
			let result = (
				<div className="TodoList">
					{ (() => { return this.todoItems(); })() }
				</div>
			);
			console.log(this.dividers);
			return result;
		}.bind(this));
	}
}));


window.TodoItem = React.createClass(liquidClassData({
	getInitialState: function() { 
		return {}; 
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
		draggedHtml = this.itemHeadDiv.cloneNode(true);
		
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
		trace.event && logGroup("onDragEnd:" + this.props.item.name);
		this.props.abortDragging();
		this.todoItem.style.transform = "translateX(0px)";
		setTimeout(function(){
			this.todoItem.style.height = "auto";
		}.bind(this));
		trace.event && logUngroup();
	},
	
	
	/**
	* Drag n drop target
	*/
	dragEnterCounter: 0,
	onDragEnter: function(event) {
		trace.event && logGroup("onDragEnter:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item !== draggedItem) {				
			let current = this.dragEnterCounter++;
			if (current === 0) {
				console.log("START DRAGGING OVER!!!!!");
				
				this.props.previewAfter(this.props.itemIndex);
				
				// Preview area: 
				// // trace.event && logGroup("setState");
				// // this.setState({ draggingOver: true });
				// // trace.event && logUngroup();
				// if (this.previewArea) this.previewArea.style.display = "block"
				// // this.previewArea.innerHTML = "...preview..."; 
				// this.previewArea.appendChild(draggedHtml); 
				// setTimeout(function(){
					// if (this.previewArea) {
						// trace.event && logGroup("onDragEnter:" + this.props.item.name + ", opening preview area... ");
						// // this.previewArea.style.display = "inline";
						// setTimeout(function(){
							// console.log("setting height to:" + this.previewArea.scrollHeight);
							// window.div = this.previewArea;
							// this.previewArea.style.height = "0px";					
							// setTimeout(function(){
								// this.previewArea.style.height = this.previewArea.scrollHeight + "px";					
							// }.bind(this));
						// }.bind(this));
						// trace.event && logUngroup();
					// }
				// }.bind(this));
			}
		}
		trace.event && logUngroup();
	},
	
	onDragLeave: function(event) {
		trace.event && logGroup("onDragLeave:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item !== draggedItem) {
			if (--this.dragEnterCounter === 0) {
				// Preview area..
				// if (this.previewArea) {
					// console.log(this);
					// this.previewArea.style.height = "0px";
				// }
				// this.previewArea.innerHTML = "";
				
				// this.setState({ 
					// draggingOver: false
				// });
				// this.preview.style.height = "0px";
			}
		}
		trace.event && logUngroup();
	},
	
	onDragExit: function(event) {
		trace.event && logGroup("onDragExit:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item !== draggedItem) {
			throw new Error("did not expect this...");			
		}
		trace.event && logUngroup();
	},
	
	onDragOver: function(event) {
		// trace.event && logGroup("onDragOver:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item !== draggedItem) {			
			// let headPropertyField = this.getHeadPropertyField();
			// window.headPropertyField = headPropertyField;
			// let xWithinField = event.screenX - headPropertyField.offsetLeft;
			// let leftEdgeXWithinField =  xWithinField - leftEdgeOffset;
			// let divider = 10; //headPropertyField.offsetWidth / 2;
			// let left = leftEdgeXWithinField <= divider;
			
			// this.setState({
				// draggingOver : true,
			// });
		}
		// trace.event && logUngroup();
	},

	onDrop: function(event) {
		trace.event && logGroup("onDrop:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		// if (this.props.item !== draggedItem) {
			this.dragEnterCounter = 0;
			// Reset dragging
			// draggedElement.removeAttribute("style"); // Needed as we cannot trust onDragEnd
			// this.todoItem.style.transform = "translateX(0px)";
			// this.todoItem.style.height = "auto";

			this.props.dropDraggedItem();
			
			// if (this.previewArea) {
				// this.previewArea.style.height = "0px";
			// }
			// setTimeout(function(){
				// console.log(this);
				// if (this.previewArea) {
					// // console.log(this);
					// this.previewArea.style.display = "none";
				// }
			// }.bind(this));
			// this.setState({ 
				// draggingOver : false
			// });			
		// }
		trace.event && logUngroup();
	},

	/**
	*  Render
	*/
	render: function() {
		return invalidateUponLiquidChange("TodoItem", this, function() {
			trace.render && log("render: TodoItem");
			// 
			// if (this.props.isPreview) {			
				// return (
					// <div className="TodoItem" 
						// style = {{ color : "gray"}}
						// ref= {(element) => { this.todoItem = element; }}>
						// <span ref= {(element) => { this.itemHeadDiv = element; }}>
							// <PropertyField label={"Todo"} object = { this.props.item} propertyName = "name"/>
						// </span>				
					// </div>
				// );				
			// } else {

			// let preview = (this.state.draggingOver) ? <TodoItem key = { draggedItem.const.id + "_dragged"} item = { draggedItem } isPreview = { true }/> : null;
			// let preview = (this.state.draggingOver) ? <div>preview</div> : null;
			// { preview }

			
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
					</div>
				</div>
			);
			// }
		}.bind(this));
		//
	}
}));
