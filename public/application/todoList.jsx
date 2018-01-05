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
							<div>Tree view:</div>
							{ (page.session.user === null) ? null : <SortableList list = { page.session.user.todoList } itemViewName = "TodoItem" childrenPropertyName = "subtasks"/> }
						</div>
						<div style = {{ width : "50%"}}>
							<div>List view:</div>
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
		return <PropertyField label={"Todo"} object = { this.props.item } propertyName = "name"/>
	}
}));