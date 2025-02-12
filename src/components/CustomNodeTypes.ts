// CustomNodeTypes.ts
import React from 'react';
import {ReactFlowNodeEXT} from "../Graph/NodeData.ts";

export interface CustomNodePort {
	id: string;
	type: 'input' | 'output';
	label?: string;
	position: 'top' | 'bottom' | 'left' | 'right';
}

export interface CustomNodeRenderProps {
	data: ReactFlowNodeEXT;
	onChange: (field: string, value: any) => void;
}

export interface CustomNodeDefinition {
	type: string;
	label: string;
	inputs: CustomNodePort[];
	outputs: CustomNodePort[];
	render: React.FC<CustomNodeRenderProps>;
}
