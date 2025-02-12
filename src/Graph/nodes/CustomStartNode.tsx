
// CustomStartNode.tsx
import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';
import {IconCircle, Space} from "oakd";

export const CustomStartNode: React.FC<CustomNodeRenderProps> = ({ data }) => (
	<div>
		<Space wide justify={"between"}><strong>Start NODE</strong><IconCircle size={"small"}/></Space>
		<p>{data.name}</p>
	</div>
);