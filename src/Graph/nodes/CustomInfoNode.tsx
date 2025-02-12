import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomInfoNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => {
	const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(field, e.target.value);
	};

	return (
		<div>
			{/* Name */}
			<label className="block text-xs">Name:</label>
			<input
				value={data.name || ""}
				onChange={(e) => onChange("name", e.target.value)}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
			/>

			{/* Description */}
			<label className="block text-xs">Description:</label>
			<textarea
				value={data.description || ""}
				onChange={handleFieldChange("description")}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
				style={{ minHeight: 80 }}
			/>
		</div>
	);
};
