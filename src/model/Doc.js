import * as R from 'ramda';
import UUID from 'uuid';
import Paragraph from 'model/Paragraph';
import * as Content from 'model/Content';
import * as Edit from 'model/Edit';
import * as Range from 'model/Range';

import OSD from 'utility/OrderedSubdivisibleDictionary';

// Doc ::= OrderedSubdivisibleDictionary ParagraphID Paragraph
const Doc = OSD({
	count: Paragraph.characterCount,

	containsIndex: (index, p) => index >= 0 && index < Paragraph.characterCount(p),

	slice: (start, end, paragraph) => Paragraph.sliceBySubelements(
		Paragraph.positionFromAbsoluteOffset(start, paragraph),
		Paragraph.positionFromAbsoluteOffset(end, paragraph),
		paragraph),

	removeSlice: (startOffset, endOffset, paragraph) => Paragraph.removeSliceAtSubelement(
		Paragraph.positionFromAbsoluteOffset(startOffset, paragraph),
		Paragraph.positionFromAbsoluteOffset(endOffset, paragraph),
		paragraph),
});


// pointerRangeFromSelection :: (DocSelection Doc.Pointer, Doc) -> Range Doc.Pointer
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

		const positionRange = Range.make(
			Doc.positionFromPointer(pointerRange.start, doc),
			Doc.positionFromPointer(pointerRange.end, doc));

		function stylesAtPointer(pointer, doc) {
			const paragraph = Doc.get(pointer.key, doc);
			const positionInParagraph = Paragraph.positionFromAbsoluteOffset(pointer.offset, paragraph);
			const content = Paragraph.nth(
				positionInParagraph.index,
				paragraph);
			return content.styles;
		}

		function stitchBookendsIfNeeded(doc) {
			if (pointerRange.start.key === pointerRange.end.key) {
				return doc;
			}

			return Doc.mergeElements(
				positionRange.start.index,
				2,
				([before, after]) => ({
					key: before.key,
					value: Paragraph.merge(before.value, after.value),
				}),
				doc)
		}

		return R.pipe(
			// Remove the selected slice.
			Doc.removeSliceAtSubelement(
				positionRange.start,
				positionRange.end),
			// If the selection we just removed spanned multiple paragraphs,
			// removeSliceAtSubelement did not attempt to merge the bookending paragraphs.
			// We need to stitch those together now.
			stitchBookendsIfNeeded,
			// Insert the text that is replacing the selection.
			Doc.update(
				pointerRange.start.key,
				paragraph => Paragraph.insertContent(
					Content.make(edit.text, stylesAtPointer(edit.selection.anchor, doc)),
					pointerRange.start.offset,
					paragraph)),
			// Defragment the edited paragraph.
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
			Doc.removeSliceAtSubelement(
				Doc.positionFromPointer(pointerRange.start, doc),
				Doc.positionFromPointer(pointerRange.end, doc)),
			Doc.splitElementInPlace(
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

