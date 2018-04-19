
/*
 * An `Edit` represents the intent to mutate the document.
 */

const types = {
	// Either inserting text at a caret (empty `selection`),
	// or replacing a selection of text with new text.
	replaceText: 'replaceText',

	replaceTextWithParagraphBreak: 'replaceTextWithParagraphBreak',

	applyStyles: 'applyStyles',

	toggleBold: 'toggleBold',

	toggleItalic: 'toggleItalic',

	addLink: 'addLink',
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

// applyStyles :: (DocSelection Doc.Pointer, StyleSet) -> Edit
const applyStyles = (selection, styles) => ({
	type: types.applyStyles,
	selection,
	styles
});

// toggleBold :: (DocSelection Doc.Pointer) -> Edit
const toggleBold = (selection) => ({
	type: types.toggleBold,
	selection
});

// toggleItalic :: (DocSelection Doc.Pointer) -> Edit
const toggleItalic = (selection) => ({
	type: types.toggleItalic,
	selection
});

// addLink :: (DocSelection Doc.Pointer, string) -> Edit
const addLink = (selection, url) => ({
	type: types.addLink,
	selection,
	url
});

export {
	types,
	replaceText,
	replaceTextWithParagraphBreak,
	applyStyles,
	toggleBold,
	toggleItalic,
	addLink,
};

