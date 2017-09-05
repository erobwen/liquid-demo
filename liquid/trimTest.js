
let strings = ["liquid", "./liquid.js", "liquid.js", "c:/foo/bar/liquid.js"];

function trim(string) {
	let withoutPath = string.replace(/^.*[\\\/]/, '');
	let withoutSuffix = withoutPath.replace(/\.\w*/, '');
	console.log(withoutSuffix);
}

strings.forEach(trim);


function trim2(string) {
	let withoutSuffix = string.replace(/^.*[\\\/]/, '').replace(/\.\w*/, '');
	console.log(withoutSuffix);
	return withoutSuffix;
}

