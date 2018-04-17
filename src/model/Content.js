
// Content ::= { text: string }
// A fragment of text content, which is rendered uniformly.

const types = {
	plainText: 'plainText',
};


// make :: (Content.Type, string, object) -> Content
function make(type, text, fields) {
	return { type, text, ...fields };
}

// plainText :: string -> Content
function plainText(text) {
	return make(types.plainText, text, {});
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
		text: content.slice(start, end)
	};
}

// append :: (Content, Content) -> [Content]
function append(c1, c2) {
	// TODO: Specialize for different types
	return {
		...c1,
		text: c1.text + c2.text
	};
}

export {
	plainText,

	removeInRange,
	characterCount,
	split,
	slice,
};

