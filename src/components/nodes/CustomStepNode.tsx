// CustomStepNode.tsx
import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomStepNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => (
	<div>
		<strong>Step</strong>
		<input
			value={data.name || ''}
			onChange={(e) => onChange('name', e.target.value)}
			onBlur={() => {}}
			placeholder="Name"
		/>
		<textarea
			value={data.description || ''}
			onChange={(e) => onChange('description', e.target.value)}
			onBlur={() => {}}
			placeholder="Description"
		/>
	</div>
);
