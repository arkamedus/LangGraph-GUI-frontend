import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomConditionNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => (
	<div>
		<strong>Condition</strong>
		<input
			value={data.condition || ''}
			onChange={(e) => onChange('condition', e.target.value)}
			placeholder="Condition Expression"
		/>
	</div>
);
