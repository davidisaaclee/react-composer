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
	bold: 'bold',
	italicize: 'italicize',
	addLink: 'addLink',
	backspace: 'backspace',
	del: 'del',
};

const make = (type, fields = {}) => ({ type, ...fields });

// text :: string -> EditorCommand
const text = text => make(types.text, { text });

// paragraphBreak :: EditorCommand
const paragraphBreak = make(types.paragraphBreak);

// bold :: EditorCommand
const bold = make(types.bold);

// italicize :: EditorCommand
const italicize = make(types.italicize);

// addLink :: EditorCommand
const addLink = make(types.addLink);

// backspace :: EditorCommand
const backspace = make(types.backspace);

// del :: EditorCommand
const del = make(types.del);

// fromKeyEvent :: KeyEvent -> EditorCommand?
function fromKeyEvent(keyEvent) {
	function isCharacterKeyPress(evt) {
		// TODO: Check that there are no non-character keys which are 1 long.
		return evt.key.length === 1;
	}

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

	function isCommandKeyEvent(keyEvent) {
		// If the control key or the meta key is held down, assume that
		// the keypress represents intent to perform a command (and not
		// type text).
		return keyEvent.ctrlKey || keyEvent.metaKey;
	}

	function isApplyBoldKeyEvent(keyEvent) {
		// TODO: Switch meta/ctrl based on client?
		return keyEvent.metaKey && keyEvent.key === 'b';
	}

	function isItalicizeKeyEvent(keyEvent) {
		return keyEvent.metaKey && keyEvent.key === 'i';
	}

	function isAddLinkKeyEvent(keyEvent) {
		return keyEvent.metaKey && keyEvent.key === 'k';
	}

	function isBackspaceKeyEvent(keyEvent) {
		return keyEvent.key === 'Backspace';
	}
	
	function isDeleteKeyEvent(keyEvent) {
		return keyEvent.key === 'Delete';
	}

	if (keyEvent.key === 'Enter') {
		return paragraphBreak;
	} else if (isArrowKeyEvent(keyEvent)) {
		return null;
	} else if (isModifierKeyEvent(keyEvent)) {
		return null;
	} else if (isCommandKeyEvent(keyEvent)) {
		if (isApplyBoldKeyEvent(keyEvent)) {
			return bold;
		} else if (isItalicizeKeyEvent(keyEvent)) {
			return italicize;
		} else if (isAddLinkKeyEvent(keyEvent)) {
			return addLink;
		} else {
			return null;
		}
	} else if (isBackspaceKeyEvent(keyEvent)) {
		return backspace;
	} else if (isDeleteKeyEvent(keyEvent)) {
		return del;
	} else if (isCharacterKeyPress(keyEvent)) {
		return text(keyEvent.key);
	} else {
		return null;
	}
}

export {
	types,
	fromKeyEvent,
};

