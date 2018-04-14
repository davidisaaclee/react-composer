import React from 'react';
import * as R from 'ramda';
import * as Doc from './Doc';
import * as ParagraphUtils from './Paragraph';

const k = {
	paragraphIDAttributeKey: 'data-paragraph-id'
};

const Anchor = {
	make: (paragraphID, offset) => ({ paragraphID, offset })
};

export const Edit = {
	types: {
		insertText: 'insertText'
	},

	insertText: (startAnchor, text) => ({
		type: Edit.types.insertText,
		startAnchor, text
	}),
};

const Paragraph = ({ paragraph, id, ...restProps }) => (
	<p
		{...{ [k.paragraphIDAttributeKey]: id }}
		{...restProps}
	>
		{ParagraphUtils.content(paragraph)}
	</p>
);

const EditorContainer = ({ editable = false, ...restProps }) => (
	<div
		contentEditable={editable}
		{...restProps}
	/>
);

// ancestorParagraphIDForNode :: Node? -> ParagraphID?
function ancestorParagraphIDForNode(node) {
	if (node == null) {
		return null;
	} else {
		const paragraphID = node.getAttribute(k.paragraphIDAttributeKey);
		if (paragraphID == null) {
			return ancestorParagraphIDForNode(node.parentNode);
		} else {
			return paragraphID;
		}
	}
}

// document :: Doc
// onEdit :: RichText.Edit -> ()
const RichText = ({ document: doc, onEdit, ...restProps }) => {
	function handleKeyPress(evt) {
		onEdit(Edit.insertText({}, evt.key));
	}

	return (
		<EditorContainer
			editable
			onKeyPress={handleKeyPress}
			{...restProps}
		>
			{Doc.paragraphList(doc).map(({ id, paragraph }) => (
				<Paragraph
					key={id}
					paragraph={paragraph}
					id={id}
				/>
			))}
		</EditorContainer>
	);
};

export default RichText;

