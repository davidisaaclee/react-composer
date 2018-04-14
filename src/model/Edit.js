
const types = {
	// Either inserting text at a caret (empty `selection`),
	// or replacing a selection of text with new text.
	insertText: 'insertText'
};

// insertText :: (DocSelection, string) -> Edit
const insertText = (selection, text) => ({
	type: types.insertText,
	selection,
	text
});


export {
	types,
	insertText,
};

