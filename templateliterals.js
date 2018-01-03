


	// Start the entire UI
	function setupLiquidInterface(htmlRoot, componentName, data) {
		let component = liquid.create(componentName, data);
		component.domElement = htmlRoot;
		component.renderAndUpdate();
	}

	// Converter
	function htmlToElement(html) {
		var template = document.createElement('template');
		template.innerHTML = html;
		return template.content.firstChild;
	}
	
	// Create a component (if necessary) and return its html
	function component(componentName, data) {
		// Make sure that the component exists and has a domElement
		let component = liquid.create(componentName, data);
		if (typeof(component.const.domElement) === 'undefined') {
			component.renderAndUpdate();
		}
		
		// Setup child components (to be used when replacing placeholders)
		currentRenderComponent.const.subComponents[component.const.id] = component;
		
		// Return placeholder
		return `<div component_id = ${ component.const.id }></div>`;
	}


	// Dirty components
	let componentsInNeedOfReRender = [];

	let currentRenderComponent = null;
	
	// Component base class
	class Component{
		initialize(data) {
			// delete this.const.html;
			this.context = {};
			this.const.subComponents = {};
		}
		
		renderAndUpdate() {
			let parentComponent = currentRenderComponent; // recursion support
			currentRenderComponent = null;
			
			let virtualHtml;
			liquid.uponChangeDo(
				function() {
					liquid.reCreate(this.context, () => {			
						virtualHtml = render();
					});			
				},
				function(){ 
					componentsInNeedOfReRender.push(this); 
				});
			if (typeof(this.const.domElement) === 'undefined') {
				// Create a new root
				document.createElement()
				this.const.domElement = htmlToElement(virtualHtml);
				this.const.domElement.component_id = this.const.id; // Stamp it!
			} else {
				// Reuse existing root
				mergeElementsAndReplacePlaceholders(this.const.domElement, htmlToElement(virtualHtml);
			}
			
			currentRenderComponent = parentComponent;
		}
		
		render() {
			throw new Error("Not implemented yet!");
		}
	}

	// Merge changes from source html to target html. Descend recursivley but stop at any element that has a component_id assigned.
	function mergeElementsAndReplacePlaceholders(target, source) {
		// TODO
	}

	/**
	* Component classes
	*/
	class RootComponent {
		initialize(data) {
			this.name = data.name;
		}
		
		render() {
			return html`<div>Some thing ${ component('MyComponent', { name : "kalle"})}</div>`
		}
	}

	class MyComponent {
		initialize(data) {
			this.name = data.name;
		}
		
		render() {
			return html`<div>Name  ${ component('MyComponent', { name : "kalle"})}</div>`
		}
	}

	

	window.RootComponent = RootComponent;
	window.MyComponent = MyComponent;