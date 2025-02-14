// CustomNode.tsx
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Handle, Position, NodeResizeControl, useUpdateNodeInternals} from '@xyflow/react';
import {Content, DebugLayer, IconStar, IconTriangle, Page, Paragraph, Select, Space} from "oakd";
import {ReactFlowNodeEXT, ReactNodeProps} from "./NodeData";
import {CustomNodeDefinition, CustomNodePort} from "./CustomNodeTypes";
import {nodeRegistry} from "./NodeRegistry";

const baseHandleStyle: React.CSSProperties = {
    borderRadius: '50%',
    width: 14,
    height: 14,
    background: '#555'
};

function positionFromString(pos: 'top' | 'bottom' | 'left' | 'right'): Position {
    switch (pos) {
        case 'top':
            return Position.Top;
        case 'bottom':
            return Position.Bottom;
        case 'left':
            return Position.Left;
        case 'right':
            return Position.Right;
    }
}

const CustomNode: React.FC<ReactNodeProps> = ({id, width, height, data, subGraph, onNodeDataChange}) => {
    const [localData, setLocalData] = useState<ReactFlowNodeEXT>(data);
    const dataRef = useRef(data);
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const updateNodeInternals = useUpdateNodeInternals();
    const [nodeSize, setNodeSize] = useState({ width, height });

    useEffect(() => {
        if (data !== dataRef.current) {
            setLocalData(data);
            dataRef.current = data;
        }
    }, [data]);

    // A simple change handler that takes a field and its new value.
    const handleChange = useCallback((field: string, value: any) => {
        console.log("handle change", field, value);
        setLocalData(prev => ({...prev, [field]: value}));
    }, []);

    const handleBlur = useCallback(() => {
        console.log("handle blur", localData, data);

        if (localData !== data) {
            onNodeDataChange?.(id, localData);
        }
    }, [id, localData, data, onNodeDataChange]);

    // Helper to generate unique field IDs (used for the type switch)
    const generateFieldId = (fieldName: string) => `${subGraph.graphName}-${id}-${fieldName}`;

    const nodeTypeSwitch = () => (

        <Select
            id={generateFieldId("type")}
            size={"small"}
            fixed={false}
            defaultValue={localData.type}
            onSelected={(e: any) => {
                handleChange("type", e);
                if (onNodeDataChange) {
                    onNodeDataChange(id, {...localData, type: e})
                }
            }}
            //onBlur={handleBlur}
            options={[
                {value: "START", element: <Paragraph>START</Paragraph>},
                {value: "STEP", element: <Paragraph>STEP</Paragraph>},
                {value: "TOOL", element: <Paragraph>TOOL</Paragraph>},
                {value: "CONDITION", element: <Paragraph>CONDITION</Paragraph>},
                {value: "INFO", element: <Paragraph>INFO</Paragraph>},
                {value: "SUBGRAPH", element: <Paragraph>SUBGRAPH</Paragraph>},
                {value: "ACCUMULATE", element: <Paragraph>ACCUMULATE</Paragraph>},
            ]} placeholder="Node Type"/>

    );

    // Function to update size and trigger internal updates
    const updateSize = useCallback(() => {
        if (nodeRef.current) {
            const { width, height } = nodeRef.current.getBoundingClientRect();
            setNodeSize({ width, height });
            updateNodeInternals(id); // Force update to realign handles
        }
    }, [id, updateNodeInternals]);

    // Runs on mount and whenever width/height change
    useLayoutEffect(updateSize, [id, subGraph, width, height]);

    // Runs when component is re-shown in view
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            updateSize();
        });

        if (nodeRef.current) {
            observer.observe(nodeRef.current);
        }

        return () => observer.disconnect();
    }, [updateSize, id, subGraph]);

    const renderHandles = useCallback((ports: CustomNodePort[], type: 'target' | 'source', nodeId: string) => {
        const groups: Record<string, CustomNodePort[]> = {};

        ports.forEach(port => {
            if (!groups[port.position]) groups[port.position] = [];
            groups[port.position].push(port);
        });

        return Object.keys(groups).map(position => {
            const group = groups[position];

            return group.map((port, index) => {
                const style: React.CSSProperties = { position: 'absolute' };
                const isVertical = position === 'left' || position === 'right';
                const handleSize = typeof baseHandleStyle.width === 'number' ? baseHandleStyle.width : 14;

                if (isVertical) {
                    const totalHeight = group.length * handleSize;
                    const spacing = (height - totalHeight) / (group.length + 1);
                    style.top = spacing * (index + 1) + index * handleSize;
                    style[position] = 0;
                } else {
                    const totalWidth = group.length * handleSize;
                    const spacing = (width - totalWidth) / (group.length + 1);
                    style.left = spacing * (index + 1) + index * handleSize;
                    style[position] = 0;
                }

                const handleId= port.id;//`${subGraph.graphName}-${nodeId}-${position}-${port.id}`;

                return (
                    <div key={handleId} style={style}>
                        <Handle
                            type={type}
                            position={positionFromString(position as any)}
                            id={handleId}
                            style={{ ...baseHandleStyle }}
                        />
                        <Paragraph style={{ marginLeft: "8px", marginRight: "8px" }}>
                            <small>{port.label}</small>
                        </Paragraph>
                    </div>
                );
            });
        });
    }, [id, subGraph, nodeSize]);

    const nodeDef: CustomNodeDefinition =
        nodeRegistry[localData.type] || {
            type: localData.type,
            label: localData.type,
            inputs: [],
            outputs: [],
            render: ({data}) => (
                <DebugLayer label={data.type || ""}>
                    <Paragraph>NOT IMPLEMENTED</Paragraph>
                </DebugLayer>
            ),
        };

    return (
        <div
            key={`${subGraph.graphName}-${id}`}
            ref={nodeRef}
            className={["custom-node-container oakd card execution__node ",data.__EXECUTION?"node__active":undefined].filter(Boolean).join("")}
            style={{width, height, position: 'relative', minWidth: "200px", minHeight: "45px"}}
        >
            <NodeResizeControl minWidth={200} minHeight={45}>
                <IconTriangle size={"small"}/>
            </NodeResizeControl>
            {/* Render input handles */}
            {renderHandles(nodeDef.inputs, 'target', id)}
            {/* Render output handles */}
            {renderHandles(nodeDef.outputs, 'source', id)}

            <Page style={{height: "100%", overflow: "hidden", borderRadius: "inherit"}}>
                <Content className={"node__header"} pad ><Space gap justify={"between"} wide>{nodeTypeSwitch()} {data.__EXECUTION&&<IconTriangle size={"small"}/>}</Space></Content>

                {/* Call the custom render function – each custom component now handles its own fields */}
                {nodeDef.render({data: localData, onChange: handleChange, onBlur: handleBlur, subGraph:subGraph })}
            </Page>
        </div>
    );
};

export default React.memo(CustomNode);
