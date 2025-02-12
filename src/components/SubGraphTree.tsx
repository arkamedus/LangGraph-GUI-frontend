import React, { useState } from "react";
import { SubGraph } from "../Graph/GraphContext";
import { Node as XYNode } from "@xyflow/react";

// Extend XYNode so our GraphNode has required fields.
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

// Updated onSelect now accepts an ancestry array so that the payload includes
// which subtree the selected item belongs to.
export interface SubGraphTreeProps {
	graphs: SubGraph[];
	onSelect?: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete?: (item: SubGraph | GraphNode) => void;
}

// Helper: determine if a graph is missing connections.
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
	ancestry: SubGraph[]; // ancestry: parent subgraphs leading to this one
	onSelect: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphTreeNode: React.FC<GraphTreeNodeProps> = ({ graph, ancestry, onSelect, onDelete, topGraphNames }) => {
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
				onClick={(e) => {
					e.stopPropagation();
					onSelect(graph, ancestry);
				}}
				style={{ fontWeight: "bold", cursor: "pointer" }}
			>
        <span onClick={toggleExpanded} style={{ marginRight: 4 }}>
          {expanded ? "▼" : "▶"}
        </span>
				{graph.graphName} (Nodes: {graph.nodes.length})
				{missingConnections && <span style={{ color: "red" }}> ⚠ Missing Connections</span>}
				{onDelete && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(graph);
						}}
						style={{ marginLeft: 8 }}
					>
						Delete
					</button>
				)}
			</div>
			{expanded && graph.nodes && graph.nodes.length > 0 && (
				<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
					{(graph.nodes as GraphNode[]).map((node) => (
						<GraphNodeTreeNode
							key={node.id}
							node={node}
							// For nodes inside this subgraph, extend ancestry with the current graph.
							ancestry={[...ancestry, graph]}
							onSelect={onSelect}
							onDelete={onDelete}
							topGraphNames={topGraphNames}
						/>
					))}
				</ul>
			)}
		</li>
	);
};

interface GraphNodeTreeNodeProps {
	node: GraphNode;
	ancestry: SubGraph[];
	onSelect: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphNodeTreeNode: React.FC<GraphNodeTreeNodeProps> = ({ node, ancestry, onSelect, onDelete, topGraphNames }) => {
	const [expanded, setExpanded] = useState(false);
	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded((prev) => !prev);
	};
	const isSubgraph = node.data.type === "SUBGRAPH" && !!node.data.subgraph;
	// Avoid nesting if the subgraph is already rendered at the top level.
	const shouldRenderNested = isSubgraph && !topGraphNames.has(node.data.subgraph!.graphName);

	return (
		<li>
			<div
				className="tree-node node"
				onClick={(e) => {
					e.stopPropagation();
					onSelect(node, ancestry);
				}}
				style={{ cursor: "pointer" }}
			>
				{isSubgraph && (
					<span onClick={toggleExpanded} style={{ marginRight: 4 }}>
            {expanded ? "▼" : "▶"}
          </span>
				)}
				{node.data.name} ({node.data.type})
				{onDelete && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(node);
						}}
						style={{ marginLeft: 8 }}
					>
						Delete
					</button>
				)}
			</div>
			{shouldRenderNested && expanded && (
				<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
					<GraphTreeNode
						graph={node.data.subgraph!}
						ancestry={[...ancestry, node.data.subgraph!]}
						onSelect={onSelect}
						onDelete={onDelete}
						topGraphNames={topGraphNames}
					/>
				</ul>
			)}
		</li>
	);
};

const SubGraphTree: React.FC<SubGraphTreeProps> = ({ graphs, onSelect = () => {}, onDelete }) => {
	const topGraphNames = new Set(graphs.map((g) => g.graphName));

	return (
		<div className="subgraph-tree">
			<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
				{graphs.map((graph) => (
					<GraphTreeNode
						key={graph.graphName}
						graph={graph}
						ancestry={[]}
						onSelect={onSelect}
						onDelete={onDelete}
						topGraphNames={topGraphNames}
					/>
				))}
			</ul>
		</div>
	);
};

export default SubGraphTree;
