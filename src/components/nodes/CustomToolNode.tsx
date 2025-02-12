import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';
import {Space} from "oakd";

export const CustomToolNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => (
	<Space wide>
		<strong>Tool</strong>
		<input
			value={data.name || ''}
			onChange={(e) => onChange('name', e.target.value)}
			placeholder="Tool Name"
		/>
		<textarea
			style={{width:"100%"}}
			value={data.description || ''}
			onChange={(e) => onChange('description', e.target.value)}
			placeholder="Description"
		/>
	</Space>
);
