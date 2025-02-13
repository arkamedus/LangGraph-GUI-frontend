// CustomNode.tsx
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Handle, Position, NodeResizeControl} from '@xyflow/react';
import {Content, DebugLayer, IconTriangle, Page, Paragraph, Select, Space} from "oakd";
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

const CustomNode: React.FC<ReactNodeProps> = ({id, width, height, data, onNodeDataChange}) => {
	const [localData, setLocalData] = useState<ReactFlowNodeEXT>(data);
	const dataRef = useRef(data);

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
	const generateFieldId = (fieldName: string) => `${id}-${fieldName}`;

	const nodeTypeSwitch = () => (

		<Select
			id={generateFieldId("type")}
			size={"small"}
			fixed={false}
			defaultValue={localData.type}
			onSelected={(e: any) => {
				handleChange("type", e);
				if (onNodeDataChange){onNodeDataChange(id, {...localData,type:e})};
			}}
			//onBlur={handleBlur}
			options={[
				{value: "START", element: <Paragraph>START</Paragraph>},
				{value: "STEP", element: <Paragraph>STEP</Paragraph>},
				{value: "TOOL", element: <Paragraph>TOOL</Paragraph>},
				{value: "CONDITION", element: <Paragraph>CONDITION</Paragraph>},
				{value: "INFO", element: <Paragraph>INFO</Paragraph>},
				{value: "SUBGRAPH", element: <Paragraph>SUBGRAPH</Paragraph>},
			]} placeholder="Node Type"/>

	);

	// Render handles for inputs/outputs
	const renderHandles = (ports: CustomNodePort[], type: 'target' | 'source') => {
		const groups: Record<string, CustomNodePort[]> = {};
		ports.forEach(port => {
			if (!groups[port.position]) groups[port.position] = [];
			groups[port.position].push(port);
		});

		return Object.keys(groups).map(position => {
			const group = groups[position];
			return group.map((port, index) => {
				const style: React.CSSProperties = {position: 'absolute'};
				if (position === 'left' || position === 'right') {
					const handleHeight = baseHandleStyle.height;
					const totalHandlesHeight = group.length * (typeof handleHeight === 'number' ? handleHeight : 14);
					const availableHeight = height - totalHandlesHeight;
					const spacing = availableHeight / (group.length + 1);
					style.top = spacing * (index + 1) + index * (typeof handleHeight === 'number' ? handleHeight : 14);
					style[position] = 0;
				} else if (position === 'top' || position === 'bottom') {
					const handleWidth = baseHandleStyle.width;
					const totalHandlesWidth = group.length * (typeof handleWidth === 'number' ? handleWidth : 14);
					const availableWidth = width - totalHandlesWidth;
					const spacing = availableWidth / (group.length + 1);
					style.left = spacing * (index + 1) + index * (typeof handleWidth === 'number' ? handleWidth : 14);
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
						<Paragraph style={{marginLeft: "8px", marginRight: "8px"}}>
							<small>{port.label}</small>
						</Paragraph>
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
			render: ({data}) => (
				<DebugLayer label={data.type || ""}>
					<Paragraph>NOT IMPLEMENTED</Paragraph>
				</DebugLayer>
			),
		};

	return (
		<div
			className="custom-node-container oakd card"
			style={{width, height, position: 'relative', minWidth:"200px", minHeight:"45px"}}
		>
			{/* Render input handles */}
			{renderHandles(nodeDef.inputs, 'target')}
			{/* Render output handles */}
			{renderHandles(nodeDef.outputs, 'source')}

			<Page style={{height: "100%", overflow:"hidden", borderRadius:"inherit"}}>
				<Content style={{background:"#ebf6f6"}} pad><Space gap>{nodeTypeSwitch()}</Space></Content>

				{/* Call the custom render function – each custom component now handles its own fields */}
				{nodeDef.render({data: localData, onChange: handleChange, onBlur: handleBlur})}
			</Page>
			<NodeResizeControl minWidth={200} minHeight={45}>
				<IconTriangle size={"small"}/>
			</NodeResizeControl>
		</div>
	);
};

export default React.memo(CustomNode);
