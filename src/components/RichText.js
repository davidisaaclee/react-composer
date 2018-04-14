import React from 'react';

import * as Doc from '../model/Doc';
import * as ParagraphUtils from '../model/Paragraph';
import * as Edit from '../model/Edit';
import * as Anchor from '../model/Anchor';
import * as DocSelection from '../model/DocSelection';

const k = {
	paragraphIDAttributeKey: 'data-paragraph-id'
};

const errorMessages = {
	couldNotFindParagraphIDForSelectionAnchor: anchorNode => `Could not find paragraph ID for selection anchor node: ${anchorNode}.`,
	couldNotFindParagraphIDForSelectionFocus: focusNode => `Could not find paragraph ID for selection focus node: ${focusNode}.`,
	selectNontextNode: selection => `Attempted selection on non-text nodes: ${selection}`,
	queryingForParagraphBeforeReceivedRef: `Attempted to calculate DOM node and offset before receiving ref.`,
};

// ancestorParagraphIDForNode :: Node? -> ParagraphID?
function ancestorParagraphIDForNode(node) {
	if (node == null) {
		return null;
	} else if (!(node instanceof Element)) {
		return ancestorParagraphIDForNode(node.parentNode);
	} else {
		const paragraphID = node.getAttribute(k.paragraphIDAttributeKey);
		if (paragraphID == null) {
			return ancestorParagraphIDForNode(node.parentNode);
		} else {
			return paragraphID;
		}
	}
}

// docSelectionFromNativeSelection :: Selection -> DocSelection
function docSelectionFromNativeSelection(selection) {
	if (selection.anchorNode.nodeType !== Node.TEXT_NODE || selection.focusNode.nodeType !== Node.TEXT_NODE) {
		throw new Error(errorMessages.selectNontextNode(selection));
	}

	const anchorParagraphID = ancestorParagraphIDForNode(selection.anchorNode);
	const focusParagraphID = ancestorParagraphIDForNode(selection.focusNode);

	if (anchorParagraphID == null) {
		throw new Error(errorMessages.couldNotFindParagraphIDForSelectionAnchor(selection.anchorNode));
	}

	if (focusParagraphID == null) {
		throw new Error(errorMessages.couldNotFindParagraphIDForSelectionFocus(selection.focusNode));
	}

	// TODO: There should be a defined mapping between `Selection`'s offsets and model offsets.
	const anchor = Anchor.make(anchorParagraphID, selection.anchorOffset);
	const focus = Anchor.make(focusParagraphID, selection.focusOffset);
	return DocSelection.make(anchor, focus);
}

// Renders a paragraph as a <p> node with a data- attribute containing the paragraph ID.
const Paragraph = ({ paragraph, id, ...restProps }) => (
	<p
		{...{ [k.paragraphIDAttributeKey]: id }}
		{...restProps}
	>
		{ParagraphUtils.content(paragraph)}
	</p>
);

const EditorContainer = ({ editable = false, innerRef, ...restProps }) => (
	<div
		ref={innerRef}
		contentEditable={editable}
		{...restProps}
	/>
);

function getSelection() {
	// TODO: Cross-browser support
	return window.getSelection();
}



// document :: Doc
// selection :: DocSelection?
// onEdit :: RichText.Edit -> ()
class RichText extends React.Component {
	constructor(props) {
		super(props);

		this.handleKeyPress = this.handleKeyPress.bind(this);
	}


	// -- Helpers
	
	// queryParagraphNode :: ParagraphID -> Node?
	// Returns the text node displaying the specified paragraph, or null if no such node could be found.
	queryParagraphNode(paragraphID) {
		if (this.editorContainerRef == null) {
			throw new Error(errorMessages.queryingForParagraphBeforeReceivedRef);
		}

		const selectorForParagraphID =
			`[${k.paragraphIDAttributeKey}=${paragraphID}]`;
		return this.editorContainerRef.querySelector(selectorForParagraphID);
	}
	
	// nodeAndOffsetFromAnchor :: (Anchor) -> { node: Node, offset: number }?
	// Returns the text node and offset within that node for the specified `Anchor`.
	nodeAndOffsetFromAnchor(anchor) {
		const node = this.queryParagraphNode(anchor.paragraphID);
		if (node == null) {
			return null;
		}

		// TODO: This assumes that all tagged paragraphs have a single text node as a child.
		const textNode = node.firstChild;

		return { node: textNode, offset: anchor.offset };
	}

	// rangeFromSelection :: DocSelection -> Range
	rangeFromSelection(selection) {
		// TODO: Should use start/end instead of anchor/focus
		const start = this.nodeAndOffsetFromAnchor(selection.anchor);
		const end = this.nodeAndOffsetFromAnchor(selection.focus);

		const range = document.createRange();
		range.setStart(start.node, start.offset);
		range.setEnd(end.node, end.offset);
		return range;
	}


	// -- Events

	handleKeyPress(evt) {
		this.props.onEdit(Edit.insertText(docSelectionFromNativeSelection(getSelection()), evt.key));
		evt.preventDefault();
	}

	renderSelection(selection) {
		const windowSelection = getSelection();
		windowSelection.removeAllRanges();

		if (selection != null) {
			windowSelection.addRange(this.rangeFromSelection(selection));
		}
	}


	// -- React.Component

	componentDidUpdate() {
		this.renderSelection(this.props.selection);
	}

	render() {
		const { document: doc, selection, onEdit, ...restProps } = this.props;

		return (
			<EditorContainer
				innerRef={elm => this.editorContainerRef = elm}
				editable
				onKeyPress={this.handleKeyPress}
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
	}
}

export default RichText;
