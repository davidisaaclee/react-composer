// make :: (Anchor, Anchor) -> DocSelection
// anchor - where the selection action began
// focus - where the selection action ended
const make = (anchor, focus) => ({ anchor, focus });

// makeCollapsed :: (Anchor) -> DocSelection
// Creates a selection with equivalent anchor and focus.
const makeCollapsed = (anchor) => make(anchor, anchor);

export {
	make,
	makeCollapsed,
};

