window.TodoApplication = React.createClass(liquidClassData({
	render: function() {
		trace.render && log("render: TodoApplication");
		return invalidateUponLiquidChange("TodoApplication", this, function() {
			let page = window.page;
			return (
				<div onClick={ function(event) { dropFocus(event);} }>
					<LoginUI page = { page }/>
					<div style = {{ display: "flex", flexDirection: "horizontal"}}>
						<div style = {{ width : "50%"}}>
							<span style = {{border : "1px solid #000"}}>Todo:</span>
							{ (page.session.user === null) ? null : <SortableList list = { page.session.user.todoList } itemViewName = "TodoItem" childrenPropertyName = "subtasks"/> }
						</div>
						<div style = {{ width : "50%"}}>
							<span style = {{border : "1px solid #000"}}>Todo: (plain list)</span>
							{ (page.session.user === null) ? null : <SortableList list = { page.session.user.todoList } itemViewName = "TodoItem"/> }
						</div>
					</div>
				</div>
			);
		}.bind(this));
	}
}));
	
window.TodoItem = React.createClass(liquidClassData({
	render: function() {
		return <PropertyField object = { this.props.item } propertyName = "name"/>
	}
}));