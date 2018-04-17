import * as R from 'ramda';
import UUID from 'uuid';
import Paragraph from 'model/Paragraph';
import * as Edit from 'model/Edit';
import * as Range from 'model/Range';

import OSD from 'utility/OrderedSubdivisibleDictionary';

// Doc ::= OrderedSubdivisibleDictionary ParagraphID Paragraph
const Doc = OSD({
	count: Paragraph.characterCount,

	containsIndex: (index, p) => index >= 0 && index < Paragraph.characterCount(p),
	
	// TODO: better implementation of slice, merge
	slice: (start, end, p) => Paragraph.push(
		UUID(),
		Paragraph.plainTextContent(Paragraph.toValuesList(p)[0].text.slice(start, end)),
		Paragraph.empty),

	merge: R.pipe(Paragraph.merge, Paragraph.defragment),
});


const make = (order, all) => Doc.fromArray(order.map(k => all[k]));
const empty = make([], {});


// pointerRangeFromSelection :: (DocSelection Doc.Pointer, Doc) -> Range OSD.Position
function pointerRangeFromSelection(selection, doc) {
	const [start, end] =
		Doc.sortPointersAscending(
			[selection.anchor, selection.focus],
			doc);

	return Range.make(start, end);
}

// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);

		return R.pipe(
			Doc.removeSlice(
				Doc.positionFromPointer(pointerRange.start, doc),
				Doc.positionFromPointer(pointerRange.end, doc)),
			Doc.update(
				pointerRange.start.key,
				paragraph => Paragraph.insertContent(
					Paragraph.plainTextContent(edit.text),
					pointerRange.start.offset,
					paragraph)),
			Doc.update(
				pointerRange.start.key,
				Paragraph.defragment),
		)(doc);
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);
		const splitPosition =
			Doc.positionFromPointer(
				Doc.makePointer(
					pointerRange.start.paragraphID,
					pointerRange.start.offset),
				doc); 

		return R.pipe(
			Doc.removeSlice(
				Doc.positionFromPointer(pointerRange.start, doc),
				Doc.positionFromPointer(pointerRange.end, doc)),
			Doc.splitElement(
				splitPosition,
				UUID(),
				UUID())
		)(doc);
	} else {
		console.error("Unhandled edit type:", edit.type);
		return doc;
	}
}

export default {
	...Doc,
	applyEdit,
	pointerRangeFromSelection,
};

