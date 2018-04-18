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
	moveFocus: 'moveFocus',
};

const make = (type, fields = {}) => ({ type, ...fields });

// text :: string -> EditorCommand
const text = text => make(types.text, { text });

// paragraphBreak :: EditorCommand
const paragraphBreak = make(types.paragraphBreak);

// moveFocus :: EditorCommand
const moveFocus = make(types.moveFocus);

// fromKeyEvent :: KeyEvent -> EditorCommand?
function fromKeyEvent(keyEvent) {
	function isArrowKeyEvent(keyEvent) {
		const arrowKeys = {
			'ArrowLeft': true,
			'ArrowRight': true,
			'ArrowUp': true,
			'ArrowDown': true,
		};

		return arrowKeys[keyEvent.key];
	}

	function isModifierKeyEvent(keyEvent) {
		const modifierKeys = {
			'Shift': true,
			'Control': true,
			'Meta': true,
			'Alt': true,
		};

		return modifierKeys[keyEvent.key];
	}

	if (keyEvent.key === 'Enter') {
		return paragraphBreak;
	} else if (isArrowKeyEvent(keyEvent)) {
		return moveFocus;
	} else if (isModifierKeyEvent(keyEvent)) {
		return null;
	} else {
		return text(keyEvent.key);
	}
}

export {
	types,
	fromKeyEvent,
};

