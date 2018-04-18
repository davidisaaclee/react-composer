// StyleSet ::= {
//   bold: boolean?,
//   italic: boolean?,
//   link: URL?
// }
// where URL ::= string

// Content ::= { text: string, styles: StyleSet }
// A fragment of text content, which is rendered uniformly.


// make :: (string, StyleSet) -> Content
function make(text, styles) {
	return { text, styles };
}

// plainText :: string -> Content
function plainText(text) {
	return make(text, {});
}

// removeInRange :: (number, number, Content) -> Content
function removeInRange(start, end, content) {
	return {
		...content,
		text: content.text.slice(0, start) + content.text.slice(end)
	};
}

// characterCount :: Content -> number
function characterCount(content) {
	return content.text.length;
}

// split :: (number, Content) -> { before: Content, after: Content }
function split(offset, content) {
	return {
		before: slice(0, offset, content),
		after: slice(offset, characterCount(content), content),
	};
}

// slice :: (number, number, Content) -> Content
function slice(start, end, content) {
	return {
		...content,
		text: content.text.slice(start, end)
	};
}

export {
	make,
	plainText,

	removeInRange,
	characterCount,
	split,
	slice,
};

