import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';
import * as Edit from './Edit';
import * as Range from './Range';
import * as DocPointer from './DocPointer';
import * as DocPosition from './DocPosition';

const lenses = {
	paragraphOrder: R.lensProp('paragraphOrder'),
	allParagraphs: R.lensProp('allParagraphs'),
	paragraphForID: id => R.compose(lenses.allParagraphs, R.lensProp(id)),
};


// -- Construction

function make(paragraphOrder, allParagraphs) {
	return { paragraphOrder, allParagraphs };
}

// empty :: Doc
const empty = make([], {});


// -- Accessors

// indexOfParagraph :: (ParagraphID, Doc) -> number?
function indexOfParagraph(paragraphID, doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.indexOf(paragraphID)
	)(doc);
}

// idForParagraphAtIndex :: (number, Doc) -> ParagraphID?
function idForParagraphAtIndex(index, doc) {
	return R.view(
		R.compose(
			lenses.paragraphOrder,
			R.lensIndex(index)
		),
	)(doc);
}

// containsPosition :: (DocPosition, Doc) -> boolean
// Note: A Doc contains a position "after" the last character. A 1-character Doc has two
// valid positions.
function containsPosition(position, doc) {
	const paragraphID =
		idForParagraphAtIndex(position.paragraphIndex, doc);

	if (paragraphID == null) {
		return false;
	}

	const paragraph =
		R.view(lenses.paragraphForID(paragraphID))(doc);

	if (position.offset < 0 || position.offset > Paragraph.characterCount(paragraph)) {
		return false;
	}

	return true;
}

// containsPointer :: (DocPointer, Doc) -> boolean
// Note: A Doc contains a pointer "after" the last character. A 1-character Doc has two
// valid pointers.
function containsPointer(pointer, doc) {
	const paragraph =
		R.view(lenses.paragraphForID(pointer.paragraphID))(doc);

	if (paragraph == null) {
		return false;
	}

	if (pointer.offset < 0 || pointer.offset > Paragraph.characterCount(paragraph)) {
		return false;
	}

	return true;
}

// pointerFromPosition :: (DocPosition, Doc) -> DocPointer
function pointerFromPosition(position, doc) {
	return DocPointer.make(
		idForParagraphAtIndex(position.paragraphIndex, doc),
		position.offset);
}

// positionFromPointer :: (DocPointer, Doc) -> DocPosition
function positionFromPointer(pointer, doc) {
	return DocPosition.make(
		indexOfParagraph(pointer.paragraphID, doc),
		pointer.offset);
}

// paragraphList :: Doc -> [{ id: ParagraphID, paragraph: Paragraph }]
function paragraphList(doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.map(id => ({ id, paragraph: R.view(lenses.paragraphForID(id), doc) }))
	)(doc);
}

// sortPositionsAscending :: ([DocPointer], Doc) -> [DocPointer]
// Sorts the specified pointers, with pointers closer to the beginning of
// the doc occurring closer to the beginning of the sorted list.
function sortPositionsAscending(pointers, doc) {
	return R.sortWith([
		R.ascend(pointer => doc.paragraphOrder.indexOf(pointer.paragraphID)),
		R.ascend(pointer => pointer.offset)
	], pointers);
}

// pointerRangeFromSelection :: (DocSelection, Doc) -> Range DocPointer
function pointerRangeFromSelection(selection, doc) {
	const [start, end] =
		sortPositionsAscending([selection.anchor, selection.focus], doc);

	return Range.make(start, end);
}


// -- Mutation

// insertParagraph :: (ParagraphID, number, Doc) -> Doc
// Inserts an empty paragraph at the specified index, shuffling
// the paragraph in that position and above to higher indices.
function insertParagraph(id, index, doc) {
	return insertPremadeParagraph(id, index, Paragraph.empty, doc);
}

// insertPremadeParagraph :: (ParagraphID, number, Doc) -> Doc
// Inserts an empty paragraph at the specified index, shuffling
// the paragraph in that position and above to higher indices.
// TODO: Make this the default `insertParagraph`;
// change `insertParagraph` to `insertEmptyParagraph` or remove
function insertPremadeParagraph(id, index, paragraph, doc) {
	return R.pipe(
		R.set(lenses.paragraphForID(id), paragraph),
		R.over(lenses.paragraphOrder, R.insert(index, id))
	)(doc);
}

// appendParagraph :: (ParagraphID, Doc) -> Doc
// Inserts an empty paragraph at the end of the paragraph list.
function appendParagraph(id, doc) {
	const indexPastEnd =
		R.pipe(R.view(lenses.paragraphOrder), R.length)(doc);

	return insertParagraph(
		id,
		indexPastEnd,
		doc);
}

// setParagraphContents :: (ParagraphID, [Paragraph.Content], Doc) -> Doc
function setParagraphContents(id, contents, doc) {
	return R.over(
		lenses.paragraphForID(id),
		paragraph => Paragraph.make(contents),
		doc);
}

// splitParagraph :: (DocPosition, Doc) -> Doc
function splitParagraph(splitPosition, doc) {
	const beforeSplitParagraphID = UUID();
	const afterSplitParagraphID = UUID();

	const paragraphIDContainingSplitPoint =
		idForParagraphAtIndex(
			splitPosition.paragraphIndex,
			doc);

	const { before, after } =
		Paragraph.split(
			splitPosition.offset,
			R.view(lenses.paragraphForID(paragraphIDContainingSplitPoint), doc));

	return R.pipe(
		d => insertPremadeParagraph(
			beforeSplitParagraphID,
			splitPosition.paragraphIndex,
			before,
			d),
		d => insertPremadeParagraph(
			afterSplitParagraphID,
			// The original paragraph has shuffled up an index;
			// to index past it, increment its original index once to 
			// represent that shuffle, and once to move past it.
			splitPosition.paragraphIndex + 2,
			after,
			d),
		d => removeParagraph(
			paragraphIDContainingSplitPoint,
			d),
	)(doc);
}

// mergeParagraphsInRange :: (number, number, Doc) -> Doc
// Merges the content of the paragraphs between and including the specified
// paragraph indices into the first paragraph.
// If the range is invalid, empty, or has a single element, returns the original
// Doc.
function mergeParagraphsInRange(firstParagraphIndex, lastParagraphIndex, doc) {
	// If range contains fewer than two elements, return original doc.
	if (Math.abs(firstParagraphIndex - lastParagraphIndex) < 1) {
		return doc;
	}

	// If invalid range, return original doc.
	if (lastParagraphIndex < firstParagraphIndex) {
		return doc;
	}

	const indicesOfParagraphsToMergeIntoInitial =
		R.range(firstParagraphIndex + 1, lastParagraphIndex + 1);

	return R.pipe(
		// Accumulate paragraphs in initial paragraph.
		R.over(
			lenses.paragraphForID(idForParagraphAtIndex(firstParagraphIndex, doc)),
			initialParagraph => R.reduce(
				Paragraph.merge,
				initialParagraph,
				R.map(
					index => R.view(
						lenses.paragraphForID(idForParagraphAtIndex(index, doc)),
						doc),
					indicesOfParagraphsToMergeIntoInitial))),
		// Remove paragraphs that were merged into the initial paragraph.
		d => R.reduce(
			(doc, paragraphID) => removeParagraph(paragraphID, doc),
			d,
			R.map(
				index => idForParagraphAtIndex(index, d),
				indicesOfParagraphsToMergeIntoInitial)
		),
	)(doc);
}

// removeParagraph :: (ParagraphID, Doc) -> Doc
function removeParagraph(id, doc) {
	const paragraphIndex = R.pipe(
		R.view(lenses.paragraphOrder),
		R.indexOf(id)
	)(doc);

	return R.pipe(
		// Remove from order list.
		R.over(
			lenses.paragraphOrder,
			R.remove(paragraphIndex, 1)),
		// Remove from paragraph dictionary.
		R.over(
			lenses.allParagraphs,
			R.dissoc(id))
	)(doc);
}

// removeText :: (Range DocPointer, Doc) -> Doc
function removeText(range, doc) {
	if (range.start.paragraphID === range.end.paragraphID) {
		// If the range stays within one paragraph, just edit the paragraph.
		return R.over(
			lenses.paragraphForID(range.start.paragraphID),
			p => Paragraph.removeContentInRange(range.start.offset, range.end.offset, p),
			doc);
	} else {
		// Gather the partial paragraphs to remove...
		const firstParagraphRemovalRange =
			pointerRangeToEndOfParagraphFrom(range.start, doc);
		const lastParagraphRemovalRange =
			pointerRangeFromStartOfParagraphTo(range.end, doc);

		// ... and the full paragraphs to remove.
		const startParagraphIndex =
			indexOfParagraph(range.start.paragraphID, doc);
		const endParagraphIndex =
			indexOfParagraph(range.end.paragraphID, doc);
		const idsOfFullParagraphsInRange = R.pipe(
			R.view(lenses.paragraphOrder),
			R.slice(startParagraphIndex + 1, endParagraphIndex)
		)(doc);

		// Then, remove them.
		return R.pipe(
			d => removeText(firstParagraphRemovalRange, d),
			d => removeText(lastParagraphRemovalRange, d),
			d => R.reduce(
				(doc, paragraphID) => removeParagraph(paragraphID, doc),
				d,
				idsOfFullParagraphsInRange),
			d => mergeParagraphsInRange(
				startParagraphIndex,
				endParagraphIndex - idsOfFullParagraphsInRange.length,
				d),
		)(doc);
	}
}

// insertText :: (DocPointer, string, Doc) -> Doc
function insertText(pointer, text, doc) {
	return R.over(
		lenses.paragraphForID(pointer.paragraphID),
		p => Paragraph.insertContent(Paragraph.plainTextContent(text), pointer.offset, p),
		doc);
}


// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);

		return R.pipe(
			d => removeText(pointerRange, d),
			d => insertText(pointerRange.start, edit.text, d),
		)(doc);
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);
		
		const splitPosition =
			positionFromPointer(pointerRange.start, doc);

		return R.pipe(
			d => removeText(
				pointerRange,
				d),
			d => splitParagraph(
				splitPosition,
				d),
		)(doc);
	} else {
		console.error("Unhandled edit type:", edit.type);
		return doc;
	}
}


// -- Helpers

// pointerRangeToEndOfParagraph :: DocPointer -> (Range DocPointer)?
// Creates a pointer range from the specified pointer to the end of that pointer's 
// containing paragraph.
// If the pointer is not in the Doc, returns null.
function pointerRangeToEndOfParagraphFrom(startPointer, doc) {
	if (!containsPointer(startPointer, doc)) {
		return null;
	}

	const endOffset =
		R.pipe(
			R.view(lenses.paragraphForID(startPointer.paragraphID)),
			Paragraph.characterCount
		)(doc);
	const endPointer =
		DocPointer.make(startPointer.paragraphID, endOffset);

	return Range.make(
		startPointer,
		endPointer);
}

// pointerRangeFromStartOfParagraphTo :: DocPointer -> (Range DocPointer)?
// Creates a pointer range from the specified pointer's paragraph beginning
// to the specified pointer.
// If the pointer is not in the Doc, returns null.
function pointerRangeFromStartOfParagraphTo(endPointer, doc) {
	if (!containsPointer(endPointer, doc)) {
		return null;
	}

	const startPointer =
		DocPointer.make(endPointer.paragraphID, 0);

	return Range.make(
		startPointer,
		endPointer);
}

export {
	lenses,
	make,
	empty,
	indexOfParagraph,
	appendParagraph,
	setParagraphContents,
	applyEdit,
	paragraphList,
	sortPositionsAscending,
	pointerRangeFromSelection,
};

