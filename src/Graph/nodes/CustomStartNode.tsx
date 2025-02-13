// CustomStartNode.tsx
import React from 'react';
import {CustomNodeRenderProps} from '../CustomNodeTypes';
import {Content, Paragraph, Space} from "oakd";

export const CustomStartNode: React.FC<CustomNodeRenderProps> = ({  subGraph }) => (
    <Content grow className={"node_container"}>
        <Content pad={"vertical"}>
            <Space wide justify={"between"}>
                <Paragraph>This is the entry point to <strong>{subGraph.graphName}.</strong></Paragraph>
            </Space>
        </Content>
    </Content>
);
