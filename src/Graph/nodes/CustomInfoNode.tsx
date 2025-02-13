import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';
import {Content, ContentRow, Page} from "oakd";

export const CustomInfoNode: React.FC<CustomNodeRenderProps> = ({ data, onChange, onBlur }) => {
    const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(field, e.target.value);
    };

    return (
        <Page style={{height: "100%"}} className={"pad-v"}>
            <Content>
            {/* Name */}
            <label className="block text-xs">Name:</label>
            <input
                defaultValue={data.name || ""}
                onChange={(e) => onChange("name", e.target.value)}
                onBlur={onBlur}
                className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
            />
            </Content>
            {/* Description */}
            <Content>
            <label className="block text-xs">Description:</label>
            <textarea
                value={data.description || ""}
                onChange={handleFieldChange("description")}
                onBlur={onBlur}
                className=""
                style={{ minHeight: 80, width: "100%", height:"100%" }}
            />
            </Content>
            <ContentRow>
            <textarea
                style={{ minHeight: 80, width: "100%", height:"100%" }}
            value={JSON.stringify(data)}/>
            </ContentRow>
        </Page>
    );
};
