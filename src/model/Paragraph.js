import * as R from 'ramda';
import UUID from 'uuid';
import OSD from 'utility/OrderedSubdivisibleDictionary';
import * as Content from 'model/Content'; 

// Paragraph ::= OrderedSubdivisibleDictionary ContentID Content
const Paragraph = OSD({
	count: content => content.text.length,
	containsIndex: (index, content) => index > 0 && index <= content.text.length,
	slice: Content.slice,
	removeSlice: Content.removeInRange
});

const generateKey = () => UUID();

// defragment :: Paragraph -> Paragraph
function defragment(paragraph) {
	const contents = Paragraph.toList(paragraph);
	let defragmentedParagraph = Paragraph.empty;

	for (let index = 0; index < contents.length; index++) {
		const content = contents[index];

		if (Content.characterCount(content.value) === 0) {
			continue;
		}

		if (index === 0) {
			defragmentedParagraph = Paragraph.push(
				content.key,
				content.value,
				defragmentedParagraph);
		} else {
			const previousContent = {
				key: Paragraph.keyAtIndex(Paragraph.count(defragmentedParagraph) - 1, defragmentedParagraph),
				value: Paragraph.nth(Paragraph.count(defragmentedParagraph) - 1, defragmentedParagraph),
			};

			if (Content.equivalentStyles(previousContent.value.styles, content.value.styles)) {
				defragmentedParagraph = Paragraph.set(
					previousContent.key,
					{
						...previousContent.value,
						text: previousContent.value.text + content.value.text
					},
					defragmentedParagraph);
			} else {
				defragmentedParagraph = Paragraph.push(
					content.key,
					content.value,
					defragmentedParagraph);
			}
		}
	}

	return defragmentedParagraph;
}

export default {
	...Paragraph,

	// insertContent :: (Content, Paragraph.AbsoluteOffset, Paragraph) -> Paragraph
	insertContent: (content, offset, p) => {
		const insertPosition =
			Paragraph.positionFromAbsoluteOffset(offset, p);

		const splitParagraph = Paragraph.splitElementInPlace(
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
	removeContentInRange: (start, end, p) => Paragraph.removeSliceAtSubelement(
		Paragraph.positionFromAbsoluteOffset(start),
		Paragraph.positionFromAbsoluteOffset(end),
		p),

	// characterCount :: Paragraph -> number
	characterCount: Paragraph.countSubelements,

	// defragment :: Paragraph -> Paragraph
	defragment,
};

