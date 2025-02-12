// NodeRegistry.ts
import { CustomNodeDefinition } from './CustomNodeTypes';
import {CustomStartNode} from "./nodes/CustomStartNode.tsx";
import {CustomStepNode} from "./nodes/CustomStepNode.tsx";
// … add other custom node components as needed

export const nodeRegistry: { [type: string]: CustomNodeDefinition } = {
	START: {
		type: 'START',
		label: 'Start Node',
		inputs: [],
		outputs: [{ id: 'next', type: 'output', position: 'right', label: 'Next' },{ id: 'next', type: 'output', position: 'right', label: 'Next' }],
		render: CustomStartNode,
	},
	STEP: {
		type: 'STEP',
		label: 'Step Node',
		inputs: [{ id: 'prev', type: 'input', position: 'left', label: 'Prev' }],
		outputs: [{ id: 'next', type: 'output', position: 'right', label: 'Next' }],
		render: CustomStepNode,
	},
	// Add additional node types like CONDITION, TOOL, INFO, SUBGRAPH...
};
