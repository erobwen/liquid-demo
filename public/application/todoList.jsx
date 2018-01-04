window.TodoApplication = React.createClass(liquidClassData({
	render: function() {
		trace.render && log("render: TodoApplication");
		return invalidateUponLiquidChange("TodoApplication", this, function() {
			let page = window.page;
			return (
				<div onClick={ function(event) { dropFocus(event);} }>
					<LoginUI page = { page }/>
					{ (page.session.user === null) ? null : <SortableList list = { page.session.user.todoList } itemViewName = "TodoItem" childrenPropertyName = "subtasks"/> }
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