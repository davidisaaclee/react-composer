import * as R from 'ramda';
import UUID from 'uuid';
import OSD from '../utility/OrderedSubdivisibleDictionary';

// ContentDict ::= OrderedSubdivisibleDictionary ContentID Content
const ContentDict = OSD({
	count: content => content.text.length,
	containsIndex: (index, content) => index > 0 && index <= content.text.length,
	slice: (start, end, content) => plainTextContent(content.text.slice(start, end)),
	merge: (c1, c2) => plainTextContent(c1.text + c2.text),
});

const plainTextContent = text => ({ text });

const generateKey = () => UUID();

export default {
	...ContentDict,
	make: contents => ContentDict.fromArray(contents.map((c) => ({ key: generateKey(), value: c }))),

	insertContent: (content, offset, p) => {
		const insertPosition =
			ContentDict.positionFromAbsoluteOffset(offset, p);

		const splitParagraph = ContentDict.splitElement(
			insertPosition,
			generateKey(),
			generateKey(),
			p);

		return ContentDict.insert(
			generateKey(),
			content,
			// Insert after the "before" split node.
			insertPosition.index + 1,
			splitParagraph);
	},

	appendContent: (content, p) => ContentDict.push(generateKey(), content, p),

	// removeContentInRange :: (number, number, Paragraph) -> Paragraph
	removeContentInRange: (start, end, p) => ContentDict.removeSlice(
		ContentDict.positionFromAbsoluteOffset(start),
		ContentDict.positionFromAbsoluteOffset(end),
		p),

	split: (position, paragraph) => ContentDict.splitAtSubelement(position, UUID(), UUID(), paragraph),
	merge: ContentDict.merge,
	characterCount: ContentDict.countSubelements,

	plainTextContent,

	// TODO
	defragment: paragraph => ContentDict.fromArray([{
		key: generateKey(),
		value: plainTextContent(ContentDict.toValuesList(paragraph).map(R.prop('text')).join(''))
	}]),
};

