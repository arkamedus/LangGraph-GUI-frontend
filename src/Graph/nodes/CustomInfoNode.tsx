import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomInfoNode: React.FC<CustomNodeRenderProps> = ({ data, onChange, onBlur }) => {
	const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(field, e.target.value);
	};

	return (
		<div className={"node_container"}>
			{/* Name */}
			<label className="block text-xs">Name:</label>
			<input
				value={data.name || ""}
				onChange={(e) => onChange("name", e.target.value)}
				onBlur={onBlur}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
			/>

			{/* Description */}
			<label className="block text-xs">Description:</label>
			<textarea
				value={data.description || ""}
				onChange={handleFieldChange("description")}
				onBlur={onBlur}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
				style={{ minHeight: 80 }}
			/>
		</div>
	);
};
