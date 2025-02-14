// SubGraphTree.tsx
import React, { useEffect, useState } from "react";
import { SubGraph } from "../Graph/GraphContext";
import { Node as XYNode } from "@xyflow/react";
import { Button, ButtonGroup, IconTriangle, Paragraph, Space } from "oakd";
import { nodeRegistry } from "../Graph/NodeRegistry.ts";

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
	onExport: ((item: SubGraph | GraphNode) => void) | undefined;
}

/**
 * Recalculate the predecessors and successors for each node in the graph from scratch.
 * This version resets node.data.prevs and node.data.nexts so duplicates are not accumulated.
 */
export const getGraphStatus = (graph: SubGraph) => {
	if (!graph || !Array.isArray(graph.nodes)) return { missingNodes: [] };

	const missingNodes: string[] = [];
	const nodeMap = new Map<string, GraphNode>();

	// Reset each node's prevs and nexts arrays and build a node map.
	graph.nodes.forEach((node: GraphNode) => {
		node.data.prevs = [];  // Reset!
		node.data.nexts = [];  // Reset!
		nodeMap.set(node.id, node);
	});

	// Populate prevs and nexts based on current edges.
	(graph.edges || []).forEach((edge) => {
		const targetNode = nodeMap.get(edge.target);
		if (targetNode) {
			targetNode.data.prevs.push(edge.source);
		}
		const sourceNode = nodeMap.get(edge.source);
		if (sourceNode) {
			sourceNode.data.nexts.push(edge.target);
		}
	});

	// Validate each node’s connections.
	nodeMap.forEach((node) => {
		const nodeDef = nodeRegistry[node.data.type] || { inputs: [], outputs: [], optionalOutputs: [] };
		const expectedInputs = nodeDef.inputs || [];
		const expectedOutputs = nodeDef.outputs || [];
		const optionalOutputs = nodeDef.optionalOutputs || [];
		const actualPrevs = node.data.prevs;

		// If the node requires incoming connections and none exist (except for START nodes), note a warning.
		if (expectedInputs.length > 0 && actualPrevs.length === 0 && node.data.type !== "START") {
			missingNodes.push(`${node.data.name} (${node.data.type}) has no incoming connections`);
		}

		// Check required outputs (ignoring optional ones).
		const requiredOutputs = expectedOutputs.filter(output => !optionalOutputs.includes(output.id));
		if (requiredOutputs.length > 0 && node.data.nexts.length === 0) {
			missingNodes.push(`${node.data.name} (${node.data.type}) has no outgoing connections`);
		}

		// Special rule: START nodes must have at least one outgoing connection.
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
	onExport: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphTreeNode: React.FC<GraphTreeNodeProps> = ({ graph, ancestry, onSelect, onDelete, onExport, topGraphNames }) => {
	const [expanded, setExpanded] = useState(true);
	// Get aggregated warnings from all child nodes in the graph
	const { missingNodes } = getGraphStatus(graph);

	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded(prev => !prev);
	};

	return (
		<>
			<div onClick={(e: any) => { e.stopPropagation(); onSelect(graph, ancestry); }} style={{width:"100%"}}>
				<Space className="tree-node graph-node" align={"center"} style={{ fontWeight: "bold", cursor: "pointer" }} wide gap justify={"between"}>
					<Paragraph>
                        <span onClick={toggleExpanded}>
                            {expanded ? "▼" : "▶"}
                        </span>
						{graph.graphName} (Nodes: {graph.nodes.length})
						{missingNodes.length > 0 && (
							<span style={{ color: "red" }}>
                                {" "}
								<IconTriangle size={"small"} /> {/*{missingNodes.length} Node(s) Missing Connections*/}
                            </span>
						)}

					</Paragraph>
					<ButtonGroup>
						{onDelete && (
							<Button size={"small"} icon={"Trash"} type={graph.graphName==="root"?"warning":"danger"} onClick={(e) => { e.stopPropagation(); onDelete(graph); }} />
						)}
						{onExport && (
							<Button size={"small"} icon={"Share"} onClick={(e) => { e.stopPropagation(); onExport(graph); }}  />
						)}
					</ButtonGroup>
				</Space>
			</div>
			{expanded && (
				<Paragraph>
					<Space style={{ listStyle: "none", paddingLeft: "1em" }} gap>
						{(graph.nodes as GraphNode[]).map((node) => (
							<GraphNodeTreeNode key={node.id} node={node} ancestry={[...ancestry, graph]} onSelect={onSelect} onDelete={onDelete} topGraphNames={topGraphNames} onExport={onExport} />
						))}
					</Space>
				</Paragraph>
			)}
		</>
	);
};

interface GraphNodeTreeNodeProps {
	node: GraphNode;
	ancestry: SubGraph[];
	onSelect: (item: SubGraph | GraphNode, ancestry: SubGraph[]) => void;
	onDelete: ((item: SubGraph | GraphNode) => void) | undefined;
	onExport: ((item: SubGraph | GraphNode) => void) | undefined;
	topGraphNames: Set<string>;
}

const GraphNodeTreeNode: React.FC<GraphNodeTreeNodeProps> = ({ node, ancestry, onSelect, onDelete, onExport }) => {
	const [expanded, setExpanded] = useState(false);
	const toggleExpanded = (e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded(prev => !prev);
	};
	const isSubgraph = node.data.type === "SUBGRAPH" && !!node.data.subgraph;

	const nodeDef = nodeRegistry[node.data.type] || { inputs: [], outputs: [], optionalOutputs: [] };
	const requiredOutputs = nodeDef.outputs.filter(output => !nodeDef.optionalOutputs?.includes(output.id));

	const expectedInputs = nodeDef.inputs;

	const warnings: string[] = [];
	if (expectedInputs.length > 0 && node.data.prevs.length === 0 && node.data.type !== "START") warnings.push("No incoming connections");
	if (requiredOutputs.length > 0 && node.data.nexts.length === 0) warnings.push("No outgoing connections");
	if (node.data.type === "CONDITION" && (!node.data.true_next || !node.data.false_next)) warnings.push("Missing true/false branches");

	return (
		<>
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
				{/* {false && onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} style={{ marginLeft: 8 }}>
						Delete
                    </button>
                )}*/}
			</div>
			{isSubgraph && expanded && (
				<ul style={{ listStyle: "none", paddingLeft: "1em" }}>
					<GraphTreeNode graph={node.data.subgraph!} ancestry={[...ancestry, node.data.subgraph!]} onSelect={onSelect} onDelete={onDelete} onExport={onExport} topGraphNames={new Set()} />
				</ul>
			)}
		</>
	);
};

const SubGraphTree: React.FC<SubGraphTreeProps> = ({ graphs, onSelect = () => {}, onDelete, onExport }) => {
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
			<Space gap wide>
				{updatedGraphs.map((graph) => (
					<GraphTreeNode
						key={graph.graphName}
						graph={graph}
						ancestry={[]}
						onSelect={onSelect}
						onDelete={onDelete}
						onExport={onExport}
						topGraphNames={topGraphNames}
					/>
				))}
			</Space>
		</div>
	);
};

export default SubGraphTree;