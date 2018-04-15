import * as R from 'ramda';
import * as Edit from './Edit';
import * as DocPointer from './DocPointer';
import * as Doc from './Doc';
import * as DocSelection from './DocSelection';

const lenses = {
	selection: R.lensProp('selection')
};

// make :: DocSelection -> Editor
const make = (selection) => ({
	selection,
});

// applyEdit :: (Edit, Doc, Doc, Editor) -> Editor
function applyEdit(edit, prevDoc, nextDoc, editor) {
	// TODO: `selection` can get out of sync with window selection (e.g. on focus).
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			Doc.pointerRangeFromSelection(edit.selection, prevDoc);

		return R.set(
			lenses.selection,
			DocSelection.makeCollapsed(
				DocPointer.offsetBy(
					edit.text.length,
					pointerRange.start)),
			editor);
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const pointerRange =
			Doc.pointerRangeFromSelection(edit.selection, prevDoc);

		const newParagraphIndex =
			Doc.indexOfParagraph(pointerRange.start.paragraphID, prevDoc) + 1;
		const newParagraphID =
			R.pipe(
				R.view(Doc.lenses.paragraphOrder),
				R.nth(newParagraphIndex)
			)(nextDoc);

		const cursorPosition =
			DocPointer.make(newParagraphID, 0);

		return R.set(
			lenses.selection,
			DocSelection.makeCollapsed(cursorPosition),
			editor);
	} else {
		console.error("Unhandled edit type:", edit.type);
		return editor;
	}
}

export {
	make,
	applyEdit,
};

