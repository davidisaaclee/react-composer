import React from 'react';
import * as R from 'ramda';
import * as Doc from './Doc';
import * as ParagraphUtils from './Paragraph';

const Paragraph = ({ paragraph, ...restProps }) => (
	<p {...restProps}>
		{ParagraphUtils.content(paragraph)}
	</p>
);

const RichText = ({ document: doc, children }) => (
	<div>
		{Doc.paragraphList(doc).map(({ id, paragraph }) => (
			<Paragraph key={id} paragraph={paragraph} />
		))}
	</div>
);

export default RichText;

