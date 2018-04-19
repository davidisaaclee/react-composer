// make :: (a, a) -> DocSelection a
// anchor - where the selection action began
// focus - where the selection action ended
const make = (anchor, focus) => ({ anchor, focus });

// makeCollapsed :: (a) -> DocSelection a
// Creates a selection with equivalent anchor and focus.
const makeCollapsed = (pointer) => make(pointer, pointer);


// isCollapsed :: DocSelection OSD.Position -> boolean
function isCollapsed(selection) {
	return selection.anchor.index === selection.focus.index
		&& selection.anchor.offset === selection.focus.offset;
}

export {
	make,
	makeCollapsed,
	isCollapsed
};

