import Doc from 'model/Doc';

// make :: (Doc.Position, Doc.Position) -> DocSelection Doc.Position
// anchor - where the selection action began
// focus - where the selection action ended
const make = (anchor, focus) => ({ anchor, focus });

// makeCollapsed :: (Doc.Position) -> DocSelection Doc.Position
// Creates a selection with equivalent anchor and focus.
const makeCollapsed = (pointer) => make(pointer, pointer);


// isCollapsed :: DocSelection Doc.Position -> boolean
function isCollapsed(selection) {
	return Doc.positionEqual(selection.anchor, selection.focus);
}

// equals :: (DocSelection OSD.Position, DocSelection OSD.Position) -> boolean
function equals(s1, s2) {
	if (s1 == null || s2 == null) {
		return s1 === s2;
	}

	return Doc.positionEqual(s1.anchor, s2.anchor)
		&& Doc.positionEqual(s1.focus, s2.focus);
}

export {
	make,
	makeCollapsed,
	isCollapsed,
	equals,
};

