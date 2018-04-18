
/*
 * An `Edit` represents the intent to mutate the document.
 */

const types = {
	// Either inserting text at a caret (empty `selection`),
	// or replacing a selection of text with new text.
	replaceText: 'replaceText',

	replaceTextWithParagraphBreak: 'replaceTextWithParagraphBreak',
};

// replaceText :: (DocSelection Doc.Pointer, string) -> Edit
const replaceText = (selection, text) => ({
	type: types.replaceText,
	selection,
	text
});

// replaceTextWithParagraphBreak :: (DocSelection Doc.Pointer) -> Edit
const replaceTextWithParagraphBreak = (selection) => ({
	type: types.replaceTextWithParagraphBreak,
	selection,
});


export {
	types,
	replaceText,
	replaceTextWithParagraphBreak,
};

