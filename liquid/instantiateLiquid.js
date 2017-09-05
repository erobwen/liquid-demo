(function(root) {
	// Create one single liquid instance
	root.liquid = root.liquid({usePersistency: false});

	// root.find = liquid.find;

	root.uponChangeDo = liquid.uponChangeDo;
	root.repeatOnChange = liquid.repeatOnChange;
	root.repeat = liquid.repeatOnChange;

	root.create = liquid.create;
}(this));