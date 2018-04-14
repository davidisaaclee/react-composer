import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';

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

// paragraphList :: Doc -> [{ id: ParagraphID, paragraph: Paragraph }]
function paragraphList(doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.map(id => ({ id, paragraph: R.view(lenses.paragraphForID(id), doc) }))
	)(doc);
}

export {
	lenses,
	make,
	empty,
	appendParagraph,
	setParagraphContent,
	paragraphList,
};

