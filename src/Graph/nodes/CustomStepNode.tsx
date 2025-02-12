import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';
import {Content, ContentRow} from "oakd";

export const CustomStepNode: React.FC<CustomNodeRenderProps> = ({ data, onChange }) => {
	const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
		onChange(field, e.target.value);
	};


	return (

		<>
			<Content>
				<div>
					{/* Name */}
					<label className="block text-xs">Name:</label>
					<input
						value={data.name || ""}
						onChange={handleFieldChange("name")}
						className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
					/>

					{/* Tool */}
					<label className="block text-xs">Tool:</label>
					<input
						value={data.tool || ""}
						onChange={handleFieldChange("tool")}
						className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
					/>

					{/* Description */}
					<label className="block text-xs">Description:</label>

				</div>
			</Content>
			<ContentRow>

			<textarea
				value={data.description || ""}
				onChange={handleFieldChange("description")}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
				style={{ minHeight: 80 }}
			/>


			</ContentRow>
		</>

	);
};
