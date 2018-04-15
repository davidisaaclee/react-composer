/*
 * An `EditorCommand` is a representation of a user-triggered action.
 *
 * (An `EditorCommand` only represents user input, and doesn't know
 * about the document or editor state.)
 *
 * TODO: Does this make sense to be separate from `Edit`?
 */

const types = {
	text: 'text',
};

const text = text => ({ type: types.text, text });

// fromKeyEvent :: KeyEvent -> EditorCommand?
function fromKeyEvent(keyEvent) {
	return text(keyEvent.key);
}

export {
	types,
	fromKeyEvent,
};

