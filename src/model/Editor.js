import * as R from 'ramda';
import * as Edit from 'model/Edit';
import * as DocSelection from 'model/DocSelection';
import Doc from 'model/Doc';

// make :: DocSelection Pointer -> Editor
// where Pointer ::= { key: string, offset: number }
const make = (selection) => ({
	selection,
});

// applyEdit :: (Edit, Doc, Doc, Editor) -> Editor
function applyEdit(edit, prevDoc, nextDoc, editor) {
	if (edit.type === Edit.types.replaceText) {
		const { selection, text } = edit;

		const previousCursorPosition = selection == null
			? Doc.makePosition(0, 0)
			: Doc.positionFromPointer(
				Doc.pointerRangeFromSelection(selection, prevDoc).start,
				prevDoc);
		const previousCursorPositionInNewDoc =
			Doc.pointerFromPosition(previousCursorPosition, nextDoc);
		const cursorPointerAfterTextInsertion = {
			...previousCursorPositionInNewDoc,
			offset: previousCursorPositionInNewDoc.offset + text.length
		};
		const newSelection = 
			DocSelection.makeCollapsed(cursorPointerAfterTextInsertion);

		return {
			...editor,
			selection: newSelection
		};
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const pointerRange =
			Doc.pointerRangeFromSelection(edit.selection, prevDoc);

		const newParagraphIndex =
			Doc.indexOf(pointerRange.start.paragraphID, prevDoc) + 1;
		const newParagraphID =
			Doc.keyAtIndex(newParagraphIndex, nextDoc);

		const cursorPosition =
			Doc.makePointer(newParagraphID, 0);
		const selection = 
			DocSelection.makeCollapsed(cursorPosition);

		return {
			...editor,
			selection
		};
	} else if (edit.type === Edit.types.backspace) {
		const { selection } = edit;

		const nextCursorPosition = Doc.positionFromPointer(
			DocSelection.isCollapsed(selection)
			? Doc.previousPointer(selection.anchor, prevDoc)
			: Doc.pointerRangeFromSelection(selection, prevDoc).start,
			prevDoc);

		const cursorPointer = Doc.pointerFromPosition(
			nextCursorPosition,
			nextDoc);

		return {
			...editor,
			selection: DocSelection.makeCollapsed(cursorPointer)
		};
	} else {
		return editor;
	}
}

export {
	make,
	applyEdit,
};

