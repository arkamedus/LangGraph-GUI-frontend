import { useCallback } from 'react';
import { useGraph } from './GraphContext';
import { Edge, Connection } from '@xyflow/react';

// Helper functions to calculate predecessors and successors
export function getPredecessors(nodeId: string, edges: any[]): string[] {
    return edges
        .filter((edge) => edge.target === nodeId)
        .map((edge) => edge.source);
}

export function getSuccessors(nodeId: string, edges: any[]): string[] {
    return edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target);
}

interface ContextMenuProps {
    mouseX: number;
    mouseY: number;
    nodeId: string | null;
    edgeId: string | null;
    type: 'panel' | 'node' | 'edge';
}

interface AddNodeProps {
    contextMenu: ContextMenuProps | null;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuProps | null>>;
    screenToFlowPosition: ((pos: { x: number; y: number }) => { x: number; y: number }) | null;
}

export const useGraphActions = () => {
    const { currentGraphName, updateSubGraph, getCurrentGraph } = useGraph();
    const currentGraph = useCallback(() => getCurrentGraph(), [getCurrentGraph]);

    // --- Add Node ---
    const handleAddNode = useCallback(
        ({ contextMenu, setContextMenu, screenToFlowPosition }: AddNodeProps) => {
            if (contextMenu && contextMenu.type === 'panel' && screenToFlowPosition) {
                const newPosition = screenToFlowPosition({
                    x: contextMenu.mouseX,
                    y: contextMenu.mouseY,
                });
                const newNodeId = String(currentGraph().serial_number);
                const newNode = {
                    id: newNodeId,
                    type: 'custom',
                    position: newPosition,
                    width: 150,
                    height: 200,
                    data: {
                        type: "STEP",
                        name: `Node ${currentGraph().serial_number}`,
                        description: "",
                        tool: "",
                        nexts: [], // initialize as empty arrays
                        prevs: [],
                        true_next: null,
                        false_next: null,
                        info: null,
                    },
                };

                // Create a new graph with the added node and increment serial_number.
                const updatedGraph = {
                    ...currentGraph(),
                    nodes: [...currentGraph().nodes, newNode],
                    serial_number: currentGraph().serial_number + 1,
                };

                // Recalculate nexts/prevs for all nodes using the current (unchanged) edges.
                const recalculatedNodes = updatedGraph.nodes.map((node) => ({
                    ...node,
                    data: {
                        ...node.data,
                        prevs: getPredecessors(node.id, updatedGraph.edges),
                        nexts: getSuccessors(node.id, updatedGraph.edges),
                    },
                }));

                updateSubGraph(currentGraphName, {
                    ...updatedGraph,
                    nodes: recalculatedNodes,
                });

                setContextMenu(null);
            }
        },
        [currentGraph, updateSubGraph, currentGraphName]
    );

    // --- Delete Node ---
    const handleDeleteNode = useCallback(
        (contextMenu: ContextMenuProps | null, setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuProps | null>>) => {
            if (contextMenu && contextMenu.nodeId) {
                const nodeToDeleteId = contextMenu.nodeId;
                const updatedNodes = currentGraph().nodes.filter((node) => node.id !== nodeToDeleteId);
                const updatedEdges = currentGraph().edges.filter(
                    (edge) => edge.source !== nodeToDeleteId && edge.target !== nodeToDeleteId
                );

                // Recalculate nexts/prevs for every remaining node
                const recalculatedNodes = updatedNodes.map((node) => ({
                    ...node,
                    data: {
                        ...node.data,
                        prevs: getPredecessors(node.id, updatedEdges),
                        nexts: getSuccessors(node.id, updatedEdges),
                    },
                }));

                updateSubGraph(currentGraphName, {
                    ...currentGraph(),
                    nodes: recalculatedNodes,
                    edges: updatedEdges,
                });
                setContextMenu(null);
            }
        },
        [updateSubGraph, currentGraph, currentGraphName]
    );

    // --- Delete Edge ---
    const handleDeleteEdge = useCallback(
        (contextMenu: ContextMenuProps | null, setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuProps | null>>) => {
            if (contextMenu && contextMenu.edgeId) {
                const edgeToDeleteId = contextMenu.edgeId;
                const updatedEdges = currentGraph().edges.filter((edge) => edge.id !== edgeToDeleteId);

                // Recalculate nexts/prevs for every node using the new edges
                const recalculatedNodes = currentGraph().nodes.map((node) => ({
                    ...node,
                    data: {
                        ...node.data,
                        prevs: getPredecessors(node.id, updatedEdges),
                        nexts: getSuccessors(node.id, updatedEdges),
                    },
                }));

                updateSubGraph(currentGraphName, {
                    ...currentGraph(),
                    edges: updatedEdges,
                    nodes: recalculatedNodes,
                });
                setContextMenu(null);
            }
        },
        [currentGraph, currentGraphName, updateSubGraph]
    );

    // --- Add Edge ---
    const handleAddEdge = useCallback(
        (connection: Connection) => {
            const sourceNode = currentGraph().nodes.find((node) => node.id === connection.source);
            const targetNode = currentGraph().nodes.find((node) => node.id === connection.target);

            if (!sourceNode || !targetNode) return;

            // Check for existing connections on true/false handles
            if (connection.sourceHandle === 'true' && sourceNode.data.true_next) {
                alert("This node already has a 'true' connection. Please remove existing edge to create new one.");
                return;
            }
            if (connection.sourceHandle === 'false' && sourceNode.data.false_next) {
                alert("This node already has a 'false' connection. Please remove existing edge to create new one.");
                return;
            }

            const newEdge: Edge = {
                id: `${connection.source}-${connection.target}-${connection.sourceHandle || ""}`,
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle,
                type: "custom",
                data: {
                    sourceNode: connection.source,
                    targetNode: connection.target,
                },
            };

            const updatedEdges = [...currentGraph().edges, newEdge];

            // Recalculate nexts/prevs for all nodes using the new edges
            const recalculatedNodes = currentGraph().nodes.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    prevs: getPredecessors(node.id, updatedEdges),
                    nexts: getSuccessors(node.id, updatedEdges),
                },
            }));

            updateSubGraph(currentGraphName, {
                ...currentGraph(),
                edges: updatedEdges,
                nodes: recalculatedNodes,
            });
        },
        [currentGraph, currentGraphName, updateSubGraph]
    );

    // --- Context Menu Handler ---
    const handlePanelContextMenu = useCallback(
        (event: React.MouseEvent, setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuProps | null>>) => {
            event.preventDefault();
            const target = event.target as HTMLElement;
            const nodeElement = target.closest('.react-flow__node') as HTMLElement;
            const edgeElement = target.closest('.react-flow__edge') as HTMLElement;

            if (nodeElement) {
                const nodeId = nodeElement.getAttribute("data-id");
                setContextMenu({
                    mouseX: event.clientX,
                    mouseY: event.clientY,
                    nodeId: nodeId,
                    edgeId: null,
                    type: 'node',
                });
            } else if (edgeElement) {
                const edgeId = edgeElement.getAttribute('data-id');
                setContextMenu({
                    mouseX: event.clientX,
                    mouseY: event.clientY,
                    nodeId: null,
                    edgeId: edgeId,
                    type: 'edge',
                });
            } else {
                setContextMenu({
                    mouseX: event.clientX,
                    mouseY: event.clientY,
                    nodeId: null,
                    edgeId: null,
                    type: 'panel',
                });
            }
        },
        []
    );

    return { handleAddNode, handleDeleteNode, handleDeleteEdge, handlePanelContextMenu, handleAddEdge };
};
