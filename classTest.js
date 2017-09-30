

	class Foobar {
		constructor() {
			this.member = 10;
		}
		
		somePrototypeFunctionInClass() {
			this.member = 1000;
		}
	}
	Foobar.prototype.prototypeMember = "fum";
	let FoobarPrototype = Foobar.prototype;
	Foobar.prototype.prototypeFunction = function() {
		return true;
	}

	let x = new Foobar();

	x.decoration = "bar";

	console.log(Object.keys(x));

	for(property in x) {
		console.log(property);
	}




// Foobar.prototype.isPrototype = true;

// // console.log(Foobar);
// console.log(Foobar.prototype);


// let foo = new Foobar();


// foo.addToPrototype();

// // console.log(foo.prototype);
// console.log(Foobar.prototype);

// function className(object) {
	// return Object.getPrototypeOf(object).constructor.name;
// }


// console.log(className(x));

// console.log(x instanceof Foobar);
// console.log(x instanceof FoobarPrototype.constructor);