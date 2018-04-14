import * as R from 'ramda';
import * as Edit from './Edit';
import * as Anchor from './Anchor';
import * as DocSelection from './DocSelection';

const lenses = {
	selection: R.lensProp('selection')
};

const make = (selection) => ({
	selection,
});

// applyingEdit :: (Edit, Editor) -> Editor
function applyingEdit(edit, editor) {
	// TODO: `selection` can get out of sync with window selection (e.g. on focus).
	switch (edit.type) {
		case Edit.types.replaceText:
			// TODO: Using the `anchor` here is wrong - should use the 
			// start of the selection.
			return R.set(
				lenses.selection,
				DocSelection.makeCollapsed(
					Anchor.offsetBy(
						edit.text.length,
						edit.selection.anchor)),
				editor);
	}
}

export {
	make,
	applyingEdit,
};

