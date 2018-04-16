/* A `DocPosition` points to a position in the document between two characters,
 * referenced by the containing paragraph's index within the paragraph list,
 * and the character offset within that paragraph.
 *
 * A `DocPosition` with offset n refers to the position between the nth and
 * (n-1)th character in the specified paragraph.
 */

// make :: (number, number) -> DocPosition
const make = (paragraphIndex, offset) => ({ paragraphIndex, offset });

export {
	make,
};

