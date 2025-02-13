import { CustomNodeDefinition } from './CustomNodeTypes';
import { CustomStartNode } from './nodes/CustomStartNode.tsx';
import { CustomStepNode } from './nodes/CustomStepNode.tsx';
import { CustomToolNode } from './nodes/CustomToolNode.tsx';
import { CustomConditionNode } from './nodes/CustomConditionNode.tsx';
import { CustomInfoNode } from './nodes/CustomInfoNode.tsx';
import { CustomSubgraphNode } from './nodes/CustomSubgraphNode.tsx';
import {CustomAccumulatorNode} from "./nodes/CustomAccumulatorNode.tsx";

export const nodeRegistry: { [type: string]: CustomNodeDefinition } = {
    START: {
        type: 'START',
        label: 'Start Node',
        inputs: [],
        outputs: [{ id: 'next', type: 'output', position: 'right', label: 'Next' }],
        optionalOutputs: ["next"],
        render: CustomStartNode,
    },
    ACCUMULATE: {
        type: 'ACCUMULATE',
        label: 'Accumulate',
        inputs: [{ id: 'prev', type: 'input', position: 'left', label: 'Prev' }],
        outputs: [{ id: 'next', type: 'output', position: 'right', label: 'Next' }],
        optionalOutputs: ["next"],
        render: CustomAccumulatorNode,
    },
    STEP: {
        type: 'STEP',
        label: 'Step Node',
        inputs: [{ id: 'prev', type: 'input', position: 'left', label: 'Prev' }],
        outputs: [{ id: 'next', type: 'output', position: 'right', label: 'Next' }],
        optionalOutputs: ["next"],
        render: CustomStepNode,
    },
    TOOL: {
        type: 'TOOL',
        label: 'Tool Node',
        inputs: [{ id: 'prev', type: 'input', position: 'left', label: 'Prev' }],
        outputs: [{ id: 'next', type: 'output', position: 'right', label: 'Next' }],
        render: CustomToolNode,
    },
    CONDITION: {
        type: 'CONDITION',
        label: 'Condition Node',
        inputs: [{ id: 'prev', type: 'input', position: 'left', label: 'Prev' }],
        outputs: [
            { id: 'true', type: 'output', position: 'right', label: 'True' },
            { id: 'false', type: 'output', position: 'right', label: 'False' }
        ],
        render: CustomConditionNode,
    },
    INFO: {
        type: 'INFO',
        label: 'Info Node',
        inputs: [{ id: 'prev', type: 'input', position: 'left', label: 'Prev' }],
        outputs: [],
        render: CustomInfoNode,
    },
    SUBGRAPH: {
        type: 'SUBGRAPH',
        label: 'Subgraph Node',
        inputs: [{ id: 'entry', type: 'input', position: 'left', label: 'Entry' }],
        outputs: [{ id: 'exit', type: 'output', position: 'right', label: 'Exit' }],
        optionalOutputs: ["exit"],
        render: CustomSubgraphNode,
    },
};