import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';

export const CustomConditionNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => {
	const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
		onChange(field, e.target.value);
	};

	return (
		<div>
			{/* Name */}
			<label className="block text-xs">Name:</label>
			<input
				value={data.name || ""}
				onChange={handleFieldChange("name")}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
			/>

			{/* Description */}
			<label className="block text-xs">Description:</label>
			<textarea
				value={data.description || ""}
				onChange={handleFieldChange("description")}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
				style={{ minHeight: 40 }}
			/>

			{/* Condition Expression */}
			<label className="block text-xs">Condition Expression:</label>
			<input
				value={data.condition || ""}
				onChange={handleFieldChange("condition")}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
			/>
		</div>
	);
};
