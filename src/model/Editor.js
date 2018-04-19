import * as R from 'ramda';
import * as Edit from 'model/Edit';
import * as DocSelection from 'model/DocSelection';
import Doc from 'model/Doc';

// make :: DocSelection Doc.Position -> Editor
const make = (selection) => ({
	selection,
});

// applyEdit :: (Edit, Doc, Doc, Editor) -> Editor
function applyEdit(edit, prevDoc, nextDoc, editor) {
	if (edit.type === Edit.types.replaceText) {
		if (Doc.count(nextDoc) === 0) {
			return { ...editor, selection: null }
		}

		const { selection, text } = edit;

		const previousCursorPosition = selection == null
			? Doc.makePosition(0, 0)
			: Doc.positionFromPointer(
				Doc.pointerRangeFromSelection(selection, prevDoc).start,
				prevDoc);
		const nextCursorPosition = {
			...previousCursorPosition,
			offset: previousCursorPosition.offset + text.length
		};
		const newSelection = 
			DocSelection.makeCollapsed(nextCursorPosition);

		return {
			...editor,
			selection: newSelection
		};
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		// TODO: Add support for paragraph breaks again.
		return editor;

		const pointerRange =
			Doc.pointerRangeFromSelection(edit.selection, prevDoc);

		const newParagraphIndex =
			Doc.indexOf(pointerRange.start.paragraphID, prevDoc) + 1;
		const cursorPosition =
			Doc.makePosition(newParagraphIndex, 0);
		const selection = 
			DocSelection.makeCollapsed(cursorPosition);

		return {
			...editor,
			selection
		};
	} else if (edit.type === Edit.types.backspace) {
		if (Doc.count(nextDoc) === 0) {
			return { ...editor, selection: null }
		}

		const { selection } = edit;

		const nextCursorPosition = DocSelection.isCollapsed(selection)
			? Doc.previousPosition(selection.anchor, prevDoc)
			: Doc.positionFromPointer(
				Doc.pointerRangeFromSelection(selection, prevDoc).start,
				prevDoc);

		return {
			...editor,
			selection: DocSelection.makeCollapsed(nextCursorPosition)
		};
	} else if (
		edit.type === Edit.types.toggleBold 
		|| edit.type === Edit.types.toggleItalic 
		|| edit.type === Edit.types.addLink 
		|| edit.type == Edit.types.applyStyles
	) {
		// For all of these style application edits,
		// just retain the selection.
		const { selection } = edit;
		return {
			...editor,
			selection
		};
	} else {
		return editor;
	}
}

export {
	make,
	applyEdit,
};

