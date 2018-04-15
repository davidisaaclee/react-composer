import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';
import * as Edit from './Edit';
import * as AnchorRange from './AnchorRange';

const lenses = {
	paragraphOrder: R.lensProp('paragraphOrder'),
	allParagraphs: R.lensProp('allParagraphs'),
	paragraphForID: id => R.compose(lenses.allParagraphs, R.lensProp(id)),
};

function make(paragraphOrder, allParagraphs) {
	return { paragraphOrder, allParagraphs };
}

const empty = make([], {});

function appendParagraph(id = UUID(), doc) {
	return R.pipe(
		R.set(lenses.paragraphForID(id), Paragraph.empty),
		R.over(lenses.paragraphOrder, R.append(id))
	)(doc);
}

function setParagraphContent(id, content, doc) {
	return R.over(
		lenses.paragraphForID(id),
		paragraph => content,
		doc);
}

// removeText :: (AnchorRange, Doc) -> Doc
function removeText(range, doc) {
	return R.over(
		// TODO: Handle multiple paragraphs
		lenses.paragraphForID(range.start.paragraphID),
		p => Paragraph.removeText(range.start.offset, range.end.offset, p),
		doc);
}

// removeText :: (Anchor, string, Doc) -> Doc
function insertText(anchor, text, doc) {
	return R.over(
		lenses.paragraphForID(anchor.paragraphID),
		p => Paragraph.insertText(text, anchor.offset, p),
		doc);
}

// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	switch (edit.type) {
		case Edit.types.replaceText:
			const anchorRange =
				anchorRangeFromSelection(edit.selection, doc);

			return R.pipe(
				d => insertText(anchorRange.end, edit.text, d),
				d => removeText(anchorRange, d),
			)(doc);
	}
}

// paragraphList :: Doc -> [{ id: ParagraphID, paragraph: Paragraph }]
function paragraphList(doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.map(id => ({ id, paragraph: R.view(lenses.paragraphForID(id), doc) }))
	)(doc);
}

// sortAnchorsAscending :: ([Anchor], Doc) -> [Anchor]
// Sorts the specified anchors, with anchors closer to the beginning of
// the doc occurring closer to the beginning of the sorted list.
function sortAnchorsAscending(anchors, doc) {
	return R.sortWith([
		R.ascend(anchor => doc.paragraphOrder.indexOf(anchor.paragraphID)),
		R.ascend(anchor => anchor.offset)
	], anchors);
}

function anchorRangeFromSelection(selection, doc) {
	const [start, end] =
		sortAnchorsAscending([selection.anchor, selection.focus], doc);

	return AnchorRange.make(start, end);
}

export {
	lenses,
	make,
	empty,
	appendParagraph,
	setParagraphContent,
	applyEdit,
	paragraphList,
	sortAnchorsAscending,
	anchorRangeFromSelection,
};

