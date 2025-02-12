import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomSubgraphNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => (
	<div>
		<strong>Subgraph</strong>
		<input
			value={data.name || ''}
			onChange={(e) => onChange('name', e.target.value)}
			placeholder="Subgraph Name"
		/>
	</div>
);
