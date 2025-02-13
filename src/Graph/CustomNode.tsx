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

    const handleChange = useCallback((evt: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = evt.target;
        setLocalData(prev => ({ ...prev, [name]: value }))
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
                {localData.type !== 'START' && (
                    <>
                        {['STEP', 'CONDITION', 'INFO', 'SUBGRAPH'].includes(localData.type) && (
                            <div>
                                <label htmlFor={generateFieldId("name")} className="block text-xs">
                                    Name:
                                </label>
                                <input
                                    id={generateFieldId("name")}
                                    name="name"
                                    value={localData.name || ""}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                        {localData.type === 'STEP' && (
                            <div>
                                <label htmlFor={generateFieldId("tool")} className="block text-xs">
                                    Tool:
                                </label>
                                <input
                                    id={generateFieldId("tool")}
                                    name="tool"
                                    value={localData.tool || ""}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                        {['STEP', 'TOOL', 'CONDITION', 'INFO'].includes(localData.type) && (
                            <div className="flex-grow relative">
                                <label htmlFor={generateFieldId("description")} className="block text-xs">
                                    Description:
                                </label>
                                <textarea
                                    id={generateFieldId("description")}
                                    name="description"
                                    value={localData.description || ""}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className="nodrag w-full h-[calc(100%_-_20px)] absolute top-[20px] left-0 resize-none bg-white border border-gray-300 rounded focus:outline-none"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                    </>
                )}

            </Page>
            <NodeResizeControl minWidth={200} minHeight={100}>
                <IconTriangle size={"small"} />
            </NodeResizeControl>
        </div>
    );
};

export default React.memo(CustomNode);
