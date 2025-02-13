import React from 'react';
import {CustomNodeRenderProps} from '../CustomNodeTypes';
import {Content, Page} from "oakd";

// Extended to include optional onBlur prop in the destructuring
export const CustomConditionNode: React.FC<CustomNodeRenderProps & { onBlur?: () => void }> = ({
																								   data,
																								   onChange,
																								   onBlur,
																							   }) => {
    // local function for changes
    const handleFieldChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        onChange(field, e.target.value);
    };

    // For each input/textarea, we wire up `onBlur={() => onBlur?.()}` to finalize
    return (
        <Page style={{height: "100%"}} className={"pad-v"}>
            <Content className={"node_container"}>

                {/* Name */}
                <label className="block text-xs">Name:</label>
                <input
                    value={data.name || ''}
                    onChange={handleFieldChange('name')}

                    onBlur={onBlur}
                    className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
                />
            </Content>

            {/* Description */}

            <Content className={"node_container"}>
                <label className="block text-xs">Description:</label>
            </Content>
            <Content grow className={"node_container"}>
                <textarea
                    value={data.description || ''}
                    onChange={handleFieldChange('description')}
                    onBlur={onBlur}
                    className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none mb-2"
                    style={{minHeight: 40, width: "100%", height: "100%"}}
                />
            </Content>
            <Content className={"node_container"}>
							  {/* Condition Expression */}
								  <label className="block text-xs">Condition Expression:</label>
								  <input
									  value={data.condition || ''}
									  onChange={handleFieldChange('condition')}
									  onBlur={onBlur}
									  className="nodrag w-full bg-white border border-gray-300 rounded focus:outline-none"
								  />
            </Content>

        </Page>
    );
};
