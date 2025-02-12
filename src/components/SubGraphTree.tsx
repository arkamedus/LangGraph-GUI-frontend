import React, { useState } from "react";
import { SubGraph } from "../Graph/GraphContext";
import { Node as XYNode } from "@xyflow/react";

// Extend the XYNode type so that our GraphNode has all required fields.
export interface GraphNode extends XYNode {
	type: string;
	data: {
		type: string;
		name: string;
		description: string;
		tool: string;
		nexts: string[];
		true_next: string | null;
		false_next: string | null;
		info: any;
		prevs: any[];
		// If this node represents a subgraph, embed it here.
		subgraph?: SubGraph;
	};
}

// Our tree component expects an array of SubGraphs.
export interface SubGraphTreeProps {
	graphs: SubGraph[];
	onSelect?: (item: SubGraph | GraphNode) => void;
}

// Helper: Check for missing connections and other status info.
const getGraphStatus = (graph: SubGraph) => {
	let missingConnections = false;
	(graph.nodes as GraphNode[]).forEach((node) => {
		if (node.data.type === "START" && (!node.data.nexts || node.data.nexts.length === 0)) {
			missingConnections = true;
		}
		if (node.data.type === "SUBGRAPH" && !node.data.subgraph) {
			missingConnections = true;
		}
	});
	return { missingConnections };
};

interface GraphTreeNodeProps {
	graph: SubGraph;
	onSelect: (item: SubGraph | GraphNode) => void;
}

const GraphTreeNode: React.FC<GraphTreeNodeProps> = ({ graph, onSelect }) => {
	const [expanded, setExpanded] = useState(true);
	const { missingConnections } = getGraphStatus(graph);

	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded((prev) => !prev);
	};

	return (
		<li>
			<div
				className="tree-node graph-node"
				onClick={() => onSelect(graph)}
				style={{ fontWeight: "bold", cursor: "pointer" }}
			>
        <span onClick={toggleExpanded} style={{ marginRight: 4 }}>
          {expanded ? "▼" : "▶"}
        </span>
				{graph.graphName} (Nodes: {graph.nodes.length})
				{missingConnections && <span style={{ color: "red" }}> ⚠ Missing Connections</span>}
			</div>
			{expanded && graph.nodes.length > 0 && (
				<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
					{(graph.nodes as GraphNode[]).map((node) => (
						<GraphNodeTreeNode key={node.id} node={node} onSelect={onSelect} />
					))}
				</ul>
			)}
		</li>
	);
};

interface GraphNodeTreeNodeProps {
	node: GraphNode;
	onSelect: (item: SubGraph | GraphNode) => void;
}

const GraphNodeTreeNode: React.FC<GraphNodeTreeNodeProps> = ({ node, onSelect }) => {
	const [expanded, setExpanded] = useState(true);
	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded((prev) => !prev);
	};
	const isSubgraph = node.data.type === "SUBGRAPH";

	return (
		<li>
			<div className="tree-node" onClick={() => onSelect(node)} style={{ cursor: "pointer" }}>
				{isSubgraph ? (
					<>
            <span onClick={toggleExpanded} style={{ marginRight: 4 }}>
              {expanded ? "▼" : "▶"}
            </span>
						{node.data.name} (Subgraph)
					</>
				) : (
					node.data.name
				)}
			</div>
			{isSubgraph && node.data.subgraph && expanded && (
				<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
					<GraphTreeNode graph={node.data.subgraph} onSelect={onSelect} />
				</ul>
			)}
		</li>
	);
};

const SubGraphTree: React.FC<SubGraphTreeProps> = ({ graphs, onSelect = () => {} }) => {
	return (
		<div className="subgraph-tree">
			<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
				{graphs.map((graph) => (
					<GraphTreeNode key={graph.graphName} graph={graph} onSelect={onSelect} />
				))}
			</ul>
		</div>
	);
};

export default SubGraphTree;
