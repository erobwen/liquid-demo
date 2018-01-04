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




window.LoginUI = React.createClass(liquidClassData({
	getInitialState: function() {
		return {name: "Walter", password: "liquid"};
	},

	nameChanged: function(event) {
		this.setState({name : event.target.value});
	},

	passwordChanged: function(event) {
		this.setState({password : event.target.value});
	},

	tryLogin : function() {
		page.service.tryLogin(this.state.name, this.state.password);
	},
	
	logout : function() {
		page.service.logout();
	},
	
	render : function() {
		trace.render && log("render: LoginUI");
		return invalidateUponLiquidChange("LoginUI", this, function() {
			var page = this.props.page; // same as window.page
			var user = page.getActiveUser();
			if (user === null) {
				return (
					<div style={{display: 'flex', flexDirection: 'column', border: '1px', margin: '1em', padding: '1em'}}>
						<span>Username: </span><input ref="usernameInput" type="text" value={ this.state.name }  onChange={ this.nameChanged }></input>
						<span>Password: </span><input ref="passwordInput" type="password" value={ this.state.password } onChange={ this.passwordChanged }></input>
						<button onClick={ this.tryLogin } >Login</button>
					</div>
				);
			} else {
				return (
					<div style={{display: 'flex', 'flexDirection': 'column', border: '1px', margin: '1em', padding: '1em'}}>
						<span>Logged in as <PropertyField object = { user } propertyName = "name"/></span>
						<button onClick={ this.logout } >Logout</button>
					</div>
				);
			}
		}.bind(this));
	}
}));


window.PropertyField = React.createClass(liquidClassData({
	getInitialState: function() {
		return { focused : false };
	},
	clickOnName: function(event) {
		logGroup("clickOnName:");
		focusComponent(this);
		event.stopPropagation();
		logUngroup();
	},
	clickOnField: function(event) {
		logGroup("clickOnField:");
		event.stopPropagation();
		return false;
		logUngroup();
	},
	propertyChanged: function(event) {
		this.props.object[this.props.propertyName] = event.target.value;
	},	
	render: function() {
		trace.render && logGroup("render: PropertyField");
		let element = invalidateUponLiquidChange("PropertyField", this, function() {
			var labelString = (typeof(this.props.label) !== 'undefined' && this.props.label !== null) ? (this.props.label + ": ") : "";
			if (this.state.focused) {
				return (
					<span className="PropertyField" onClick={ this.clickOnField } style={{marginBottom: '1em'}}>
						<span className="propertyContents">{ labelString }<input type="text" value={this.props.object[this.props.propertyName]} onChange={ this.propertyChanged } /></span>
					</span>
				);
			} else {
				return (
					<span className="PropertyField"  onClick={ this.clickOnName } style={{marginBottom: '1em'}}>
						<span className="propertyContents">{ labelString }{this.props.object[this.props.propertyName]}</span>
					</span>
				);
			}
		}.bind(this));
		trace.render && logUngroup();
		return element;
	}
}));

let draggedItem = null;
let draggedHtml = null;
let leftEdgeOffset = 0;

let currentDivider = null;
let currentDividerIndex = null;

window.SortableList = React.createClass(liquidClassData({
	getInitialState: function() {
		return { draggingOver: false };
	},

	clearAllDividers : function() {
		if (currentDivider) {
			currentDivider = null;
			currentDividerIndex = null;			
		}
		if (draggedItem) {
			draggedItem = null;
			draggedHtml = null;
			leftEdgeOffset = 0;
		}	
		this.dividers.forEach((divider) => {
			this.clearDivider(divider);
		});		
	},
	
	onDragEnterDivider : function(event) {
		event.preventDefault();
	},
	
	onDragOverDivider : function(event) {
		event.preventDefault();
	},
	
	onDragExitDivider : function(event) {
		event.preventDefault();
	},
	
	onDragLeaveDivider : function(event) {
		event.preventDefault();
	},
	
	onDropDivider : function(event) {
		trace.event && logGroup("onDropDivider:");
		event.preventDefault();
		this.dropDraggedItem();
		trace.event && logUngroup();
	},

	clearDivider : function(divider) {
		trace.event && log("...clear divider: " + currentDividerIndex);
		divider.style.display = "none";
		delete divider.style.height;
		divider.innerHTML = "";
	},
	
	softCloseDivider : function(divider) {
		trace.event && log("...soft close divider: " + currentDividerIndex);
		divider.style.height = divider.clientHeight + "px";
		divider.innerHTML = "";
		divider.style.height = "0px";		
	},
	
	openDivider : function(divider) {
		trace.event && log("...open divider... " + currentDividerIndex);
		divider.style.display = "block";
		divider.style.height = "0px";
		divider.innerHTML = "";
		divider.appendChild(draggedHtml);
		divider.style.height = divider.scrollHeight + "px";
	},
	
	previewBefore : function(itemIndex) {
		trace.event && log("...preview before" + this.props.list[itemIndex].name);
		let newDividerIndex = itemIndex;
		let newDivider = this.dividers[newDividerIndex];
		this.previewAtDivider(newDivider, newDividerIndex); 
	}, 

	previewAfter : function(itemIndex) {
		trace.event && log("...preview after " + this.props.list[itemIndex].name);
		let newDividerIndex = itemIndex + 1;
		let newDivider = this.dividers[newDividerIndex];
		this.previewAtDivider(newDivider, newDividerIndex); 
	},

	previewAtDivider(newDivider, newDividerIndex) {
		if (currentDivider !== newDivider) {
			trace.event && log("preview at index: " + newDividerIndex);			
			if (currentDivider !== null) {
				this.softCloseDivider(currentDivider);
			}
			currentDividerIndex = newDividerIndex;
			currentDivider = newDivider;
			this.openDivider(currentDivider);
		}		
	},
	
	abortDragging : function() {
		this.clearAllDividers();		
	},
	
	dropDraggedItem : function() {
		// Remember where to drop
		let referenceIndex = currentDividerIndex - 1;
		let referenceItem = this.props.list[currentDividerIndex - 1];
		let item = draggedItem;
		
		// Clean all
		this.clearAllDividers();	

		// Drop
		liquid.pulse(() => {
			removeFromList(this.props.list, item);
			addAfterInList(this.props.list, referenceItem, item);			
		});
	},


	sortableListItems : function() {
		let list = this.props.list;
		var result = [];
		if (list.length > 0) {
			result.push(<div draggable = "true"
							onDragEnter = { this.onDragEnterDivider }
							onDragOver = { this.onDragOverDivider }
							onDragExit = { this.onDragExitDivider }
							onDragLeave = { this.onDragLeaveDivider }
							onDrop = { this.onDropDivider }
							ref = {(element) => { if (element !== null) this.dividers.push(element); }}
							key = { this.dividersCount++ } 
							style = {{display : "none", transition: "height .5s"}}>
						</div>); 
			let index = 0;
			list.forEach(function(item) {
				result.push(
					<SortableListItem 
						key = { "itemId" + item.const.id }
						itemViewName = { this.props.itemViewName }
						item = { item }
						itemIndex = { index++ }
						dropDraggedItem = { this.dropDraggedItem }
						abortDragging = { this.abortDragging }
						previewAfter = { this.previewAfter }
						previewBefore = { this.previewBefore }
					/>
				);
				result.push(<div draggable = "true"
								onDragEnter = { this.onDragEnterDivider }
								onDragOver = { this.onDragOverDivider }
								onDragExit = { this.onDragExitDivider }
								onDragLeave = { this.onDragLeaveDivider }
								onDrop = { this.onDropDivider }
								ref= {(element) => { if (element !== null) this.dividers.push(element); }}
								key = { this.dividersCount++ } 
								style = {{display : "none", transition: "height .5s"}}>
							</div>); 
			}.bind(this));			
		}
		return result;
	},
	
	render: function() {
		return invalidateUponLiquidChange("SortableList", this, function() {
			trace.render && log("render: SortableList");
			this.dividers = [];
			this.dividersCount = 0;
			let result = (
				<div className="SortableList">
					{ (() => { return this.sortableListItems(); })() }
				</div>
			);
			return result;
		}.bind(this));
	}
}));


window.SortableListItem = React.createClass(liquidClassData({
	getInitialState: function() { 
		return {}; 
	},

	getItemViewElement() {
		// if (typeof(this.itemHeadDiv) !== 'undefined') {
			// let propertyContents = this.itemHeadDiv.getElementsByClassName('propertyContents');
			// return propertyContents[0];
		// } else {
			// window.errorDiv = this.itemHeadDiv;
			// throw new Error("could not find property field... ");
		// }
	},
	
	/**
	*  Dragging this todoItem
	*/	
	onDragStart: function(event) {
		trace.event && logGroup("onDragStart:" + this.props.item.name);
		// let headPropertyField = this.getItemViewElement();
		// window.headPropertyField = headPropertyField;
		// leftEdgeOffset = (event.screenX - headPropertyField.offsetLeft);
		
		function clearIds(html) {
			if (typeof(html.removeAttribute) === 'function') html.removeAttribute("data-reactid");
			html.childNodes.forEach((child) => {
				clearIds(child);
			});
		}
		
		draggedItem = this.props.item;
		draggedHtml = this.itemHeadDiv.cloneNode(true);
		clearIds(draggedHtml);
		draggedHtml.style.opacity = 0.5;
		this.todoItem.style.height = this.todoItem.clientHeight + "px";
		setTimeout(function(){
			trace.event && logGroup("onDragStart:" + this.props.item.name + " , set height of dragged to 0... ");
			this.todoItem.style.transform = "translateX(-9999px)";
			this.todoItem.style.height = "0px";
			trace.event && logUngroup();
		}.bind(this));
		trace.event && logUngroup();
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
				this.props.previewAfter(this.props.itemIndex);
			}
		}
		trace.event && logUngroup();
	},
	
	onDragLeave: function(event) {
		trace.event && logGroup("onDragLeave:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
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
		trace.event && logGroup("onDragOver:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		if (this.props.item !== draggedItem) {			
			let yWithinField = event.pageY - this.todoItem.offsetTop;
			let mouseOverTopPart = yWithinField <= this.todoItem.scrollHeight / 2;
			
			if (mouseOverTopPart) {
				this.props.previewBefore(this.props.itemIndex);
			} else {
				this.props.previewAfter(this.props.itemIndex);
			}
		}
		trace.event && logUngroup();
	},

	onDrop: function(event) {
		trace.event && logGroup("onDrop:" + this.props.item.name + ", " + this.dragEnterCounter);
		event.preventDefault();
		this.dragEnterCounter = 0;
		this.props.dropDraggedItem();
		trace.event && logUngroup();
	},

	/**
	*  Render
	*/
	render: function() {
		return invalidateUponLiquidChange("SortableListItem", this, function() {
			trace.render && log("render: SortableListItem");

			let itemView = React.createElement(window[this.props.itemViewName], { item : this.props.item });
			
			return (
				<div className="SortableListItem" 
					ref = {(element) => { this.todoItem = element; }}
					style = {{ 
						display : 'block', 
						transition : 'height .5s',
						height : 'auto',
						overflow : 'hidden'
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
						{ itemView }
					</span>				
				</div>
			);
		}.bind(this));
	}
}));

