import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeResizeControl } from '@xyflow/react';
import { Content, DebugLayer, IconTriangle, Page, Paragraph } from "oakd";
import { ReactFlowNodeEXT, ReactNodeProps } from "./NodeData";
import { CustomNodeDefinition, CustomNodePort } from "./CustomNodeTypes";
import { nodeRegistry } from "./NodeRegistry";

const baseHandleStyle = {
    borderRadius: '50%',
    width: 14,
    height: 14,
    background: '#555'
};

function positionFromString(pos: 'top' | 'bottom' | 'left' | 'right'): Position {
    switch (pos) {
        case 'top': return Position.Top;
        case 'bottom': return Position.Bottom;
        case 'left': return Position.Left;
        case 'right': return Position.Right;
    }
}

const CustomNode: React.FC<ReactNodeProps> = ({ id, width, height, data, onNodeDataChange }) => {
    const [localData, setLocalData] = useState<ReactFlowNodeEXT>(data);
    const dataRef = useRef(data);

    useEffect(() => {
        if (data !== dataRef.current) {
            setLocalData(data);
            dataRef.current = data;
        }
    }, [data]);

    const handleChange = useCallback((field: string, value: any) => {
        setLocalData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleBlur = useCallback(() => {
        if (localData !== data) {
            onNodeDataChange?.(id, localData);
        }
    }, [id, localData, data, onNodeDataChange]);

    // Helper to generate unique field IDs
    const generateFieldId = (fieldName: string) => `${id}-${fieldName}`;

    const nodeTypeSwitch = () => (
        <div>
            <label htmlFor={generateFieldId("type")} className="block text-xs">
                Type:
            </label>
            <select
                id={generateFieldId("type")}
                name="type"
                value={localData.type}
                onChange={(e) => handleChange("type", e.target.value)}
                onBlur={handleBlur}
                className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
                autoComplete="off"
            >
                <option value="START">START</option>
                <option value="STEP">STEP</option>
                <option value="TOOL">TOOL</option>
                <option value="CONDITION">CONDITION</option>
                <option value="INFO">INFO</option>
                <option value="SUBGRAPH">SUBGRAPH</option>
            </select>
        </div>
    );

    // Render handles and stack them vertically/horizontally
    const renderHandles = (ports: CustomNodePort[], type: 'target' | 'source') => {
        const groups: Record<string, CustomNodePort[]> = {};
        ports.forEach(port => {
            if (!groups[port.position]) groups[port.position] = [];
            groups[port.position].push(port);
        });

        return Object.keys(groups).map(position => {
            const group = groups[position];
            return group.map((port, index) => {
                const style: React.CSSProperties = { position: 'absolute' };
                if (position === 'left' || position === 'right') {
                    const handleHeight = baseHandleStyle.height;
                    const totalHandlesHeight = group.length * handleHeight;
                    const availableHeight = height - totalHandlesHeight;
                    const spacing = availableHeight / (group.length + 1);
                    style.top = spacing * (index + 1) + index * handleHeight;
                    style[position] = 0;
                } else if (position === 'top' || position === 'bottom') {
                    const handleWidth = baseHandleStyle.width;
                    const totalHandlesWidth = group.length * handleWidth;
                    const availableWidth = width - totalHandlesWidth;
                    const spacing = availableWidth / (group.length + 1);
                    style.left = spacing * (index + 1) + index * handleWidth;
                    style[position] = 0;
                }
                return (
                    <div key={port.id} style={style}>
                        <Handle
                            type={type}
                            position={positionFromString(position as any)}
                            id={port.id}
                            style={baseHandleStyle}
                        />
                        <Paragraph style={{ marginLeft: "8px", marginRight: "8px"}}><small>{port.label}</small></Paragraph>

                    </div>
                );
            });
        });
    };

    const nodeDef: CustomNodeDefinition =
        nodeRegistry[localData.type] || {
            type: localData.type,
            label: localData.type,
            inputs: [],
            outputs: [],
            render: ({ data, onChange }) => (
                <DebugLayer label={data.type || ""}>
                    <Paragraph>NOT IMPLEMENTED</Paragraph>
                </DebugLayer>
            ),
        };

    return (
        <div
            className="custom-node-container oakd card pad"
            style={{
                width,
                height,
                position: 'relative'
            }}
        >
            {/* Render input handles */}
            {renderHandles(nodeDef.inputs, 'target')}
            {/* Render output handles */}
            {renderHandles(nodeDef.outputs, 'source')}
            <Page  style={{padding:"0 32px", height:"100%"}}>
                <Content>
                    {nodeTypeSwitch()}
                </Content>
                {nodeDef.render({ data: localData, onChange: handleChange })}
            </Page>
            <NodeResizeControl minWidth={200} minHeight={200}>
                <IconTriangle />
            </NodeResizeControl>
        </div>
    );
};

export default React.memo(CustomNode);
