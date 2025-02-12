// CustomStartNode.tsx
import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomStartNode: React.FC<CustomNodeRenderProps> = ({ data }) => (
	<div>
		<strong>Start NODE</strong>
		<p>{data.name}</p>
	</div>
);
