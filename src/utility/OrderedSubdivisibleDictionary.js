import * as R from 'ramda';
import * as OD from 'utility/OrderedDictionary';

/*
`OrderedSubdivisbleDictionary` is a specialization of `OrderedDictionary`,
where the stored values are ordered collections. This module exposes methods
which operate across the dictionary's elements, as well as providing two
nested types - Pointer and Position - which can be used for indexing into a
subelement of the dictionary.

OrderedSubdivisbleDictionary k v ::= OrderedDictionary k v
	where v implements {
	  count: v -> number,
		containsIndex: (number, v) -> boolean,
	  slice: (number, number, v) -> v,
    removeSlice: (number, number, v) -> v
	}
*/

export default ({
	// count :: v -> number
	count: elementCount,

	// containsIndex :: (number, v) -> boolean
	containsIndex: elementContainsIndex,
	
	// slice :: (number, number, v) -> v
	slice: elementSlice,

	// removeSlice :: (number, number, v) -> v
	removeSlice: elementRemoveSlice,
}) => {

	// Position ::= { index: number, offset: number };
	// Pointer ::= { key: k, offset: number };
	
	// makePosition :: (number, number) -> Position
	const makePosition = (index, offset) => ({ index, offset });

	// makePointer :: (k, number) -> Pointer
	const makePointer = (key, offset) => ({ key, offset });

	// positionEqual :: (Position, Position) -> boolean
	function positionEqual(p1, p2) {
		return p1.index === p2.index && p1.offset === p2.offset;
	}

	// pointerEqual :: (Pointer, Pointer) -> boolean
	function pointerEqual(p1, p2) {
		return p1.key === p2.key && p1.offset === p2.offset;
	}

	// startPosition :: OSD -> Position
	// Returns the first position in the dictionary.
	function startPosition(dict) {
		return makePosition(0, 0);
	}
	
	// endPosition :: OSD -> Position
	// Returns the last filled position in the dictionary.
	function endPosition(dict) {
		const endIndex =
			OD.count(dict) - 1;
		const endOffsetOfEndIndex =
			elementCount(OD.nth(endIndex, dict));

		return makePosition(endIndex, endOffsetOfEndIndex);
	}

	// positionFromPointer :: (Pointer, OSD) -> Position
	function _positionFromPointer(pointer, dict) {
		return makePosition(
			OD.indexOf(pointer.key, dict),
			pointer.offset);
	}
	const positionFromPointer = R.curry(_positionFromPointer);


	// pointerFromPosition :: (Position, OSD) -> Pointer
	function _pointerFromPosition(position, dict) {
		return makePointer(
			OD.keyAtIndex(position.index, dict),
			position.offset);
	}
	const pointerFromPosition = R.curry(_pointerFromPosition);


	// positionFromAbsoluteOffset :: (number, OSD) -> Position?
	// Returns a Position representing the specified subelement offset from
	// the beginning of the dictionary.
	// If the offset lies past the end of the dictionary, returns a
	// position outside the dictionary, indexing into the last element.
	// If the offset lies before the start of the dictionary, returns null.
	function _positionFromAbsoluteOffset(absoluteOffset, dict) {
		if (absoluteOffset < 0) {
			return null;
		}

		let currentOffset = 0;
		for (let i = 0; i < OD.count(dict); i++) {
			const currentKey = dict.order[i];
			const currentElementCount = elementCount(OD.get(currentKey, dict));

			if (currentOffset + currentElementCount <= absoluteOffset) {
				currentOffset += currentElementCount;
				continue;
			} else {
				return makePosition(i, absoluteOffset - currentOffset);
			}
		}

		const end = endPosition(dict);
		return {
			...end,
			offset: end.offset + absoluteOffset - currentOffset
		};

		// return null;
	}
	const positionFromAbsoluteOffset = R.curry(_positionFromAbsoluteOffset);


	// containsPosition :: (Position, OSD) -> boolean
	function _containsPosition(position, dict) {
		if (position.index == null) {
			return false;
		}

		const key = OD.keyAtIndex(position.index, dict);
		if (key == null) {
			return false;
		}

		return elementContainsIndex(
			position.offset,
			OD.get(key, dict));
	}
	const containsPosition = R.curry(_containsPosition);


	// containsPointer :: (Pointer, OSD) -> boolean
	function _containsPointer(pointer, dict) {
		return containsPosition(
			positionFromPointer(pointer, dict),
			dict);
	}
	const containsPointer = R.curry(_containsPointer);


	// incrementPositionByOffset :: (Position, number, OSD) -> Position?
	// Returns a new position incremented by the specified subelement offset.
	// If the new position lies after the last position in the dictionary,
	// returns a position indexed at the last element, with an offset outside
	// of that element.
	// If the new position lies before the first position in the dictionary,
	// returns null.
	function _incrementPositionByOffset(currentPosition, offset, dict) {
		if (!containsPosition(currentPosition, dict)) {
			if (currentPosition.offset < 0) {
				// Position is invalid.
				return null;
			}

			// If we're trying to increment starting from past the end of an element,
			// return a position indexing into that element, at a subelement
			// past the end of the element.
			const willIncrementToNonnegativeIndex = currentPosition.offset + offset >= 0;
			if (willIncrementToNonnegativeIndex) {
				return {
					...currentPosition,
					offset: currentPosition.offset + offset
				};
			} else {
				if (currentPosition.index === 0) {
					// We're attempting to decrement past the beginning of the collection.
					return null;
				}

				// We're decrementing from past the end of a subelement.
				// There's probably a smarter way to do this, but for now, walk down
				// until we're done.
				return incrementPositionByOffset(
					{ ...currentPosition, offset: currentPosition.offset - 1 },
					offset + 1,
					dict);
			}
		}

		if (offset === 0) {
			return currentPosition;
		}

		const currentElement = OD.nth(currentPosition.index, dict);
		if (elementContainsIndex(currentPosition.offset + offset, currentElement)) {
			return makePosition(
				currentPosition.index,
				currentPosition.offset + offset);
		} else {
			const subelementsLeftInCurrentElement =
				elementCount(currentElement) - currentPosition.offset;
			const nextElementPosition =
				makePosition(
					currentPosition.index + 1,
					0);

			return incrementPositionByOffset(
				nextElementPosition,
				offset - subelementsLeftInCurrentElement,
				dict);
		}
	}
	const incrementPositionByOffset = R.curry(_incrementPositionByOffset);


	// nextPosition :: (Position, OSD) -> Position?
	function _nextPosition(position, dict) {
		return incrementPositionByOffset(position, 1, dict);
	}
	const nextPosition = R.curry(_nextPosition);


	// previousPosition :: (Position, OSD) -> Position?
	function _previousPosition(position, dict) {
		return incrementPositionByOffset(position, -1, dict);
	}
	const previousPosition = R.curry(_previousPosition);

	// incrementPointerByOffset :: (Pointer, number, OSD) -> Pointer?
	function _incrementPointerByOffset(pointer, offset, dict) {
		return pointerFromPosition(
			incrementPositionByOffset(
				positionFromPointer(pointer, dict),
				offset,
				dict),
			dict);
	}
	const incrementPointerByOffset = R.curry(_incrementPointerByOffset);

	// nextPointer :: (Pointer, OSD) -> Pointer?
	function _nextPointer(pointer, dict) {
		return incrementPointerByOffset(pointer, 1, dict);
	}
	const nextPointer = R.curry(_nextPointer);

	// previousPointer :: (Pointer, OSD) -> Pointer?
	function _previousPointer(pointer, dict) {
		return incrementPointerByOffset(pointer, -1, dict);
	}
	const previousPointer = R.curry(_previousPointer);

	// splitElementInPlace :: (Position, k, k, OSD k v) -> OSD k v
	// Splits the element at the specified position into two.
	// If the specified position is not in the dictionary,
	// returns the original dictionary.
	function _splitElementInPlace(splitPosition, beforeKey, afterKey, dict) {
		const splitKey =
			OD.keyAtIndex(
				splitPosition.index,
				dict);

		const before = elementSlice(
			0,
			splitPosition.offset,
			OD.get(splitKey, dict));

		const after = elementSlice(
			splitPosition.offset,
			elementCount(OD.get(splitKey, dict)),
			OD.get(splitKey, dict));

		return R.pipe(
			OD.remove(splitKey),
			OD.insert(beforeKey, before, splitPosition.index),
			OD.insert(afterKey, after, splitPosition.index + 1),
		)(dict);
	}
	const splitElementInPlace = R.curry(_splitElementInPlace);


	// removeSliceAtSubelement :: (Position, Position, OSD k v) -> OSD k v
	// Removes the slice between the two specified positions.
	//
	// If the slice is contained by a single element, that element
	// drops the specified slice, and merges the portions before and
	// after the slice.
	//
	// If the slice spans multiple elements, fully-spanned elements
	// are dropped, and the partially-spanned elements are partially
	// dropped. The partially-spanned elements are not merged, and
	// retain the keys they had before being trimmed.
	//
	// (ab`c) (def) (gh´i) -> (ab) (i)
	// (ab`cde´fgh) -> (abfgh)
	function _removeSliceAtSubelement(start, end, dict) {
		const startPositionKey =
			OD.keyAtIndex(start.index, dict);
		const endPositionKey =
			OD.keyAtIndex(end.index, dict);

		if (startPositionKey === endPositionKey) {
			const elementAfterRemovingSlice =
				elementRemoveSlice(
					start.offset,
					end.offset,
					OD.get(startPositionKey, dict));

			return R.pipe(
				// Remove all full elements within the slice.
				d => R.reduce(
					(dict, key) => OD.remove(key, dict),
					d,
					R.map(
						index => OD.keyAtIndex(index, dict),
						R.range(start.index + 1, end.index))),
				// Remove the original element.
				OD.remove(startPositionKey),
				// Insert a copy of the element after removing the slice.
				OD.insert(
					startPositionKey,
					elementAfterRemovingSlice,
					start.index),
			)(dict);
		} else {
			const before =
				elementSlice(
					0,
					start.offset,
					OD.get(startPositionKey, dict));
			const after =
				elementSlice(
					end.offset,
					elementCount(OD.get(endPositionKey, dict)),
					OD.get(endPositionKey, dict));

			return R.pipe(
				// Remove all full elements within the slice.
				d => R.reduce(
					(dict, key) => OD.remove(key, dict),
					d,
					R.map(
						index => OD.keyAtIndex(index, dict),
						R.range(start.index + 1, end.index))),
				OD.remove(startPositionKey),
				OD.remove(endPositionKey),
				OD.insert(
					startPositionKey,
					before,
					start.index),
				OD.insert(
					endPositionKey,
					after,
					start.index + 1),
			)(dict);
		}
	}
	const removeSliceAtSubelement = R.curry(_removeSliceAtSubelement);


	// sortPointersAscending :: ([Pointer], OSD) -> [Pointer]
	function _sortPointersAscending(pointers, dict) {
		return R.sortWith([
			R.ascend(pointer => OD.indexOf(pointer.key, dict)),
			R.ascend(pointer => pointer.offset)
		], pointers);
	}
	const sortPointersAscending = R.curry(_sortPointersAscending);

	// sortPositionsAscending :: ([Position], OSD) -> [Position]
	function _sortPositionsAscending(positions, dict) {
		return R.sortWith([
			R.ascend(position => position.index),
			R.ascend(position => position.offset)
		], positions);
	}
	const sortPositionsAscending = R.curry(_sortPositionsAscending);


	// splitAtSubelement :: (Position, k, k, OSD k v) -> { before: OSD k v, after: OSD k v }?
	// Splits the dictionary into two dictionaries at the specified split position.
	// If the split position is not within the dictionary, returns null.
	function _splitAtSubelement(splitPosition, beforeKey, afterKey, dict) {
		if (!containsPosition(splitPosition, dict)) {
			return null;
		}

		const splitDict = splitElementInPlace(splitPosition, beforeKey, afterKey, dict);
		return {
			before: OD.slice(0, splitPosition.index + 1, splitDict),
			after: OD.slice(splitPosition.index + 1, OD.count(splitDict), splitDict),
		};
	}
	const splitAtSubelement = R.curry(_splitAtSubelement);


	// sliceBySubelements :: (Position, Position, OSD k v) -> OSD k v
	// Returns a copy of the slice between the two specified positions.
	//
	// (ab`cde´ef) -> (cde)
	// (ab`c)(de´ef) -> (c)(de)
	// (ab`c)(d)(e´ef) -> (c)(d)(e)
	function _sliceBySubelements(start, end, dict) {
		return R.pipe(
			removeSliceAtSubelement(startPosition(dict), start),
			removeSliceAtSubelement(end, endPosition(dict)),
		)(dict);
	}
	const sliceBySubelements = R.curry(_sliceBySubelements);

	// countSubelements :: OrderedDictionary k v -> number
	function countSubelements(dict) {
		return R.pipe(
			OD.toValuesList,
			R.map(elementCount),
			R.sum
		)(dict);
	}

	return {
		...OD,
		makePosition,
		makePointer,
		positionEqual,
		pointerEqual,
		positionFromPointer,
		pointerFromPosition,
		positionFromAbsoluteOffset,
		containsPosition,
		containsPointer,
		incrementPositionByOffset,
		nextPosition,
		previousPosition,
		incrementPointerByOffset,
		nextPointer,
		previousPointer,
		splitElementInPlace,
		removeSliceAtSubelement,
		sortPointersAscending,
		sortPositionsAscending,
		splitAtSubelement,
		sliceBySubelements,
		countSubelements,
	};
};


