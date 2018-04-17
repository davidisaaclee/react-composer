import * as R from 'ramda';

// Content ::= { text: string }

const plainTextContent = text => ({ text });

const lenses = {
	// contents :: Lens Paragraph [Content]
	contents: R.identity,
};

// make :: [Content] -> Paragraph
const make = contents => contents;;

// empty :: Paragraph
const empty = make([]);

// contents :: Paragraph -> [Content]
const contents = R.view(lenses.contents);

// insertContent :: (Content, number, Paragraph) -> Paragraph
function insertContent(content, offset, paragraph) {
	return R.pipe(
		R.over(
			lenses.contents,
			contents => [
				...sliceContents(0, offset, contents),
				content,
				...sliceContents(offset, null, contents)
			]),
		defragment
	)(paragraph);
}

// appendContent :: (Content, Paragraph) -> Paragraph
function appendContent(content, paragraph) {
	return insertContent(
		content,
		contentsCharacterCount(contents(paragraph)),
		paragraph);
}

// removeContentInRange :: (number, number, Paragraph) -> Paragraph
// Removes content between the two specified offsets.
//     removeContentInRange(1, 3, make(['abcdef'])) => make(['bc'])
function removeContentInRange(startOffset, endOffset, paragraph) {
	return R.pipe(
		R.over(
			lenses.contents,
			contents => [
				...sliceContents(0, startOffset, contents),
				...sliceContents(endOffset, null, contents)
			]),
		defragment
	)(paragraph);
}

// split :: (number, Paragraph) -> { before: Paragraph, after: Paragraph }
const split = (offset, paragraph) => ({
	before: defragment(make(sliceContents(0, offset, contents(paragraph)))),
	after: defragment(make(sliceContents(offset, contents(paragraph)))),
});

// merge :: (Paragraph, Paragraph) -> Paragraph
function merge(p1, p2) {
	return R.pipe(
		contents,
		R.reduce((acc, content) => appendContent(content, acc), p1),
	)(p2);
}

// defragment :: (Paragraph) -> Paragraph
// Collapses contents if doing so would not affect rendering.
function defragment(paragraph) {
	return R.over(
		lenses.contents,
		collapseContentsIfPossible,
		paragraph);
}

// characterCount :: (Paragraph) -> number
function characterCount(paragraph) {
	return R.pipe(
		R.view(lenses.contents),
		contentsCharacterCount
	)(paragraph);
}


// -- Helpers

// sliceContents :: (number, number?, [Content]) -> [Content]
// Copies a slice of a content list between two offsets into a new content list.
// If the end offset is omitted, slices to end of content list.
//     sliceContents(0, 1, ['abc']) => ['a']
//     sliceContents(0, 3, ['abc']) => ['abc']
//     sliceContents(1, 5, ['ab', 'c', 'def']) => ['b', 'c', 'de']
//     sliceContents(1, null, ['ab', 'c', 'def']) => ['b', 'c', 'def']
//     sliceContents(0, 99, ['abc']) => ['abc']
//     sliceContents(0, 0, ['abc']) => []
//     sliceContents(1, 0, ['abc']) => []
function sliceContents(startOffset, endOffset, contents) {
	endOffset =
		endOffset == null ? contentsCharacterCount(contents) : endOffset;

	if (endOffset <= startOffset) {
		return [];
	}

	const isInSlice =
		offset => offset > startOffset && offset <= endOffset;

	let retval = [];

	let currentOffset = 0;
	for (let i = 0; i < contents.length; i++) {
		const content = contents[i];

		let contentToInclude = '';
		for (let charIdx = 0; charIdx < content.text.length; charIdx++) {
			// The offset will be one greater than the character index, since
			// the offset represents the space between characters.
			currentOffset++;

			if (isInSlice(currentOffset)) {
				contentToInclude += content.text.charAt(charIdx);
			}
		}

		retval.push(plainTextContent(contentToInclude));

		if (currentOffset >= endOffset) {
			break;
		}
	}

	return retval;
}

// collapseContentsIfPossible :: [Content] -> [Content]
// Collapses adjacent contents if doing so does not change rendering.
function collapseContentsIfPossible(contents) {
	// Since we only have plain text, content can always collapsed.
	return R.pipe(
		R.map(R.prop('text')),
		R.join(''),
		plainTextContent,
		x => [x],
	)(contents);
}

// contentsCharacterCount :: [Content] -> number
function contentsCharacterCount(contents) {
	return R.sum(R.map(R.pipe(R.prop('text'), R.length), contents));
}


export {
	empty,
	make,
	contents,
	insertContent,
	appendContent,
	removeContentInRange,
	split,
	merge,
	defragment,
	characterCount,
	plainTextContent,
};

