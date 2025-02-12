import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomInfoNode: React.FC<CustomNodeRenderProps> = ({ data }) => (
	<div>
		<strong>Info</strong>
		<p>{data.message}</p>
	</div>
);
