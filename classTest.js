

class Foobar {
    constructor() {
		this.x = 10;
	}
	
	addToPrototype() {
		Object.getPrototypeOf(this).y = "foo";
	}
}

// Foobar.prototype.isPrototype = true;

// // console.log(Foobar);
// console.log(Foobar.prototype);


// let foo = new Foobar();


// foo.addToPrototype();

// // console.log(foo.prototype);
// console.log(Foobar.prototype);

function className(object) {
	return Object.getPrototypeOf(object).constructor.name;
}


let x = new Foobar();

console.log(className(x));