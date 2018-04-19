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

// applyStylesInRange :: (Range Doc.Pointer, StyleSet, Doc) -> Doc
// Merges the specified style set with the existing styles of content
// in the specified range.
function applyStylesInRange({ start, end }, styles, doc) {
	function applyStylesToContent(styles, content) {
		return {
			...content,
			styles: {
				...content.styles,
				...styles
			}
		};
	}

	function applyStylesToParagraphSlice(startContentIndex, endContentIndex, paragraph) {
		let styledParagraph = paragraph;

		for (let contentIndex = startContentIndex; contentIndex < endContentIndex; contentIndex++) {
			styledParagraph = Paragraph.update(
				Paragraph.keyAtIndex(contentIndex, paragraph),
				content => applyStylesToContent(styles, content),
				styledParagraph);
		}

		return styledParagraph;
	}

	// Since we're going to split the contents at the bookends of the range,
	// we can decide what the keys of those new contents will be.
	// These keys correspond to the first and last contents which will
	// receive the new styles.
	const startContentKey = UUID();
	const endContentKey = UUID();

	// Split the Contents at the start and end of the range.
	// (We need to do this so that we can apply a style to
	// only the selected part of the Content.)
	const docSplitAtStart = Doc.update(
		start.key,
		(paragraph) => {
			const startPositionInParagraph =
				Paragraph.positionFromAbsoluteOffset(
					start.offset,
					paragraph);
			return Paragraph.splitElementInPlace(
				startPositionInParagraph,
				UUID(),
				startContentKey,
				paragraph);
		},
		doc);
	const docSplitAtStartAndEnd = Doc.update(
		end.key,
		paragraph => {
			const endPositionInParagraph =
				Paragraph.positionFromAbsoluteOffset(
					end.offset,
					paragraph);
			return Paragraph.splitElementInPlace(
				endPositionInParagraph,
				endContentKey,
				UUID(),
				paragraph);
		},
		docSplitAtStart);

	// Update all Contents within the range with the new styles.
	let styledDoc = docSplitAtStartAndEnd;

	const docPositionRange = Range.make(
		Doc.positionFromPointer(start, styledDoc),
		Doc.positionFromPointer(end, styledDoc));

	const paragraphPositionRange = Range.make(
		Paragraph.positionFromAbsoluteOffset(
			docPositionRange.start.offset,
			Doc.nth(docPositionRange.start.index, styledDoc)),
		Paragraph.positionFromAbsoluteOffset(
			docPositionRange.end.offset,
			Doc.nth(docPositionRange.end.index, styledDoc)));

	if (start.key === end.key) {
		// If the range is within one paragraph, just iterate through that range of content.
		styledDoc = Doc.update(
			Doc.keyAtIndex(
				docPositionRange.start.index,
				styledDoc),
			paragraph => {
				const startContentIndex = 
					paragraphPositionRange.start.index;
				const endContentIndex =
					paragraphPositionRange.end.index;

				return applyStylesToParagraphSlice(
					startContentIndex,
					endContentIndex,
					paragraph)
			},
			styledDoc);
	} else {
		// Update the styles of the partial paragraph at the start of the selection.
		styledDoc = Doc.update(
			Doc.keyAtIndex(
				docPositionRange.start.index,
				styledDoc),
			paragraph => {
				const startContentIndex = 
					paragraphPositionRange.start.index;
				const endContentIndex =
					Paragraph.count(paragraph);

				return applyStylesToParagraphSlice(
					startContentIndex,
					endContentIndex,
					paragraph)
			},
			styledDoc);

		// Update the styles of the fully-selected paragraphs.
		for (let i = docPositionRange.start.index + 1; i < docPositionRange.end.index; i++) {
			styledDoc = Doc.update(
				Doc.keyAtIndex(
					i,
					styledDoc),
				paragraph => {
					const startContentIndex = 
						0;
					const endContentIndex =
						Paragraph.count(paragraph);

					return applyStylesToParagraphSlice(
						startContentIndex,
						endContentIndex,
						paragraph);
				},
				styledDoc);
		}

		// Update the styles of the partial paragraph at the end of the selection.
		styledDoc = Doc.update(
			Doc.keyAtIndex(
				docPositionRange.end.index,
				styledDoc),
			paragraph => {
				const startContentIndex = 
					0;
				const endContentIndex =
					paragraphPositionRange.end.index;

				return applyStylesToParagraphSlice(
					startContentIndex,
					endContentIndex,
					paragraph);
			},
			styledDoc);
	}

	return styledDoc;
}

// isSelectionBackwards :: (DocSelection Doc.Pointer, Doc) -> boolean
// Returns true if and only if the focus of the selection occurs before
// the anchor in the document.
function isSelectionBackwards(selection, doc) {
	const selectionRange = pointerRangeFromSelection(selection, doc);
	return selectionRange.start === selection.focus;
}


// stylesForSelection :: (DocSelection Doc.Pointer, Doc) -> StyleSet
function stylesForSelection(selection, doc) {
	// Returns the styles of the first piece of content in the selection,
	// starting from the anchor and moving towards the focus.
	
	const anchorPosition =
		Doc.positionFromPointer(selection.anchor, doc);
	const positionToUseForStyles = isSelectionBackwards(selection, doc)
		? Doc.previousPosition(anchorPosition, doc)
		: Doc.nextPosition(anchorPosition, doc);
	const paragraph =
		Doc.nth(
			positionToUseForStyles.index,
			doc);
	const positionInParagraph =
		Paragraph.positionFromAbsoluteOffset(
			positionToUseForStyles.offset,
			paragraph);
	const content =
		Paragraph.nth(
			positionInParagraph.index,
			paragraph);

	return content.styles;
}

// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);

		const positionRange = Range.make(
			Doc.positionFromPointer(pointerRange.start, doc),
			Doc.positionFromPointer(pointerRange.end, doc));

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
					Content.make(edit.text, stylesForSelection(edit.selection, doc)),
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
	} else if (edit.type === Edit.types.applyStyles) {
		const { selection, styles } = edit;
		const pointerRange =
			pointerRangeFromSelection(selection, doc);

		return applyStylesInRange(pointerRange, styles, doc);
	} else if (edit.type === Edit.types.toggleBold) {
		const { selection } = edit;
		const previousStyles = stylesForSelection(selection, doc);

		return applyEdit(
			Edit.applyStyles(
				selection,
				{
					...previousStyles,
					bold: previousStyles.bold == null ? true : !previousStyles.bold
				}),
			doc);
	} else if (edit.type === Edit.types.toggleItalic) {
		const { selection } = edit;
		const previousStyles = stylesForSelection(selection, doc);

		return applyEdit(
			Edit.applyStyles(
				selection,
				{
					...previousStyles,
					italic: previousStyles.italic == null ? true : !previousStyles.italic
				}),
			doc);
	} else if (edit.type === Edit.types.addLink) {
		const { selection, url } = edit;
		return applyEdit(
			Edit.applyStyles(
				selection,
				{ link: url }),
			doc);
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

