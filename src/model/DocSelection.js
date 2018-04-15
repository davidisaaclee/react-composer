// make :: (DocPointer, DocPointer) -> DocSelection
// anchor - where the selection action began
// focus - where the selection action ended
const make = (anchor, focus) => ({ anchor, focus });

// makeCollapsed :: (DocPointer) -> DocSelection
// Creates a selection with equivalent anchor and focus.
const makeCollapsed = (pointer) => make(pointer, pointer);

export {
	make,
	makeCollapsed,
};

