
const types = {
	// Either inserting text at a caret (empty `selection`),
	// or replacing a selection of text with new text.
	replaceText: 'replaceText',

	replaceTextWithParagraphBreak: 'replaceTextWithParagraphBreak',
};

// replaceText :: (DocSelection, string) -> Edit
const replaceText = (selection, text) => ({
	type: types.replaceText,
	selection,
	text
});

// replaceTextWithParagraphBreak :: (DocSelection) -> Edit
const replaceTextWithParagraphBreak = (selection) => ({
	type: types.replaceTextWithParagraphBreak,
	selection,
});


export {
	types,
	replaceText,
	replaceTextWithParagraphBreak,
};

