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
	// TODO: `selection` can get out of sync with window selection (e.g. on focus).
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			Doc.pointerRangeFromSelection(edit.selection, prevDoc);
		const cursorPosition =
			Doc.positionFromPointer(pointerRange.start, prevDoc);
		const cursorPointerInNewDoc =
			Doc.pointerFromPosition(cursorPosition, nextDoc);
		const cursorPointerAfterTextInsertion = {
			...cursorPointerInNewDoc,
			offset: cursorPointerInNewDoc.offset + edit.text.length
		};
		const selection = 
			DocSelection.makeCollapsed(cursorPointerAfterTextInsertion);

		return {
			...editor,
			selection
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
	} else {
		console.error("Unhandled edit type:", edit.type);
		return editor;
	}
}

export {
	make,
	applyEdit,
};

