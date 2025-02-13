// CustomStepNode.tsx
import React from 'react';
import {CustomNodeRenderProps} from '../CustomNodeTypes';
import {Content, ContentRow, Page} from "oakd";

export const CustomAccumulatorNode: React.FC<CustomNodeRenderProps> = ({data, onChange, onBlur}) => {
	const handleFieldChange = (field: string) => (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		onChange(field, e.target.value);
	};

	return (
		<Page style={{height: "100%"}} className={"pad-v"}>
			<Content>
				<div className={"node_container"}>
					<label className="block text-xs">Name:</label>
					<input
						value={data.name || ""}
						onChange={handleFieldChange("name")}
						onBlur={onBlur}
						className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
					/>
					<label className="block text-xs">Description:</label>
				</div>
			</Content>
			<ContentRow >
                <textarea
					value={data.description || ""}
					onBlur={onBlur}
					onChange={handleFieldChange("description")}
					className="node_container_input"
					style={{minHeight: 80, width: "100%"}}
				/>
			</ContentRow>
		</Page>
	);
};
