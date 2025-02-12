import React, {useEffect, useState} from "react";
import { SubGraph } from "../Graph/GraphContext";
import { Node as XYNode } from "@xyflow/react";
import {nodeRegistry} from "./NodeRegistry.ts";
import {Button, IconTriangle, Paragraph, Space} from "oakd";

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
	const missingNodes: string[] = [];
	const nodeMap = new Map<string, GraphNode>();
	const prevsMap = new Map<string, string[]>(); // Stores derived prevs from edges

	// Map nodes by ID
	(graph.nodes as GraphNode[]).forEach((node) => {
		nodeMap.set(node.id, node);
		prevsMap.set(node.id, []);
	});

	// Populate prevs from edges
	(graph.edges || []).forEach((edge) => {
		if (prevsMap.has(edge.target)) {
			prevsMap.get(edge.target)!.push(edge.source);
		}
	});

	// Validate each node
	nodeMap.forEach((node) => {
		const expectedInputs = nodeRegistry[node.data.type]?.inputs || [];
		const expectedOutputs = nodeRegistry[node.data.type]?.outputs || [];
		const actualPrevs = prevsMap.get(node.id) || [];

		// Assign `prevs` if missing
		if (node.data.prevs.length === 0 && actualPrevs.length > 0) {
			node.data.prevs = actualPrevs;
		}

		// Check for missing connections
		if (expectedInputs.length > 0 && actualPrevs.length === 0 && node.data.type !== "START") {
			missingNodes.push(`${node.data.name} (${node.data.type}) has no incoming connections`);
		}
		if (expectedOutputs.length > 0 && node.data.nexts.length === 0) {
			missingNodes.push(`${node.data.name} (${node.data.type}) has no outgoing connections`);
		}
		if (node.data.type === "CONDITION" && (!node.data.true_next || !node.data.false_next)) {
			missingNodes.push(`${node.data.name} (CONDITION) is missing true/false branches`);
		}
	});

	return { missingNodes };
};



interface GraphTreeNodeProps {
	graph: SubGraph;
	ancestry: SubGraph[]; // ancestry: parent subgraphs leading to this one
	onSelect: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphNodeTreeNode: React.FC<GraphNodeTreeNodeProps> = ({ node, ancestry, onSelect, onDelete }) => {
	const [expanded, setExpanded] = useState(false);
	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded((prev) => !prev);
	};
	const isSubgraph = node.data.type === "SUBGRAPH" && !!node.data.subgraph;

	const warnings: string[] = [];
	if (node.data.prevs.length === 0 && node.data.type !== "START") warnings.push("No incoming connections");
	if (node.data.nexts.length === 0 && ["STEP", "TOOL", "INFO"].includes(node.data.type)) warnings.push("No outgoing connections");
	if (node.data.type === "CONDITION" && (!node.data.true_next || !node.data.false_next)) warnings.push("Missing true/false branches");

	return (
		<div>
			<div className="tree-node node" onClick={(e) => { e.stopPropagation(); onSelect(node, ancestry); }} style={{ cursor: "pointer" }}>
				{isSubgraph && <span onClick={toggleExpanded} style={{ marginRight: 4 }}>{expanded ? "▼" : "▶"}</span>}
				{node.data.name} ({node.data.type})
				{warnings.length > 0 && <span style={{ color: "red" }}> ⚠ {warnings.join(", ")}</span>}
				{onDelete && (
					<button onClick={(e) => { e.stopPropagation(); onDelete(node); }} style={{ marginLeft: 8 }}>Delete</button>
				)}
			</div>
			{isSubgraph && expanded && (
				<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
					<GraphTreeNode graph={node.data.subgraph!} ancestry={[...ancestry, node.data.subgraph!]} onSelect={onSelect} onDelete={onDelete} topGraphNames={new Set()} />
				</ul>
			)}
		</div>
	);
};


interface GraphNodeTreeNodeProps {
	node: GraphNode;
	ancestry: SubGraph[];
	onSelect: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphTreeNode: React.FC<GraphTreeNodeProps> = ({ graph, ancestry, onSelect, onDelete, topGraphNames }) => {
	const [expanded, setExpanded] = useState(true);
	const { missingNodes } = getGraphStatus(graph);

	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded((prev) => !prev);
	};

	return (
		<div>
			<div onClick={(e:any) => { e.stopPropagation(); onSelect(graph, ancestry); }} ><Space className="tree-node graph-node" align={"center"} style={{ fontWeight: "bold", cursor: "pointer" }}>
				<Paragraph>
					<span onClick={toggleExpanded}>
					{expanded ? "▼" : "▶"}
				</span>
				{graph.graphName} (Nodes: {graph.nodes.length})
				{missingNodes.length > 0 && <span style={{ color: "red" }}> <IconTriangle size={"small"}/> {/*{missingNodes.length} Node(s) Missing Connections*/}</span>}
				{onDelete && (
					<Button size={"small"} icon={"Trash"} type={"danger"} onClick={(e) => { e.stopPropagation(); onDelete(graph); }}/>
				)}
				</Paragraph>
			</Space></div>
			{expanded && (
				<Paragraph><div style={{ listStyle: "none", paddingLeft: "1em" }}>
					{(graph.nodes as GraphNode[]).map((node) => (
						<GraphNodeTreeNode key={node.id} node={node} ancestry={[...ancestry, graph]} onSelect={onSelect} onDelete={onDelete} topGraphNames={topGraphNames} />
					))}
				</div></Paragraph>
			)}
		</div>
	);
};


const SubGraphTree: React.FC<SubGraphTreeProps> = ({ graphs, onSelect = () => {}, onDelete }) => {
	const [updatedGraphs, setUpdatedGraphs] = useState(graphs);

	useEffect(() => {
		// Reconstruct prevs for all graphs on load
		const refreshedGraphs = graphs.map((graph) => {
			getGraphStatus(graph); // This modifies the `prevs` field directly
			return graph;
		});
		setUpdatedGraphs(refreshedGraphs);
	}, [graphs]);

	const topGraphNames = new Set(updatedGraphs.map((g) => g.graphName));

	return (
		<div className="subgraph-tree">
			<div style={{ listStyle: "none", paddingLeft: "1em" }}>
				{updatedGraphs.map((graph) => (
					<GraphTreeNode
						key={graph.graphName}
						graph={graph}
						ancestry={[]}
						onSelect={onSelect}
						onDelete={onDelete}
						topGraphNames={topGraphNames}
					/>
				))}
			</div>
		</div>
	);
};

export default SubGraphTree;
