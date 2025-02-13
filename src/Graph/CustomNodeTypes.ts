// CustomNodeTypes.ts
import React from 'react';
import { ReactFlowNodeEXT } from "./NodeData";
import {SubGraph} from "./GraphContext.tsx";

export interface CustomNodePort {
	id: string;
	type: 'input' | 'output';
	label?: string;
	position: 'top' | 'bottom' | 'left' | 'right';
}

export interface CustomNodeRenderProps {
	data: ReactFlowNodeEXT;
	onChange: (field: string, value: any) => void;
	onBlur: () => void;
	subGraph: SubGraph;
}

export interface CustomNodeDefinition {
	type: string;
	label: string;
	inputs: CustomNodePort[];
	outputs: CustomNodePort[];
	optionalOutputs?: string[]; // IDs of optional outputs
	render: React.FC<CustomNodeRenderProps>;
}
