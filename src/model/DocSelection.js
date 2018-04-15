// make :: (DocPosition, DocPosition) -> DocSelection
// anchor - where the selection action began
// focus - where the selection action ended
const make = (anchor, focus) => ({ anchor, focus });

// makeCollapsed :: (DocPosition) -> DocSelection
// Creates a selection with equivalent anchor and focus.
const makeCollapsed = (position) => make(position, position);

export {
	make,
	makeCollapsed,
};

