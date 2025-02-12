import React, {
	useCallback,
	useMemo,
	useRef,
	useState
} from "react";
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
	ReactFlow,
	ReactFlowProps,
	useReactFlow
} from "@xyflow/react";
import {SubGraph, useGraph} from "../Graph/GraphContext";
import {useGraphActions} from "../Graph/GraphActions";
import {Edge as ReactFlowEdge} from "@xyflow/react/dist/esm/types/edges";
import 'oakd/build/index.css';
import SubGraphTree from "./SubGraphTree";
import {loadJsonFromFile, saveJsonToFile} from "../utils/JsonIO";
import {
	allSubGraphsToJson,
	JsonSubGraph,
	jsonToSubGraph,
	jsonToSubGraphs,
	subGraphToJson
} from "../Graph/JsonUtil";
import RunWindow from "../GraphMenu/RunWindow";
import ConfigWindow from "../GraphMenu/ConfigWindow";
import CustomEdge from "../Graph/CustomEdge.tsx";
import CustomNode from "../Graph/CustomNode.tsx";

interface Project {
	name: string;
	graphs: SubGraph[]; // each project has its own subgraphs
}

export const Context: React.FC = () => {
	// Projects and which project is currently open
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);

	// Additional UI states
	const [isRunWindowOpen, setIsRunWindowOpen] = useState(false);
	const [isConfigWindowOpen, setIsConfigWindowOpen] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
	const [contextMenu, setContextMenu] = useState<{
		mouseX: number;
		mouseY: number;
		nodeId: string | null;
		edgeId: string | null;
		type: "panel" | "node" | "edge";
	} | null>(null);
	const [canvasHeight, setCanvasHeight] = useState<number>(window.innerHeight);

	// GraphContext references
	const {
		subGraphs,
		currentGraphName,
		addSubGraph,
		updateNodeData,
		handleNodesChange,
		handleEdgesChange,
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

	const menuBarRef = useRef<HTMLDivElement>(null);
	const {screenToFlowPosition, setCenter} = useReactFlow();

	// Current subgraph from GraphContext
	const graphInContext = useMemo(() => getCurrentGraph(), [getCurrentGraph]);

	// ---------------------------------------------------------------------------
	// PROJECT SELECTION
	// ---------------------------------------------------------------------------

	/**
	 * 1) Save the old project’s subgraphs (if one was open).
	 * 2) Remove all subgraphs from GraphContext (so we start fresh).
	 * 3) Load new project’s subgraphs into GraphContext.
	 * 4) Mark currentProject = new project.
	 * 5) Optionally set currentGraphName if the project has subgraphs.
	 */
	const handleSelectProject = useCallback(
		(newProject: Project) => {
			// 1) If we had a currentProject, store the GraphContext subgraphs back into it
			if (currentProject) {
				const updatedOldProj: Project = {
					...currentProject,
					graphs: subGraphs
				};
				setProjects((prev) => {
					const copy = [...prev];
					const idx = copy.findIndex((p) => p.name === updatedOldProj.name);
					if (idx !== -1) {
						copy[idx] = updatedOldProj;
					}
					return copy;
				});
			}

			// 2) Remove all subgraphs from GraphContext
			subGraphs.forEach((sg) => {
				removeSubGraph(sg.graphName);
			});

			// 3) Load the new project's subgraphs into GraphContext
			newProject.graphs.forEach((g) => {
				updateSubGraph(g.graphName, g);
			});

			// 4) Make newProject current
			setCurrentProject(newProject);

			// 5) If newProject has subgraphs, show the first as current
			if (newProject.graphs.length > 0) {
				setCurrentGraphName(newProject.graphs[0].graphName);
			}
		},
		[
			currentProject,
			removeSubGraph,
			setCurrentProject,
			setProjects,
			setCurrentGraphName,
			subGraphs,
			updateSubGraph
		]
	);

	/**
	 * 1) Save the current GraphContext’s subGraphs into currentProject.
	 * 2) Clear currentProject to show project selection.
	 */
	const handleBackToProjects = useCallback(() => {
		if (!currentProject) {
			setCurrentProject(null);
			return;
		}
		// 1) Save context’s subgraphs into the currentProject
		const updatedProject: Project = {
			...currentProject,
			graphs: subGraphs
		};
		// Update it in the project list
		setProjects((prev) => {
			const copy = [...prev];
			const idx = copy.findIndex((p) => p.name === updatedProject.name);
			if (idx !== -1) {
				copy[idx] = updatedProject;
			}
			return copy;
		});
		// 2) Deselect
		setCurrentProject(null);
	}, [currentProject, subGraphs, setProjects]);

	/** Creates a fresh new project with no subgraphs. */
	const handleNewProject = () => {
		const name = prompt("Enter a new Graph name:");
		if (!name) return;

		const newProject: Project = {name, graphs: []};
		setProjects((prev) => [...prev, newProject]);

		// Immediately switch to that project
		handleSelectProject(newProject);
	};

	// ---------------------------------------------------------------------------
	// GRAPH FLOW / SUBGRAPH I/O
	// ---------------------------------------------------------------------------

	const handleCloseContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	const handleNodeDataChange = useCallback(
		(nodeId: string, newData: any) => {
			updateNodeData(currentGraphName, nodeId, newData);
		},
		[updateNodeData, currentGraphName]
	);

	const handleEdgeClick = useCallback((event: React.MouseEvent, edge: ReactFlowEdge) => {
		event.preventDefault();
		event.stopPropagation();
		console.log("handleEdgeClick", edge);
	}, []);

	/**
	 * Create a brand new subgraph in GraphContext,
	 * also store it in the currentProject if defined
	 */
	const handleAddGraph = () => {
		const newGraphName = prompt("Enter a new graph name:");
		if (!newGraphName) return;

		addSubGraph(newGraphName);
		const newGraph = getCurrentGraph();

		// If a project is open, store it there
		if (currentProject) {
			setCurrentProject({
				...currentProject,
				graphs: [...currentProject.graphs, newGraph]
			});
		}
	};

	/**
	 * Load a single subgraph from a JSON file
	 * and put it into GraphContext + currentProject
	 */
	const handleLoadSubGraph = async () => {
		try {
			const jsonData = await loadJsonFromFile();
			if (!jsonData) return;

			if (!jsonData.name || !jsonData.nodes || !jsonData.serial_number) {
				throw new Error("Invalid Json Format: must be JsonSubGraph");
			}
			const loadedSubGraph: SubGraph = jsonToSubGraph(jsonData as JsonSubGraph);

			updateSubGraph(loadedSubGraph.graphName, loadedSubGraph);

			if (currentProject) {
				setCurrentProject({
					...currentProject,
					graphs: [...currentProject.graphs, loadedSubGraph]
				});
			}
		} catch (error) {
			console.error("Error loading subgraph:", error);
			alert("Failed to load subgraph: " + error);
		}
	};

	const handleSaveSubGraph = () => {
		const curGraph = getCurrentGraph();
		const jsonData = subGraphToJson(curGraph);
		saveJsonToFile(`${curGraph.graphName}.json`, jsonData);
	};

	const handleNewGraphButton = () => {
		console.log("New Graph clicked");
	};

	const handleLoadGraph = async () => {
		try {
			const result = await loadJsonFromFile();
			if (!result) return;
			const {data: jsonData, fileName} = result;
			const loadedSubGraphs: SubGraph[] = jsonToSubGraphs(jsonData);

			// Clear all subgraphs from context
			subGraphs.forEach((sg) => {
				removeSubGraph(sg.graphName);
			});
			// Load these into context
			loadedSubGraphs.forEach((sg) => {
				updateSubGraph(sg.graphName, sg);
			});

			// Create a new project with the file name (remove .json extension if present)
			const projectName = fileName.replace(/\.json$/i, "");
			const newProject: Project = {name: projectName, graphs: loadedSubGraphs};

			// Add the new project to the list and set it as current
			setProjects((prev) => [...prev, newProject]);
			setCurrentProject(newProject);
			if (loadedSubGraphs.length > 0) {
				setCurrentGraphName(loadedSubGraphs[0].graphName);
			}
		} catch (error) {
			console.error("Error loading graph:", error);
			alert("Failed to load graph: " + error);
		}
	};


	// Save all subgraphs in context to a single JSON
	const handleSaveGraph = () => {
		const jsonData = allSubGraphsToJson(subGraphs);
		saveJsonToFile("Save.json", jsonData);
	};

	// React Flow event handlers
	const reactFlowProps = useMemo<ReactFlowProps>(
		() => ({
			onContextMenu: (event: React.MouseEvent) => {
				return handlePanelContextMenu(event, setContextMenu);
			},
			onClick: () => setContextMenu(null),
			onNodesChange: (changes: NodeChange[]) => handleNodesChange(currentGraphName, changes),
			onEdgesChange: (changes: EdgeChange[]) => handleEdgesChange(currentGraphName, changes),
			onEdgeClick: handleEdgeClick,
			onConnect: handleAddEdge,
			edgeTypes: {
				custom: CustomEdge,//StepEdge
			}
		}),
		[
			handlePanelContextMenu,
			handleNodesChange,
			handleEdgesChange,
			handleEdgeClick,
			handleAddEdge,
			currentGraphName
		]
	);

	React.useEffect(() => {
		const handleResize = () => {
			if (menuBarRef.current) {
				const menuBarHeight = menuBarRef.current.offsetHeight;
				setCanvasHeight(window.innerHeight - menuBarHeight - 10);
			} else {
				setCanvasHeight(window.innerHeight - 10);
			}
		};

		window.addEventListener("resize", handleResize);
		handleResize();
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const nodeTypes = useMemo(() => ({
		custom: (props: any) => <CustomNode {...props} onNodeDataChange={handleNodeDataChange}/>
	}), [handleNodeDataChange]);

	const handleRun = () => {
		setIsRunWindowOpen(true);
	};

	/**
	 * Center a given node in the flow view
	 */
	const centerNode = (item: any, delay: number) => {
		setTimeout(() => {
			const centerX = item.position.x + ((item.width || 200) / 2);
			const centerY = item.position.y + ((item.height || 200) / 2);
			setCenter(centerX, centerY, {duration: 250, zoom: 1});
		}, delay);
	};

	/**
	 * Clicking a subgraph or node in SubGraphTree
	 */
	const handleSelectItem = (item: SubGraph | any, ancestry: SubGraph[]) => {
		if (item && "graphName" in item) {
			// It's a subgraph
			setCurrentGraphName(item.graphName);
		} else if (item && item.position) {
			// It's a node
			const containingGraph = ancestry.length > 0 ? ancestry[ancestry.length - 1] : null;
			if (containingGraph && containingGraph.graphName !== currentGraphName) {
				setCurrentGraphName(containingGraph.graphName);
				centerNode(item, 120);
			} else {
				centerNode(item, 20);
			}
		}
		console.log("Selected:", item, "Ancestry:", ancestry);
	};

	// ---------------------------------------------------------------------------
	// RENDER
	// ---------------------------------------------------------------------------
	return (
		<Page fixed gap className="oakd content pad">
			{/* If not editing a project, show project selection */}
			{!currentProject ? (
				<>
					<Content><DebugLayer label={"LangGraph-GUI"}/></Content>
					<Content grow>
						<Space align={"center"} justify={"center"} style={{height: "100%"}} gap>
							<Space direction={"vertical"} gap>
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
									<ButtonGroup> <Button onClick={handleNewProject}>New Graph</Button>
										<Button onClick={handleLoadGraph}>Import Graph</Button></ButtonGroup>
								</Space>
							</Space>
						</Space>
					</Content>

				</>
			) : (
				// Otherwise, show the graph editor for the currentProject
				<>
					<Content><DebugLayer label={"LangGraph-GUI"}/></Content>
					<Content>
						<Space justify="between" wide>

							<Space gap align={"center"}>
								<Button icon={"Angle"} onClick={handleBackToProjects}>All Graphs</Button>
								<Button icon="Bar" size="default" onClick={() => setSidebarOpen(!sidebarOpen)}/>
								<Paragraph><strong>{currentProject.name.slice(0, 33)}</strong></Paragraph>

								<Button type={"primary"} onClick={handleRun}><Paragraph>Run Graph</Paragraph></Button>
								{/*<Button onClick={handleNewGraphButton}>New Graph</Button>*/}
								<ButtonGroup>
									<Button onClick={handleSaveGraph}>Export Graph</Button>
								</ButtonGroup>
							</Space>
							<Button onClick={() => setIsConfigWindowOpen(true)}>Settings</Button>

						</Space>
					</Content>

					<ContentRow>
						{/* Sidebar */}
						<Content style={{display: sidebarOpen ? "block" : "none",width:"100%", maxWidth: "320px", paddingLeft:0}} pad={"horizontal"}>
							<Page gap style={{height:"100%"}}>
								<Content grow>
									<Space direction={"vertical"} gap style={{width:"100%", height:"100%"}}>

										<Card pad style={{width:"100%", height:"100%"}}>
											<SubGraphTree
												graphs={subGraphs}
												onSelect={handleSelectItem}
											/>
										</Card>

									</Space>
								</Content>
								<Content><Space justify="stretch">
									<ButtonGroup>
										<Button icon={"Plus"} size="small" onClick={handleAddGraph}>Add SubGraph</Button>
										<Button size="small" onClick={handleLoadSubGraph}>Import SubGraph</Button>
									</ButtonGroup>
									{/*<Button onClick={handleSaveSubGraph}>Save Subgraph</Button>*/}
								</Space></Content>
								<Content>
									<Card pad style={{background:"#eee"}}><textarea style={{display:"block",fontSize:"6pt", width:"100%", fontFamily:"monospace", background:"none"}} rows={2}>{JSON.stringify(subGraphs)}</textarea></Card>
								</Content>
							</Page>
						</Content>

						{/* Main Graph Area */}
						<Content grow style={{width: "100%", height: "100%"}}>
							<DebugLayer
								style={{width: "100%", height: "100%"}}
								label={
									<Paragraph className="label">
										<IconApps size="small"/>
										SubGraph (<strong>{currentGraphName}</strong>)
									</Paragraph>
								}
							>
								<ReactFlow
									nodes={graphInContext.nodes}
									edges={graphInContext.edges}
									{...reactFlowProps}
									nodeTypes={nodeTypes}
									connectionLineStyle={{stroke: "#ddd", strokeWidth: 2}}
								>
									<MiniMap/>
									<Background/>
									<Controls/>
								</ReactFlow>

								{contextMenu && contextMenu.type === "panel" && (
									<div
										className="fixed bg-white border border-gray-300 z-1000 p-2"
										style={{
											top: contextMenu.mouseY,
											left: contextMenu.mouseX
										}}
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
										style={{
											top: contextMenu.mouseY,
											left: contextMenu.mouseX
										}}
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
										style={{
											top: contextMenu.mouseY,
											left: contextMenu.mouseX
										}}
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

								{isRunWindowOpen && <RunWindow onClose={() => setIsRunWindowOpen(false)}/>}
								{isConfigWindowOpen && (
									<ConfigWindow onClose={() => setIsConfigWindowOpen(false)}/>
								)}
							</DebugLayer>
						</Content>
					</ContentRow>

					<Content>
						<DebugLayer label="Footer"/>
					</Content>
				</>
			)}
		</Page>
	);
};