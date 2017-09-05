// A simple implementation of require that simply strips down the requested module 
// to the bare name (without path or file suffix), and then simply tries to find
// the module in the root scope. This will only work if all modules needed are 
// loaded in the right order
(function(root) {
	if (typeof(root.require) === 'undefined') {
		root.require = function(moduleName) {
			return root[moduleName.replace(/^.*[\\\/]/, '').replace(/\.\w*/, '')];
		}			
	}
}(this));