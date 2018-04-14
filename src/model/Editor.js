import * as R from 'ramda';
import * as Edit from './Edit';
import * as Anchor from './Anchor';
import * as Doc from './Doc';
import * as DocSelection from './DocSelection';

const lenses = {
	selection: R.lensProp('selection')
};

const make = (selection) => ({
	selection,
});

// applyEdit :: (Edit, Doc, Editor) -> Editor
function applyEdit(edit, doc, editor) {
	// TODO: `selection` can get out of sync with window selection (e.g. on focus).
	switch (edit.type) {
		case Edit.types.replaceText:
			const anchorRange =
				Doc.anchorRangeFromSelection(edit.selection, doc);

			return R.set(
				lenses.selection,
				DocSelection.makeCollapsed(
					Anchor.offsetBy(
						edit.text.length,
						anchorRange.start)),
				editor);
	}
}

export {
	make,
	applyEdit,
};

