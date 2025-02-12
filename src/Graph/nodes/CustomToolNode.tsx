import React from 'react';
import {CustomNodeRenderProps} from '../CustomNodeTypes';
import {Content, ContentRow} from "oakd";

export const CustomToolNode: React.FC<CustomNodeRenderProps> = ({data, onChange}) => {
	const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		onChange(field, e.target.value);
	};

	return (
		<>
			<Content>
				<label className="block text-xs">Description:</label>
			</Content>
			<ContentRow>

			<textarea
				value={data.description || ""}
				onChange={handleFieldChange("description")}
				className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
				style={{minHeight: 80, height: "100%"}}
			/>


			</ContentRow>
		</>
	);
};
