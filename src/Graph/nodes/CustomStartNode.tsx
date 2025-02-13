// CustomStartNode.tsx
import React from 'react';
import { CustomNodeRenderProps } from '../CustomNodeTypes';
import {Content, IconCircle, Paragraph, Space} from "oakd";

export const CustomStartNode: React.FC<CustomNodeRenderProps> = ({ data }) => (
	<Content grow className={"node_container"}>
		<Content pad={"vertical"}>
		<Space wide justify={"between"}>
			<Paragraph>This is the entry point to this SubGraph</Paragraph>
		</Space>
		</Content>
	</Content>
);
