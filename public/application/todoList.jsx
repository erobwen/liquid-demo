
window.TodoList = React.createClass(liquidClassData({	
	getInitialState: function() {
		return { state : create({}) };
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


var draggedCategory = null;
window.TodoItem = React.createClass(liquidClassData({
	getInitialState: function() {
		return { };
	},

	render: function() {
		return invalidateUponLiquidChange("TodoItem", this, function() {
			trace.ui && log("render: TodoItem");
			return (
				<div className="TodoItem">
					<span>
						<PropertyField label={"Todo"} object = { this.props.item} propertyName = "name"/>
					</span>				
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
			 
// var draggedCategory = null;
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
		// draggedCategory = this.props.item;
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
			// if (item.writeable() && item.canAddSubCategory(draggedCategory)) {
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
			// if (item.writeable() && item.canAddSubCategory(draggedCategory)) {
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
		// var droppedCategory = draggedCategory;
		// draggedCategory = null;
		// if (item.writeable() && item.canAddSubCategory(droppedCategory)) {
			// liquid.pulse(function() {
				// // trace.ui && log(droppedCategory.parents.length);
				// // trace.ui && log(droppedCategory.parents);
				// // var parents = copyArray(droppedCategory.parents);
				// droppedCategory.parents.forEach(function(parentCategory) {
					// // trace.ui && log("Dropping parent: " + parentCategory.__());
					// parentCategory.subCategories.remove(droppedCategory);
				// });
				// item.subCategories.add(droppedCategory);	
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