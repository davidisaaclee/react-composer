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
	paragraphBreak: 'paragraphBreak',
};

const make = (type, fields = {}) => ({ type, ...fields });

// text :: string -> EditorCommand
const text = text => make(types.text, { text });

// paragraphBreak :: EditorCommand
const paragraphBreak = make(types.paragraphBreak);

// fromKeyEvent :: KeyEvent -> EditorCommand?
function fromKeyEvent(keyEvent) {
	if (keyEvent.key === 'Enter') {
		return paragraphBreak;
	} else {
		return text(keyEvent.key);
	}
}

export {
	types,
	fromKeyEvent,
};

