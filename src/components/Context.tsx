import {useCallback, useEffect, useMemo, useState} from "react";
import {
	Button,
	ButtonGroup,
	Card,
	Content,
	ContentRow,
	DebugLayer,
	IconApps,
	Page,
	Paragraph,
	Space,
	Title
} from "oakd";
import {
	Background,
	Controls,
	EdgeChange,
	MiniMap,
	NodeChange,
	ReactFlow, ReactFlowProps,
	useReactFlow
} from "@xyflow/react";
import {SubGraph, useGraph} from "../Graph/GraphContext";
import {useGraphActions} from "../Graph/GraphActions";
import {Edge as ReactFlowEdge} from "@xyflow/react/dist/esm/types/edges";
import "oakd/build/index.css";
import SubGraphTree, {getGraphStatus, GraphNode} from "./SubGraphTree";
import {loadJsonFromFile, saveJsonToFile} from "../utils/JsonIO";
import {
	allSubGraphsToJson,
	jsonToSubGraphs,
	jsonToSubGraph,
	subGraphToJson
} from "../Graph/JsonUtil";
import RunWindow from "../GraphMenu/RunWindow";
import ConfigWindow from "../GraphMenu/ConfigWindow";

// Custom Node/Edge
import CustomEdge from "../Graph/CustomEdge.tsx";
import CustomNode from "../Graph/CustomNode.tsx";
import {ExecutionNodeStatusType, ExecutionState} from "../Graph/NodeData.ts";

interface Project {
	name: string;
	graphs: SubGraph[];
}

export const Context: React.FC = () => {
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const [isConfigWindowOpen, setIsConfigWindowOpen] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

	const [contextMenu, setContextMenu] = useState<{
		mouseX: number;
		mouseY: number;
		nodeId: string | null;
		edgeId: string | null;
		type: "panel" | "node" | "edge";
	} | null>(null);

	// GraphContext
	const {
		subGraphs,
		currentGraphName,
		addSubGraph,
		updateNodeData,
		handleEdgesChange,
		handleNodesChange,
		getCurrentGraph,
		removeSubGraph,
		updateSubGraph,
		setCurrentGraphName
	} = useGraph();

	const {
		handleAddNode,
		handleDeleteNode,
		handleDeleteEdge,
		handlePanelContextMenu,
		handleAddEdge
	} = useGraphActions();

	const {screenToFlowPosition, setCenter, fitView} = useReactFlow();

	const [executionState, setExecutionState] = useState<ExecutionState>({
		graph: "root",
		node: "",
		status: "none",
		nodes: {}
	});


	// ---------------------------------------------------------------------------
	// PROJECT SELECTION / LOADING
	// ---------------------------------------------------------------------------

	const handleSelectProject = useCallback(
		(newProject: Project) => {
			if (currentProject) {
				const updatedOldProj: Project = {...currentProject, graphs: subGraphs};
				setProjects((prev) => {
					const copy = [...prev];
					const idx = copy.findIndex((p) => p.name === updatedOldProj.name);
					if (idx !== -1) {
						copy[idx] = updatedOldProj;
					}
					return copy;
				});
			}
			subGraphs.forEach((sg) => removeSubGraph(sg.graphName));
			newProject.graphs.forEach((g) => updateSubGraph(g.graphName, g));

			setCurrentProject(newProject);
			if (newProject.graphs.length > 0) {
				setCurrentGraphName(newProject.graphs[0].graphName);
			}
			centerSubGraph(5);

		},
		[currentProject, subGraphs, removeSubGraph, updateSubGraph, setCurrentProject, setProjects, setCurrentGraphName]
	);

	const handleBackToProjects = useCallback(() => {
		resetState();
		if (!currentProject) {
			setCurrentProject(null);
			return;
		}
		const updatedProject: Project = {...currentProject, graphs: subGraphs};
		setProjects((prev) => {
			const copy = [...prev];
			const idx = copy.findIndex((p) => p.name === updatedProject.name);
			if (idx !== -1) {
				copy[idx] = updatedProject;
			}
			return copy;
		});
		setCurrentProject(null);
	}, [currentProject, subGraphs, setProjects]);

	function handleNewProject() {
		const name = prompt("Enter a new Graph name:");
		if (!name) return;
		const newProject: Project = {name, graphs: []};
		setProjects((prev) => [...prev, newProject]);
		handleSelectProject(newProject);
	}

	// ---------------------------------------------------------------------------
	// SUBGRAPHS / NODES
	// ---------------------------------------------------------------------------

	function handleAddGraph() {
		const newGraphName = prompt("Enter a new graph name:");
		if (!newGraphName) return;
		addSubGraph(newGraphName);
		const newGraph = getCurrentGraph();
		if (currentProject) {
			setCurrentProject({...currentProject, graphs: [...currentProject.graphs, newGraph]});
		}
	}

	async function handleLoadSubGraph() {
		try {
			const {data: jsonData} = await loadJsonFromFile();
			console.log("IMPORTED", jsonData);
			if (!jsonData) return;
			if (!jsonData.name || !jsonData.nodes || !jsonData.serial_number) {
				throw new Error("Invalid Json Format: must be JsonSubGraph");
			}
			const loadedSubGraph = jsonToSubGraph(jsonData);

			// Check if a subgraph with the same name already exists.
			if (subGraphs.some((sg) => sg.graphName === loadedSubGraph.graphName)) {
				// Append a random hex value to generate a unique graph name.
				loadedSubGraph.graphName = `${loadedSubGraph.graphName}:${Math.random()
					.toString(16)
					.slice(2, 8)}`;
			}

			updateSubGraph(loadedSubGraph.graphName, loadedSubGraph);
			if (currentProject) {
				setCurrentProject({
					...currentProject,
					graphs: [...currentProject.graphs, loadedSubGraph],
				});
			}
		} catch (error) {
			console.error("Error loading subgraph:", error);
			alert("Failed to load subgraph: " + error);
		}
	}


	function handleSaveSubGraph(graph?: SubGraph) {
		const curGraph = graph || getCurrentGraph();
		const jsonData = subGraphToJson(curGraph);
		saveJsonToFile(`${curGraph.graphName}.json`, jsonData);
	}

	async function handleLoadGraph() {
		try {
			const result = await loadJsonFromFile();
			if (!result) return;
			const {data: jsonData, fileName} = result;
			const loadedSubGraphs = jsonToSubGraphs(jsonData);

			// Clear context
			subGraphs.forEach((sg) => removeSubGraph(sg.graphName));
			loadedSubGraphs.forEach((sg) => updateSubGraph(sg.graphName, sg));

			const projectName = fileName.replace(/\.json$/i, "");
			const newProject: Project = {name: projectName, graphs: loadedSubGraphs};
			setProjects((prev) => [...prev, newProject]);
			setCurrentProject(newProject);
			if (loadedSubGraphs.length > 0) {
				setCurrentGraphName(loadedSubGraphs[0].graphName);
			}


		} catch (error) {
			console.error("Error loading graph:", error);
			alert("Failed to load graph: " + error);
		}
	}

	// Node data changes => we do allow immediate updates from node onBlur or final step
	// (But see below for how we only finalize them on blur in the node component)

	// ---------------------------------------------------------------------------
	// RENDER / LAYOUT
	// ---------------------------------------------------------------------------

	// Center a node
	function centerNode(item: any, delay: number) {
		setTimeout(() => {
			const cx = item.position.x + ((item.width || 200) / 2);
			const cy = item.position.y + ((item.height || 200) / 2);
			setCenter(cx, cy, {duration: 250, zoom: 1});
		}, delay);
	}

	// Center a subgraph
	function centerSubGraph(delay: number = 5) {
		console.log('fit');
		setTimeout(() => {
			fitView()
		}, delay);
	}

	function handleSelectItem(item: SubGraph | any, ancestry: SubGraph[]) {
		if (item && "graphName" in item) {
			setCurrentGraphName(item.graphName);
			centerSubGraph();
		} else if (item && item.position) {
			const containingGraph = ancestry.length > 0 ? ancestry[ancestry.length - 1] : null;
			if (containingGraph && containingGraph.graphName !== currentGraphName) {
				setCurrentGraphName(containingGraph.graphName);
				centerNode(item, 120);
			} else {
				centerNode(item, 20);
			}
		}
		console.log("Selected:", item, "Ancestry:", ancestry);
	}

	const handleNodeDataChange = useCallback((nodeId: string, newData: any) => {

		updateNodeData(currentGraphName, nodeId, newData)
	}, [updateNodeData, currentGraphName]);

	const handleEdgeClick = useCallback((event: React.MouseEvent, edge: ReactFlowEdge) => {
		event.preventDefault();
		event.stopPropagation();
		console.log("handleEdgeClick", edge)
	}, [])


	const currentGraph = useMemo(() => getCurrentGraph(), [getCurrentGraph]);

	const handleCloseContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	const resetState = () => {
		setExecutionState({
			graph: "root",
			node: "",
			status: "",
			nodes: {}
		})
	};


	const reactFlowProps = useMemo<ReactFlowProps>(() => ({
		onContextMenu: (event: React.MouseEvent) => handlePanelContextMenu(event, setContextMenu),
		onClick: handleCloseContextMenu,
		onNodesChange: (changes: NodeChange[]) => handleNodesChange(currentGraphName, changes),
		onEdgesChange: (changes: EdgeChange[]) => handleEdgesChange(currentGraphName, changes),
		onEdgeClick: handleEdgeClick,
		onConnect: handleAddEdge,
		edgeTypes: {
			custom: (props) => {
				const {sourceNode, targetNode} = props.data || {}
				return <CustomEdge {...props} sourceNode={sourceNode} targetNode={targetNode}/>
			},
		},
	}), [handlePanelContextMenu, handleCloseContextMenu, handleNodesChange, handleEdgesChange, handleEdgeClick, handleAddEdge, currentGraphName, setContextMenu])

	const getExecutionState = useCallback((): ExecutionState => {
		return executionState;
	}, [subGraphs, executionState]);

	const nodeTypes = useMemo(() => ({
		custom: (props: any) => <CustomNode {...props}
											executionState={getExecutionState()}
											subGraph={getCurrentGraph()}
											onNodeDataChange={handleNodeDataChange}/>,
	}), [handleNodeDataChange, getExecutionState]);

	const [updatedGraphs, setUpdatedGraphs] = useState(subGraphs);

	useEffect(() => {
		// Reconstruct prevs for all graphs on load
		const refreshedGraphs = subGraphs.map((graph) => {
			getGraphStatus(graph); // This modifies the `prevs` field directly
			return graph;
		});
		setUpdatedGraphs(refreshedGraphs);
	}, [subGraphs]);

	function handleSaveGraph() {
		const jsonData = allSubGraphsToJson(updatedGraphs);
		saveJsonToFile(`${currentProject?.name}.json`, jsonData);
	}


	const state = JSON.stringify(executionState);

	return (
		<Page fixed gap className={`oakd content pad execution__container ${getExecutionState().status}`}>
			{!currentProject ? (
				<>
					<Content>
						<DebugLayer label="LangGraph-GUI"/>
					</Content>
					<Content>
						<Space justify="end" wide>
							<Button onClick={() => setIsConfigWindowOpen(true)}>Settings</Button>
						</Space>
					</Content>
					<Content grow>
						<Space align="center" justify="center" style={{height: "100%"}} gap>
							<Space direction="vertical" gap>
								<Title>Select a Graph</Title>
								{projects.length === 0 && <Paragraph>No Graphs available.</Paragraph>}
								<Space gap>
									{projects.map((proj) => (
										<Button key={proj.name} onClick={() => handleSelectProject(proj)}>
											{proj.name}
										</Button>
									))}
								</Space>
								<Space>
									<ButtonGroup>
										<Button onClick={handleNewProject}>New Graph</Button>
										<Button onClick={handleLoadGraph}>Import Graph</Button>
									</ButtonGroup>
								</Space>
							</Space>
						</Space>
					</Content>
				</>
			) : (
				<>
					<Content>
						<DebugLayer label="LangGraph-GUI"/>
					</Content>
					<Content>
						<Space justify="between" wide>
							<Space gap align="center">
								<Button icon="Angle" onClick={handleBackToProjects}>
									All Graphs
								</Button>
								<Button icon="Bar" size="default" onClick={() => setSidebarOpen(!sidebarOpen)}/>
								<Paragraph>
									<strong>{currentProject.name.slice(0, 33)}</strong>
								</Paragraph>
								<ButtonGroup>
									<Button onClick={handleSaveGraph}>Export Graph</Button>
								</ButtonGroup>
							</Space>
							<Button onClick={() => setIsConfigWindowOpen(true)}>Settings</Button>
						</Space>
					</Content>

					<ContentRow>
						{sidebarOpen && (
							<Content style={{
								display: sidebarOpen ? "block" : "none",
								width: "100%",
								maxWidth: "320px",
								paddingLeft: 0
							}} pad={"horizontal"}>
								<Page style={{width: "100%", height: "100%"}} gap>
									<Content grow>
										<Card pad style={{width: "100%", height: "100%"}}>
											<SubGraphTree
												graphs={updatedGraphs}
												onSelect={handleSelectItem}
												onExport={(e: SubGraph | GraphNode) => {
													if ("graphName" in e) {
														handleSaveSubGraph(e);
													}
													console.log("EXPORT", e);
												}}
												onDelete={(e: SubGraph | GraphNode) => {
													console.log("DELETE", e);
													if ("graphName" in e) {
														// Check if this is the root subgraph
														if (e.graphName === currentGraphName) {
															// Clear the contents of the root subgraph instead of deleting it entirely.
															const currentGraph = getCurrentGraph();
															updateSubGraph(e.graphName, {
																...currentGraph,
																nodes: [],
																edges: []
															});
														} else {
															removeSubGraph(e.graphName);
														}
													}
												}}
											/>

										</Card>
									</Content>
									<Content>
										<Space justify="stretch">
											<ButtonGroup>
												<Button icon="Plus" onClick={handleAddGraph}>
													<Paragraph>Add SubGraph</Paragraph>
												</Button>
												<Button onClick={handleLoadSubGraph}>
													<Paragraph>Import SubGraph</Paragraph>
												</Button>
											</ButtonGroup>
										</Space>

									</Content>
									<Content>
										<Card pad>
											<Paragraph>TODO FILE BROWSER</Paragraph>
										</Card>

									</Content>
									<Content><Card pad style={{background: "#eee"}}>
                                        <textarea
											style={{
												display: "block",
												fontSize: "6pt",
												width: "100%",
												fontFamily: "monospace",
												background: "none"
											}}
											rows={2}
											value={state}
										/>
									</Card></Content>

								</Page>
							</Content>
						)}

						<Content grow style={{width: "100%", height: "100%"}}>
							<DebugLayer
								style={{width: "100%", height: "100%"}}
								label={
									<Paragraph className="label">
										<IconApps size="small"/>
										SubGraph (<strong>{currentGraphName}</strong>)
										{executionState.status !== "none" &&
                                            <>
												{executionState.status} {executionState.graph} {executionState.node}
                                            </>
										}
									</Paragraph>
								}
							>
								<ReactFlow

									nodes={currentGraph.nodes}
									edges={currentGraph.edges}
									{...reactFlowProps}
									nodeTypes={nodeTypes}
									connectionLineStyle={{stroke: '#ddd', strokeWidth: 2}}

								>
									{/*<MiniMap/>*/}
									<Background color={executionState.status === "running" ? "#666" : "#ccc"}/>
									<Controls/>
								</ReactFlow>

								{contextMenu && contextMenu.type === "panel" && (
									<div
										className="fixed bg-white border border-gray-300 z-1000 p-2"
										style={{top: contextMenu.mouseY, left: contextMenu.mouseX}}
									>
										<button
											onClick={() =>
												handleAddNode({contextMenu, setContextMenu, screenToFlowPosition})
											}
											className="block bg-green-500 hover:bg-green-700 text-white font-bold px-2 rounded"
										>
											Add Node
										</button>
										<button
											onClick={() => setContextMenu(null)}
											className="block bg-gray-500 hover:bg-gray-700 text-white font-bold px-2 rounded"
										>
											Cancel
										</button>
									</div>
								)}

								{contextMenu && contextMenu.type === "node" && (
									<div
										className="fixed bg-white border border-gray-300 z-1000 p-2"
										style={{top: contextMenu.mouseY, left: contextMenu.mouseX}}
									>
										<button
											onClick={() => handleDeleteNode(contextMenu, setContextMenu)}
											className="block bg-red-500 hover:bg-red-700 text-white font-bold px-2 rounded"
										>
											Delete Node
										</button>
										<button
											onClick={() => setContextMenu(null)}
											className="block bg-gray-500 hover:bg-gray-700 text-white font-bold px-2 rounded"
										>
											Cancel
										</button>
									</div>
								)}

								{contextMenu && contextMenu.type === "edge" && (
									<div
										className="fixed bg-white border border-gray-300 z-1000 p-2"
										style={{top: contextMenu.mouseY, left: contextMenu.mouseX}}
									>
										<button
											onClick={() => handleDeleteEdge(contextMenu, setContextMenu)}
											className="block bg-red-500 hover:bg-red-700 text-white font-bold px-2 rounded"
										>
											Delete Edge
										</button>
										<button
											onClick={() => setContextMenu(null)}
											className="block bg-gray-500 hover:bg-gray-700 text-white font-bold px-2 rounded"
										>
											Cancel
										</button>
									</div>
								)}
							</DebugLayer>
						</Content>

					</ContentRow>
					<Content>
						<RunWindow
							executionState={executionState}
							subGraphs={updatedGraphs}
							onGraphMessage={(graph, message) => {
								const {uniq_id, ...data} = message;

								if (data) {
									setExecutionState(prevState => {
										// Create a new execution state with the updated node details

										// Construct new execution state
										const newExecutionState: ExecutionState = {
											...prevState,
											graph: data.graph || "root",
											node: data.node || "",
											nodes: {...prevState.nodes} || {}
										};
										if (uniq_id) {
											const nodeReference = `${graph}_${uniq_id.toString()}`;

											// Retrieve the previous status
											const prevNodeState = prevState.nodes[nodeReference] || {};
											const prevStatus = prevNodeState.status || "none";

											let newStatus = prevStatus;

											if (data.status) {
												newStatus = "processing"; // First true -> processing
											} else if (!data.status && prevStatus === "processing") {
												newStatus = "done"; // Transition from processing -> done
											}

											const updatedNodes = {
												...prevState.nodes,
												[nodeReference]: {
													...prevNodeState, // Preserve existing node data
													status: newStatus,
												},
											};

											// @ts-ignore
											newExecutionState.nodes = updatedNodes;
										}


										// Update execution status if provided
										if (data.__EXECUTION) {
											console.warn("a", data);
											newExecutionState.status = data.__EXECUTION;
										}

										console.log("Updated execution state:", newExecutionState);
										return newExecutionState;
									});
								}
							}}
							onFlush={() => {
								resetState();
							}
							}
						/>

					</Content>

				</>
			)}
			{isConfigWindowOpen && <ConfigWindow onClose={() => setIsConfigWindowOpen(false)}/>}
		</Page>
	);
};
