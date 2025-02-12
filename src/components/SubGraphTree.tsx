import React, { useEffect, useState } from "react";
import { SubGraph } from "../Graph/GraphContext";
import { Node as XYNode } from "@xyflow/react";
import { Button, IconTriangle, Paragraph, Space } from "oakd";
import {nodeRegistry} from "../Graph/NodeRegistry.ts";

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
		prevs: string[];
		// If this node represents a subgraph, embed it here.
		subgraph?: SubGraph;
	};
}

// Props for SubGraphTree
export interface SubGraphTreeProps {
	graphs: SubGraph[];
	onSelect?: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete?: (item: SubGraph | GraphNode) => void;
}

/**
 * Validate each node in the graph using the same required/optional edge logic as in node validation.
 * Ensures safe defaults for nexts/prevs.
 */
const getGraphStatus = (graph: SubGraph) => {
	if (!graph || !Array.isArray(graph.nodes)) return { missingNodes: [] };

	const missingNodes: string[] = [];
	const nodeMap = new Map<string, GraphNode>();
	const prevsMap = new Map<string, string[]>(); // Derived prevs from edges

	// Map nodes by ID and ensure nexts/prevs are defined
	graph.nodes.forEach((node: any) => {
		nodeMap.set(node.id, node);
		if (!Array.isArray(node.data.prevs)) node.data.prevs = [];
		if (!Array.isArray(node.data.nexts)) node.data.nexts = [];
		prevsMap.set(node.id, node.data.prevs);
	});

	// Populate prevs from edges (if any)
	(graph.edges || []).forEach((edge) => {
		if (prevsMap.has(edge.target)) {
			prevsMap.get(edge.target)!.push(edge.source);
		}
	});

	// For each node, compare actual vs required edges
	nodeMap.forEach((node) => {
		const nodeDef = nodeRegistry[node.data.type] || { inputs: [], outputs: [], optionalOutputs: [] };
		const expectedInputs = nodeDef.inputs || [];
		const expectedOutputs = nodeDef.outputs || [];
		const optionalOutputs = nodeDef.optionalOutputs || [];
		const actualPrevs = prevsMap.get(node.id) || [];

		// (Re)assign prevs if needed
		if (node.data.prevs.length === 0 && actualPrevs.length > 0) {
			node.data.prevs = actualPrevs;
		}

		// Missing inputs: if required inputs exist and none are connected (except for START nodes)
		if (expectedInputs.length > 0 && actualPrevs.length === 0 && node.data.type !== "START") {
			missingNodes.push(`${node.data.name} (${node.data.type}) has no incoming connections`);
		}

		// Missing outputs: check only for required outputs (ignore optional ones)
		const requiredOutputs = expectedOutputs.filter(output => !optionalOutputs.includes(output.id));
		if (requiredOutputs.length > 0 && node.data.nexts.length === 0) {
			missingNodes.push(`${node.data.name} (${node.data.type}) has no outgoing connections`);
		}

		// START nodes must have at least one outgoing connection
		if (node.data.type === "START" && node.data.nexts.length === 0) {
			missingNodes.push(`${node.data.name} (START) must have at least one outgoing connection`);
		}
	});

	return { missingNodes };
};

interface GraphTreeNodeProps {
	graph: SubGraph;
	ancestry: SubGraph[]; // Parent subgraphs leading to this one
	onSelect: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphTreeNode: React.FC<GraphTreeNodeProps> = ({ graph, ancestry, onSelect, onDelete, topGraphNames }) => {
	const [expanded, setExpanded] = useState(true);
	// Get aggregated warnings from all child nodes in the graph
	const { missingNodes } = getGraphStatus(graph);

	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded(prev => !prev);
	};

	// Do not show aggregated triangle for the "root" graph so that missing connections on individual nodes show instead.
	const isRootGraph = graph.graphName.toLowerCase() === "root";

	return (
		<div>
			<div onClick={(e: any) => { e.stopPropagation(); onSelect(graph, ancestry); }}>
				<Space className="tree-node graph-node" align={"center"} style={{ fontWeight: "bold", cursor: "pointer" }}>
					<Paragraph>
            <span onClick={toggleExpanded}>
              {expanded ? "▼" : "▶"}
            </span>
						{graph.graphName} (Nodes: {graph.nodes.length})
						{!isRootGraph && missingNodes.length > 0 && (
							<span style={{ color: "red" }}>
                {" "}
								<IconTriangle size={"small"} /> {missingNodes.length} Node(s) Missing Connections
              </span>
						)}
						{onDelete && (
							<Button size={"small"} icon={"Trash"} type={"danger"} onClick={(e) => { e.stopPropagation(); onDelete(graph); }} />
						)}
					</Paragraph>
				</Space>
			</div>
			{expanded && (
				<Paragraph>
					<div style={{ listStyle: "none", paddingLeft: "1em" }}>
						{(graph.nodes as GraphNode[]).map((node) => (
							<GraphNodeTreeNode key={node.id} node={node} ancestry={[...ancestry, graph]} onSelect={onSelect} onDelete={onDelete} topGraphNames={topGraphNames} />
						))}
					</div>
				</Paragraph>
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

const GraphNodeTreeNode: React.FC<GraphNodeTreeNodeProps> = ({ node, ancestry, onSelect, onDelete, topGraphNames }) => {
	const [expanded, setExpanded] = useState(false);
	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded(prev => !prev);
	};
	const isSubgraph = node.data.type === "SUBGRAPH" && !!node.data.subgraph;

	const nodeDef = nodeRegistry[node.data.type] || { inputs: [], outputs: [], optionalOutputs: [] };
	const requiredOutputs = nodeDef.outputs.filter(output => !nodeDef.optionalOutputs?.includes(output.id));

	const warnings: string[] = [];
	if (node.data.prevs.length === 0 && node.data.type !== "START") warnings.push("No incoming connections");
	if (requiredOutputs.length > 0 && node.data.nexts.length === 0) warnings.push("No outgoing connections");
	if (node.data.type === "CONDITION" && (!node.data.true_next || !node.data.false_next)) warnings.push("Missing true/false branches");

	return (
		<div>
			<div className="tree-node node" onClick={(e) => { e.stopPropagation(); onSelect(node, ancestry); }} style={{ cursor: "pointer" }}>
				{isSubgraph && (
					<span onClick={toggleExpanded} style={{ marginRight: 4 }}>
            {expanded ? "▼" : "▶"}
          </span>
				)}
				{node.data.name} ({node.data.type})
				{warnings.length > 0 && (
					<span style={{ color: "red" }}> ⚠ {warnings.join(", ")}</span>
				)}
				{onDelete && (
					<button onClick={(e) => { e.stopPropagation(); onDelete(node); }} style={{ marginLeft: 8 }}>
						Delete
					</button>
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
			<div style={{  }}>
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