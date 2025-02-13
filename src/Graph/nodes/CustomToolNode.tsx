import React from 'react';
import {CustomNodeRenderProps} from '../CustomNodeTypes';
import {Content, ContentRow, Page} from "oakd";

export const CustomToolNode: React.FC<CustomNodeRenderProps> = ({data, onChange, onBlur}) => {
	const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		onChange(field, e.target.value);
	};

	return (
		<Page style={{height:"100%"}} className={"pad-v"}>
			<Content className={"node_container"}>
				<label className="block text-xs">Description:</label>
			</Content>
			<ContentRow>

			<textarea
				value={data.description || ""}
				onChange={handleFieldChange("description")}
				onBlur={onBlur}
				className="node_container_input"
				style={{minHeight: 80, height: "100%", width:"100%", whiteSpace:"nowrap"}}
			/>


			</ContentRow>
		</Page>
	);
};
