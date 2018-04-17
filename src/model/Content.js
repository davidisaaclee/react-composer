
// Content ::= { text: string }
// A fragment of text content, which is rendered uniformly.

// plainText :: string -> Content
const plainText = text => ({ text });


// removeInRange :: (number, number, Content) -> Content
function removeInRange(start, end, content) {
	return {
		...content,
		text: content.text.slice(0, start) + content.text.slice(end)
	};
}

// split :: (number, Content) -> { before: Content, after: Content }
function split(offset, content) {
	return {
		before: { ...content, text: content.text.slice(0, offset) },
		after: { ...content, text: content.text.slice(offset) },
	}
}


export {
	plainText,

	removeInRange,
	split,
};

