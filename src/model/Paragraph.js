import * as R from 'ramda';
import UUID from 'uuid';
import OSD from 'utility/OrderedSubdivisibleDictionary';

// Paragraph ::= OrderedSubdivisibleDictionary ContentID Content
const Paragraph = OSD({
	count: content => content.text.length,
	containsIndex: (index, content) => index > 0 && index <= content.text.length,
	slice: (start, end, content) => plainTextContent(content.text.slice(start, end)),
	merge: (c1, c2) => plainTextContent(c1.text + c2.text),
});

const plainTextContent = text => ({ text });

const generateKey = () => UUID();

export default {
	...Paragraph,

	// insertContent :: (Content, Paragraph.AbsoluteOffset, Paragraph) -> Paragraph
	insertContent: (content, offset, p) => {
		const insertPosition =
			Paragraph.positionFromAbsoluteOffset(offset, p);

		const splitParagraph = Paragraph.splitElement(
			insertPosition,
			generateKey(),
			generateKey(),
			p);

		return Paragraph.insert(
			generateKey(),
			content,
			// Insert after the "before" split node.
			insertPosition.index + 1,
			splitParagraph);
	},

	// removeContentInRange :: (number, number, Paragraph) -> Paragraph
	removeContentInRange: (start, end, p) => Paragraph.removeSlice(
		Paragraph.positionFromAbsoluteOffset(start),
		Paragraph.positionFromAbsoluteOffset(end),
		p),

	// characterCount :: Paragraph -> number
	characterCount: Paragraph.countSubelements,

	// plainTextContent :: string -> Content
	plainTextContent,

	// TODO
	// defragment :: Paragraph -> Paragraph
	defragment: paragraph => Paragraph.fromArray([{
		key: generateKey(),
		value: plainTextContent(Paragraph.toValuesList(paragraph).map(R.prop('text')).join(''))
	}]),
};

