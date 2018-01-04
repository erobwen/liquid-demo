

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

// Key iteration: (non inherited properties only...)
console.log("key iteration");
console.log(Object.keys(x));

// For iteration... 
console.log("for iteration"); 
for(property in x) {
	console.log(property);
}




	
// let i;
// let dummy;

	// console.time("instanceof");
	// i = 1;
	// while (i++ < 10000000) {
		// dummy = x instanceof Foobar;
	// }
	// console.timeEnd("instanceof");
		
	// console.time("member check");
	// i = 1;
	// while (i++ < 10000000) {
		// dummy = typeof(x.decoration) !== 'undefined';
	// }
	// console.timeEnd("member check");

	// console.time("member check inherited");
	// i = 1;
	// while (i++ < 10000000) {
		// dummy = typeof(x.prototypeFunction) !== 'undefined';
	// }
	// console.timeEnd("member check inherited");

	
	
	
	
	
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