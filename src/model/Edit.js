
/*
 * An `Edit` represents the intent to mutate the document.
 */

const types = {
	// Either inserting text at a caret (empty `selection`),
	// or replacing a selection of text with new text.
	replaceText: 'replaceText',

	replaceTextWithParagraphBreak: 'replaceTextWithParagraphBreak',

	backspace: 'backspace',

	del: 'del',

	applyStyles: 'applyStyles',

	toggleBold: 'toggleBold',

	toggleItalic: 'toggleItalic',

	addLink: 'addLink',
};

// replaceText :: (DocSelection Doc.Position, string, StyleSet) -> Edit
const replaceText = (selection, text, styles) => ({
	type: types.replaceText,
	selection,
	text,
	styles,
});

// replaceTextWithParagraphBreak :: (DocSelection Doc.Position) -> Edit
const replaceTextWithParagraphBreak = (selection) => ({
	type: types.replaceTextWithParagraphBreak,
	selection,
});


// applyStyles :: (DocSelection Doc.Position, StyleSet) -> Edit
const applyStyles = (selection, styles) => ({
	type: types.applyStyles,
	selection,
	styles
});

// toggleBold :: (DocSelection Doc.Position) -> Edit
const toggleBold = (selection) => ({
	type: types.toggleBold,
	selection
});

// toggleItalic :: (DocSelection Doc.Position) -> Edit
const toggleItalic = (selection) => ({
	type: types.toggleItalic,
	selection
});

// addLink :: (DocSelection Doc.Position, string) -> Edit
const addLink = (selection, url) => ({
	type: types.addLink,
	selection,
	url
});

// backspace :: (DocSelection Doc.Position) -> Edit
const backspace = (selection, url) => ({
	type: types.backspace,
	selection,
});

// del :: (DocSelection Doc.Position) -> Edit
const del = (selection, url) => ({
	type: types.del,
	selection,
});

export {
	types,
	replaceText,
	replaceTextWithParagraphBreak,
	applyStyles,
	toggleBold,
	toggleItalic,
	addLink,
	backspace,
	del,
};

