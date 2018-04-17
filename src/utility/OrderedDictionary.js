import * as R from 'ramda';

// OrderedDictionary k v ::= { all :: { k -> v }, order: [k] }

const lenses = {
	all: R.lensProp('all'),
	order: R.lensProp('order'),
};

export const empty = { all: {}, order: [] };


// fromArray :: [{ key :: k, value :: v }] -> OrderedDictionary k v
export const fromArray =
	array => array.reduce((dict, {key, value}, index) => insert(key, value, index, dict), empty);


// insert :: (k, v, number, OrderedDictionary k v) -> OrderedDictionary k v
const _insert = (key, value, index, dictionary) => ({
	all: { ...dictionary.all, [key]: value },
	order: index === -1 
		? [...dictionary.order, key]
		: [...dictionary.order.slice(0, index), key, ...dictionary.order.slice(index)]
});
export const insert = R.curry(_insert);


// TODO: Rename to `toValuesArray` for consistency
// toValuesList :: OrderedDictionary k v -> [v]
export const toValuesList = ({ all, order }) => order.map(key => all[key]);


// TODO: Rename to `toArray` for consistency
// toList :: OrderedDictionary k v -> [{ key: k, value: v }]
export const toList = ({ all, order }) => order.map(key => ({ key, value: all[key] }));


// toUnorderedObject :: OrderedDictionary k v -> { k -> v }
export const toUnorderedObject = ({ all }) => all;


// contains :: (k, OrderedDictionary k v) -> boolean
const _contains = (key, dict) => key in dict.all;
export const contains = R.curry(_contains);


// containsIndex :: (number, OrderedDictionary k v) -> boolean
const _containsIndex = (index, dict) => index >= 0 && index < count(dict);
export const containsIndex = R.curry(_containsIndex);


// set :: (k, v, OrderedDictionary k v) -> OrderedDictionary k v
const _set = (key, value, dict) => {
	if (!contains(key)(dict)) {
		return dict;
	}

	return {
		...dict,
		all: {
			...dict.all,
			[key]: value
		}, 
	};
};
export const set = R.curry(_set);


// push :: (k, v, OrderedDictionary k v) -> OrderedDictionary k v
const _push = (key, value, dict) => insert(key, value, count(dict), dict);
export const push = R.curry(_push);


// get :: (k, OrderedDictionary k v) -> v?
const _get = (key, dict) => dict.all[key];
export const get = R.curry(_get);


// nthKey :: (number, OrderedDictionary k v) -> k?
function _nthKey(index, dict) {
	return R.pipe(R.view(lenses.order), R.nth(index))(dict);
}
export const nthKey = R.curry(_nthKey);


// nth :: (number, OrderedDictionary k v) -> v?
function _nth(index, dict) {
	const key = nthKey(index, dict);
	return key == null
		? null
		: get(key, dict);
}
export const nth = R.curry(_nth);


// indexOf :: (k, OrderedDictionary k v) -> number
// Returns -1 if key is not in dictionary.
const _indexOf = (key, dict) => R.pipe(
	R.view(lenses.order),
	R.indexOf(key)
)(dict);
export const indexOf = R.curry(_indexOf);


// update :: (k, (v -> v), OrderedDictionary k v) -> OrderedDictionary k v
const _update = (key, updater, dict) => {
	if (!contains(key)(dict)) {
		return dict;
	}

	return set(key, updater(get(key, dict)), dict);
};
export const update = R.curry(_update);


// mapValues :: ((v -> v'), OrderedDictionary k v) -> OrderedDictionary k v'
const _mapValues = (transform, dict) =>
	dict.order.reduce(
		(acc, key) => update(key, transform, acc),
		dict);
export const mapValues = R.curry(_mapValues);


// filter :: ([k, v] -> Bool) -> OrderedDictionary k v -> OrderedDictionary k v
const _filter = (predicate, dict) =>
	dict.order
		.map((key, index) => ({ key, value: get(key, dict) }))
		.reduce((acc, entry) =>
			predicate([entry.key, entry.value]) 
			? push(entry, acc)
			: acc, empty);
export const filter = R.curry(_filter);


// remove :: (k, OrderedDictionary k v) -> OrderedDictionary k v
function _remove(key, dict) {
	if (!contains(key, dict)) {
		return dict;
	}

	return R.pipe(
		R.over(
			lenses.order,
			order => R.remove(R.indexOf(key, order), 1, order)),
		R.over(
			lenses.all,
			R.dissoc(key))
	)(dict);
}
export const remove = R.curry(_remove);


// keyAtIndex :: (number, OrderedDictionary k v) -> k?
const _keyAtIndex = (index, dict) => R.pipe(
	R.view(lenses.order),
	R.nth(index)
)(dict);
export const keyAtIndex = R.curry(_keyAtIndex);


// count :: OrderedDictionary k v -> number
export const count = R.pipe(R.view(lenses.order), R.length);


// slice :: (number, number, OrderedDictionary k v) -> OrderedDictionary k v
// Copies values between startIndex (inclusive) and endIndex (exclusive) into
// a new OrderedDictionary, and returns that dictionary.
function _slice(startIndex, endIndex, dict) {
	return R.reduce(
		(d, index) => push(keyAtIndex(index, dict), nth(index, dict), d),
		empty,
		R.range(startIndex, endIndex));
}
export const slice = R.curry(_slice);


// merge :: (OrderedDictionary k v, OrderedDictionary k v) -> OrderedDictionary k v
// Creates a new dictionary by appending the contents of `d2` to `d1`.
function _merge(d1, d2) {
	return fromArray([...toList(d1), ...toList(d2)]);
}
export const merge = R.curry(_merge);


