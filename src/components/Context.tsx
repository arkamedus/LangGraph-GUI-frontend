import React, {
	useCallback,
	useEffect,
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
import { SubGraph, useGraph } from "../Graph/GraphContext";
import { useGraphActions } from "../Graph/GraphActions";
import { Edge as ReactFlowEdge } from "@xyflow/react/dist/esm/types/edges";
import "oakd/build/index.css";
import SubGraphTree from "./SubGraphTree";
import { loadJsonFromFile, saveJsonToFile } from "../utils/JsonIO";
import {
	allSubGraphsToJson,
	JsonSubGraph,
	jsonToSubGraph,
	jsonToSubGraphs,
	subGraphToJson
} from "../Graph/JsonUtil";
import CustomNode from "./nodes/CustomNode";
import { StepEdge } from "@xyflow/react";
import RunWindow from "../GraphMenu/RunWindow";
import ConfigWindow from "../GraphMenu/ConfigWindow";

// -----------------------------------------------------------------------------
// TYPES & INTERFACES
// -----------------------------------------------------------------------------
export interface Project {
	name: string;
	graphs: SubGraph[]; // each project has its own subgraphs
}

// -----------------------------------------------------------------------------
// MAIN "Context" COMPONENT
// -----------------------------------------------------------------------------
export const Context: React.FC = () => {
	// Projects
	const [projects, setProjects] = useState<Project[]>([]);
	// Current selected project
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

	// Graph Context references
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

	// React Flow references
	const menuBarRef = useRef<HTMLDivElement>(null);
	const { screenToFlowPosition, setCenter } = useReactFlow();

	// The subgraph currently being edited
	const graphInContext = useMemo(() => getCurrentGraph(), [getCurrentGraph]);

	// ---------------------------------------------------------------------------
	// HOOKS FOR WINDOW RESIZE
	// ---------------------------------------------------------------------------
	useEffect(() => {
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

	// ---------------------------------------------------------------------------
	// PROJECT SELECTION LOGIC
	// ---------------------------------------------------------------------------
	const handleSelectProject = useCallback(
		(newProject: Project) => {
			// If an existing project is open, store subGraphs back into it
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

			// Clear all subgraphs from GraphContext
			subGraphs.forEach((sg) => {
				removeSubGraph(sg.graphName);
			});

			// Load new project's subgraphs into GraphContext
			newProject.graphs.forEach((g) => updateSubGraph(g.graphName, g));

			// Set the project as current
			setCurrentProject(newProject);

			// If it has subgraphs, set the first as the current
			if (newProject.graphs.length > 0) {
				setCurrentGraphName(newProject.graphs[0].graphName);
			}
		},
		[
			currentProject,
			removeSubGraph,
			setProjects,
			setCurrentGraphName,
			subGraphs,
			updateSubGraph
		]
	);

	const handleBackToProjects = useCallback(() => {
		if (!currentProject) {
			setCurrentProject(null);
			return;
		}
		// Save subGraphs to the existing project
		const updatedProject: Project = {
			...currentProject,
			graphs: subGraphs
		};
		setProjects((prev) => {
			const copy = [...prev];
			const idx = copy.findIndex((p) => p.name === updatedProject.name);
			if (idx !== -1) {
				copy[idx] = updatedProject;
			}
			return copy;
		});
		setCurrentProject(null);
	}, [currentProject, subGraphs]);

	const handleNewProject = () => {
		const name = prompt("Enter a new project name:");
		if (!name) return;
		const newProject: Project = { name, graphs: [] };
		setProjects((prev) => [...prev, newProject]);
		// Immediately switch to that project
		handleSelectProject(newProject);
	};

	// ---------------------------------------------------------------------------
	// GRAPH FLOW + SUBGRAPH I/O
	// ---------------------------------------------------------------------------
	const handleNodeDataChange = useCallback(
		(nodeId: string, newData: any) => {
			updateNodeData(currentGraphName, nodeId, newData);
		},
		[updateNodeData, currentGraphName]
	);

	const handleEdgeClick = useCallback(
		(event: React.MouseEvent, edge: ReactFlowEdge) => {
			event.preventDefault();
			event.stopPropagation();
			console.log("handleEdgeClick", edge);
		},
		[]
	);

	// Add a subgraph
	const handleAddGraph = () => {
		const newGraphName = prompt("Enter a new graph name:");
		if (!newGraphName) return;

		addSubGraph(newGraphName);
		const newGraph = getCurrentGraph();
		// Store in current project
		if (currentProject) {
			setCurrentProject({
				...currentProject,
				graphs: [...currentProject.graphs, newGraph]
			});
		}
	};

	// Load a single subgraph from JSON
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

	// Save the active subgraph
	const handleSaveSubGraph = () => {
		const curGraph = getCurrentGraph();
		const jsonData = subGraphToJson(curGraph);
		saveJsonToFile(`${curGraph.graphName}.json`, jsonData);
	};

	const handleNewGraphButton = () => {
		console.log("New Graph clicked");
	};

	// Load multiple subgraphs from one JSON
	const handleLoadGraph = async () => {
		try {
			const jsonData = await loadJsonFromFile();
			if (!jsonData) return;
			const loadedSubGraphs: SubGraph[] = jsonToSubGraphs(jsonData);

			// Clear context
			subGraphs.forEach((sg) => {
				removeSubGraph(sg.graphName);
			});
			// Then load
			loadedSubGraphs.forEach((sg) => {
				updateSubGraph(sg.graphName, sg);
			});
			if (currentProject) {
				setCurrentProject({
					...currentProject,
					graphs: loadedSubGraphs
				});
			}
		} catch (error) {
			console.error("Error loading graph:", error);
			alert("Failed to load graph: " + error);
		}
	};

	// Save all subgraphs from context to one JSON
	const handleSaveGraph = () => {
		const jsonData = allSubGraphsToJson(subGraphs);
		saveJsonToFile("Save.json", jsonData);
	};

	// React Flow props
	const reactFlowProps = useMemo<ReactFlowProps>(
		() => ({
			onContextMenu: (event: React.MouseEvent) =>
				handlePanelContextMenu(event, setContextMenu),
			onClick: () => setContextMenu(null),
			onNodesChange: (changes: NodeChange[]) =>
				handleNodesChange(currentGraphName, changes),
			onEdgesChange: (changes: EdgeChange[]) =>
				handleEdgesChange(currentGraphName, changes),
			onEdgeClick: handleEdgeClick,
			onConnect: handleAddEdge,
			edgeTypes: {
				custom: StepEdge
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

	// Node types
	const nodeTypes = useMemo(
		() => ({
			custom: (props: any) => (
				<CustomNode {...props} onNodeDataChange={handleNodeDataChange} />
			)
		}),
		[handleNodeDataChange]
	);

	// Context menus
	const handleCloseContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	// Running the graph
	const handleRun = () => {
		setIsRunWindowOpen(true);
	};

	// Center a node in the view
	const centerNode = (item: any, delay: number) => {
		setTimeout(() => {
			const centerX = item.position.x + ((item.width || 200) / 2);
			const centerY = item.position.y + ((item.height || 200) / 2);
			setCenter(centerX, centerY, { duration: 250, zoom: 1 });
		}, delay);
	};

	// Selecting a subgraph or node from the tree
	const handleSelectItem = (item: SubGraph | any, ancestry: SubGraph[]) => {
		if (item && "graphName" in item) {
			setCurrentGraphName(item.graphName);
		} else if (item && item.position) {
			const containingGraph =
				ancestry.length > 0 ? ancestry[ancestry.length - 1] : null;
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
	// SUB-COMPONENTS
	// ---------------------------------------------------------------------------

	/**
	 * Renders the "Select a Project" view if there is no current project.
	 */
	const ProjectSelector: React.FC = () => {
		return (
			<>
				<Content>
					<DebugLayer label="LangGraph-GUI" />
				</Content>
				<Content>
					<DebugLayer label="Select a Project" />
					<Title>Select a Project</Title>
					{projects.length === 0 && <Paragraph>No projects available.</Paragraph>}
					<Space>
						{projects.map((proj) => (
							<Button key={proj.name} onClick={() => handleSelectProject(proj)}>
								{proj.name}
							</Button>
						))}
					</Space>
					<Space>
						<Button onClick={handleNewProject}>New Project</Button>
					</Space>
				</Content>
			</>
		);
	};

	/**
	 * The top bar with "Projects," "Run Graph," "Load Graph," etc.
	 */
	const ProjectToolbar: React.FC = () => {
		return (
			<Content>
				<Space justify="between" wide>
					<Space gap align={"center"}>
						<Button icon={"Angle"} onClick={handleBackToProjects}>
							Projects
						</Button>
						<Button icon="Bar" size="default" onClick={() => setSidebarOpen(!sidebarOpen)} />
						<Paragraph>
							<strong>{currentProject?.name.slice(0, 33)}</strong>
						</Paragraph>
						<ButtonGroup>
							<Button onClick={handleRun}>Run Graph</Button>
							<Button onClick={handleNewGraphButton}>New Graph</Button>
							<Button onClick={handleLoadGraph}>Load Graph</Button>
							<Button onClick={handleSaveGraph}>Save Graph</Button>
						</ButtonGroup>
					</Space>
					<Button onClick={() => setIsConfigWindowOpen(true)}>Settings</Button>
				</Space>
			</Content>
		);
	};

	/**
	 * Left side "sidebar" with project data, subgraph tree, debugging JSON, etc.
	 */
	const ProjectSidebar: React.FC = () => {
		return (
			<Content pad style={{ display: sidebarOpen ? "block" : "none", maxWidth: "320px" }}>
				<Content>
					<Paragraph>
						Project: <strong>{currentProject?.name}</strong>
					</Paragraph>
					<Paragraph>Graph Tree</Paragraph>
					<Card pad>
						<SubGraphTree graphs={subGraphs} onSelect={handleSelectItem} onDelete={(e:any)=>{
							console.log("are you gunna handle this?", e);
						}} />
					</Card>
					<Space justify="stretch">
						<Button onClick={handleAddGraph}>Add Subgraph</Button>
						<Button onClick={handleLoadSubGraph}>Load Subgraph</Button>
						<Button onClick={handleSaveSubGraph}>Save Subgraph</Button>
					</Space>
				</Content>
				<Paragraph>{JSON.stringify(subGraphs)}</Paragraph>
			</Content>
		);
	};

	/**
	 * The main React Flow area, plus context menus for panel/node/edge
	 */
	const GraphView: React.FC = () => {
		return (
			<Content style={{width:"100%", height:"100%"}}>
				<div style={{width:"100%", height:"100%"}}>
					<ReactFlow
						nodes={graphInContext.nodes}
						edges={graphInContext.edges}
						{...reactFlowProps}
						nodeTypes={nodeTypes}
						connectionLineStyle={{ stroke: "#ddd", strokeWidth: 2 }}
					>
						<MiniMap />
						<Background />
						<Controls />
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
									handleAddNode({ contextMenu, setContextMenu, screenToFlowPosition })
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

					{isRunWindowOpen && <RunWindow onClose={() => setIsRunWindowOpen(false)} />}
					{isConfigWindowOpen && (
						<ConfigWindow onClose={() => setIsConfigWindowOpen(false)} />
					)}
				</div>
			</Content>
		);
	};

	/**
	 * If we have a current project, show the ProjectEditor UI.
	 */
	const ProjectEditor: React.FC = () => {
		return (
			<>
				<Content>
					<DebugLayer
						label="LangGraph-GUI"
						extra={
							<Paragraph>
								Project: <strong>{currentProject?.name}</strong>
							</Paragraph>
						}
					/>
				</Content>

				{/* The top toolbar */}
				<ProjectToolbar />

				{/* Main row: sidebar + graph */}
				<ContentRow>
					<ProjectSidebar />
					<GraphView />
				</ContentRow>

				<Content>
					<DebugLayer label="Footer" />
				</Content>
			</>
		);
	};

	// ---------------------------------------------------------------------------
	// RENDER: Conditionally show the project selector or editor
	// ---------------------------------------------------------------------------
	return (
		<Page fixed gap className="oakd content pad">
			{!currentProject ? <ProjectSelector /> : <ProjectEditor />}
		</Page>
	);
};
