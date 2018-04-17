import React from 'react';

import Doc from '../model/Doc';
import ParagraphUtils from '../model/Paragraph';
import * as Edit from '../model/Edit';
import * as DocPointer from '../model/DocPointer';
import * as DocSelection from '../model/DocSelection';
import * as EditorCommand from './EditorCommand';

const k = {
	paragraphIDAttributeKey: 'data-paragraph-id'
};

const errorMessages = {
	couldNotFindParagraphIDForSelectionAnchor: anchorNode => `Could not find paragraph ID for selection anchor node: ${anchorNode}.`,
	couldNotFindParagraphIDForSelectionFocus: focusNode => `Could not find paragraph ID for selection focus node: ${focusNode}.`,
	selectNontextNode: selection => `Attempted selection on non-text nodes: ${selection}`,
	queryingForParagraphBeforeReceivedRef: `Attempted to calculate DOM node and offset before receiving ref.`,
};


// -- Helper functions

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
	const anchor = DocPointer.make(anchorParagraphID, selection.anchorOffset);
	const focus = DocPointer.make(focusParagraphID, selection.focusOffset);
	return DocSelection.make(anchor, focus);
}

function getSelection() {
	// TODO: Cross-browser support
	return window.getSelection();
}


// -- Helper components

// Renders a paragraph as a <p> node with a data- attribute containing the paragraph ID.
const Paragraph = ({ paragraph, id, ...restProps }) => (
	<p
		{...{ [k.paragraphIDAttributeKey]: id }}
		{...restProps}
	>
		{ParagraphUtils.contents(paragraph).map(content => (
			<ParagraphContent>
				{content}
			</ParagraphContent>
		))}
	</p>
);

const ParagraphContent = ({ children, ...restProps }) => (
	children.text
);

const EditorContainer = ({ editable = false, innerRef, ...restProps }) => (
	<div
		ref={innerRef}
		contentEditable={editable}
		{...restProps}
	/>
);


// -- 

// document :: Doc
// selection :: DocSelection?
// onEdit :: Edit -> ()
class Composer extends React.Component {
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
			`[${k.paragraphIDAttributeKey}="${paragraphID}"]`;
		return this.editorContainerRef.querySelector(selectorForParagraphID);
	}
	
	// nodeAndOffsetFromPointer :: (DocPointer) -> { node: Node, offset: number }?
	// Returns the text node and offset within that node for the specified `DocPointer`.
	nodeAndOffsetFromPointer(pointer) {
		const node = this.queryParagraphNode(pointer.key);
		if (node == null) {
			return null;
		}

		// TODO: This assumes that all tagged paragraphs have a single text node as a child.
		const textNode = node.firstChild;
		if (textNode == null) {
			// TODO: Uncertain what to do here.
			// One case that leads here is an empty <p> node.
			throw new Error(`No text node for paragraph ${pointer.key}`);
		}

		return { node: textNode, offset: pointer.offset };
	}

	// rangeFromSelection :: DocSelection -> Range
	rangeFromSelection(selection) {
		const pointerRange =
			Doc.pointerRangeFromSelection(selection, this.props.document);

		const start =
			this.nodeAndOffsetFromPointer(pointerRange.start);
		const end =
			this.nodeAndOffsetFromPointer(pointerRange.end);

		const range = document.createRange();
		range.setStart(start.node, start.offset);
		range.setEnd(end.node, end.offset);
		return range;
	}


	// -- Events

	handleKeyPress(evt) {
		function editForCommand(command) {
			switch (command.type) {
				case EditorCommand.types.text:
					return Edit.replaceText(
							docSelectionFromNativeSelection(getSelection()),
							command.text);

				case EditorCommand.types.paragraphBreak:
					return Edit.replaceTextWithParagraphBreak(
						docSelectionFromNativeSelection(getSelection()));

				default:
					console.error("Unrecognized command type", command.type);
					return null;
			}
		}

		const command = EditorCommand.fromKeyEvent(evt);

		if (command != null) {
			const edit = editForCommand(command);
			this.props.onEdit(edit);
			evt.preventDefault();
		}
	}

	// renderSelection :: DocSelection? -> ()
	// Sets the browser's selection range to the specified document selection.
	// If a null selection is provided, clears the browser selection range.
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
				suppressContentEditableWarning
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

export default Composer;

