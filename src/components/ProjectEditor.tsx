import React, { useMemo, useCallback, useState } from "react";
import {
	Button,
	ButtonGroup,
	Card,
	Content,
	ContentRow,
	DebugLayer,
	IconApps,
	Paragraph,
	Space
} from "oakd";
import {
	Background,
	Controls,
	EdgeChange,
	MiniMap,
	NodeChange,
	ReactFlow,
	ReactFlowProps,
} from "@xyflow/react";
import SubGraphTree from "./SubGraphTree";
import CustomNode from "./nodes/CustomNode";
import { StepEdge } from "@xyflow/react";
import RunWindow from "../GraphMenu/RunWindow";
import ConfigWindow from "../GraphMenu/ConfigWindow";
import { Project } from "./Context";
import { SubGraph } from "../Graph/GraphContext";
import {
	loadJsonFromFile,
	saveJsonToFile
} from "../utils/JsonIO";
import {
	allSubGraphsToJson,
	jsonToSubGraph,
	jsonToSubGraphs,
	subGraphToJson
} from "../Graph/JsonUtil";

interface ProjectEditorProps {
	project: Project;
	setProject: React.Dispatch<React.SetStateAction<Project | null>>;
	projects: Project[];
	setProjects: React.Dispatch<React.SetStateAction<Project[]>>;

	onBackToProjects: () => void;

	sidebarOpen: boolean;
	setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;

	isRunWindowOpen: boolean;
	onCloseRunWindow: () => void;

	isConfigWindowOpen: boolean;
	onOpenConfig: () => void;
	onCloseConfig: () => void;

	menuBarRef: React.RefObject<HTMLDivElement>;
	canvasHeight: number;

	subGraphs: SubGraph[];
	getCurrentGraph: () => SubGraph;
	removeSubGraph: (graphName: string) => void;
	updateSubGraph: (graphName: string, newGraph: SubGraph) => void;
	setCurrentGraphName: (graphName: string) => void;

	handleAddNode: any;
	handleDeleteNode: any;
	handleDeleteEdge: any;
	handlePanelContextMenu: any;
	handleRun: () => void;

	// Additional from useReactFlow
	screenToFlowPosition: any;
	setCenter: any;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({
																project,
																setProject,
																projects,
																setProjects,
																onBackToProjects,

																sidebarOpen,
																setSidebarOpen,

																isRunWindowOpen,
																onCloseRunWindow,

																isConfigWindowOpen,
																onOpenConfig,
																onCloseConfig,

																menuBarRef,
																canvasHeight,

																subGraphs,
																getCurrentGraph,
																removeSubGraph,
																updateSubGraph,
																setCurrentGraphName,

																handleAddNode,
																handleDeleteNode,
																handleDeleteEdge,
																handlePanelContextMenu,
																handleRun,

																screenToFlowPosition,
																setCenter
															}) => {
	// The subgraph currently active in GraphContext
	const currentGraph = getCurrentGraph();

	// We can define nodeTypes, edges, etc.
	const nodeTypes = useMemo(() => ({
		custom: (props: any) => <CustomNode {...props} />
	}), []);

	// React Flow: track changes
	const handleNodesChange = useCallback((changes: NodeChange[]) => {
		// e.g. pass to GraphContext
	}, []);

	const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
		// e.g. pass to GraphContext
	}, []);

	// Create a brand new subgraph
	const handleAddGraph = useCallback(() => {
		const name = prompt("Enter a new graph name:");
		if (!name) return;
		// e.g. addSubGraph(name)
		// store in project
	}, [project]);

	// Load single subgraph from file
	const handleLoadSubGraph = useCallback(async () => {
		const data = await loadJsonFromFile();
		// e.g. parse, update GraphContext & project
	}, [project]);

	// Save current subgraph
	const handleSaveSubGraph = useCallback(() => {
		const json = subGraphToJson(getCurrentGraph());
		saveJsonToFile(`${getCurrentGraph().graphName}.json`, json);
	}, [getCurrentGraph]);

	// Load multiple subgraphs
	const handleLoadGraph = useCallback(async () => {
		try {
			const jsonData = await loadJsonFromFile();
			if(jsonData){
				const loadedSubGraphs: SubGraph[] = jsonToSubGraphs(jsonData);

				//Clear subgraphs first
				subGraphs.forEach(graph => {
					if(graph.graphName !== 'root') removeSubGraph(graph.graphName)
				})
				//Then load new subgraphs
				loadedSubGraphs.forEach(subGraph => updateSubGraph(subGraph.graphName,subGraph))

				//alert('Graph loaded successfully!');
			}

		} catch (error) {
			console.error("Error loading graph:", error);
			alert('Failed to load graph: ' + error);
		}
	}, [project]);

	// Save all subgraphs
	const handleSaveGraph = useCallback(() => {
		const json = allSubGraphsToJson(subGraphs);
		saveJsonToFile("Save.json", json);
	}, [subGraphs]);

	// Center a node in the flow
	const centerNode = (item: any, delay: number) => {
		setTimeout(() => {
			const x = item.position.x + ((item.width || 200) / 2);
			const y = item.position.y + ((item.height || 200) / 2);
			setCenter(x, y, { duration: 250, zoom: 1 });
		}, delay);
	};

	// Called when selecting a subgraph or node from SubGraphTree
	const handleSelectItem = (item: SubGraph | any, ancestry: SubGraph[]) => {
		if (item && "graphName" in item) {
			setCurrentGraphName(item.graphName);
		} else if (item && item.position) {
			const containingGraph = ancestry.length
				? ancestry[ancestry.length - 1]
				: null;
			if (containingGraph && containingGraph.graphName !== getCurrentGraph().graphName) {
				setCurrentGraphName(containingGraph.graphName);
				centerNode(item, 120);
			} else {
				centerNode(item, 20);
			}
		}
	};

	// Prepare ReactFlowProps
	const reactFlowProps: ReactFlowProps = useMemo(() => ({
		onContextMenu: (event: React.MouseEvent) => handlePanelContextMenu(event),
		onClick: () => {}, // e.g. close context menu
		onNodesChange: handleNodesChange,
		onEdgesChange: handleEdgesChange,
		onEdgeClick: () => {},
		onConnect: () => {},
		edgeTypes: {
			custom: StepEdge
		}
	}), [handlePanelContextMenu, handleNodesChange, handleEdgesChange]);

	return (
		<>
			{/* Top bar */}
			<Content>
				<Space justify="between" wide>
					<Space gap align="center">
						<Button icon="Angle" onClick={onBackToProjects}>Projects</Button>
						<Button icon="Bar" onClick={() => setSidebarOpen(!sidebarOpen)} />
						<Paragraph>
							<strong>{project.name.slice(0, 33)}</strong>
						</Paragraph>
						<ButtonGroup>
							<Button onClick={handleRun}>Run Graph</Button>
							<Button>New Graph</Button>
							<Button onClick={handleLoadGraph}>Load Graph</Button>
							<Button onClick={handleSaveGraph}>Save Graph</Button>
						</ButtonGroup>
					</Space>
					<Button onClick={onOpenConfig}>Settings</Button>
				</Space>
			</Content>

			<ContentRow>
				{/* Sidebar */}
				<Content pad style={{ display: sidebarOpen ? "block" : "none", maxWidth: "320px" }}>
					<Content>
						<Paragraph>
							Project: <strong>{project.name}</strong>
						</Paragraph>
						<Paragraph>Graph Tree</Paragraph>
						<Card pad>
							<SubGraphTree
								graphs={subGraphs}
								onSelect={handleSelectItem}
							/>
						</Card>
						<Space justify="stretch">
							<Button onClick={handleAddGraph}>Add Subgraph</Button>
							<Button onClick={handleLoadSubGraph}>Load Subgraph</Button>
							<Button onClick={handleSaveSubGraph}>Save Subgraph</Button>
						</Space>
					</Content>
					<Paragraph>{JSON.stringify(subGraphs)}</Paragraph>
				</Content>

				{/* Main Graph Editor */}
				<Content grow style={{ width: "100%", height: "100%" }}>
					<DebugLayer
						label={
							<Paragraph className="label">
								<IconApps size="small" />
								Graph (<strong>{currentGraph.graphName}</strong>)
							</Paragraph>
						}
					>
						<ReactFlow
							nodes={currentGraph.nodes}
							edges={currentGraph.edges}
							{...reactFlowProps}
							nodeTypes={nodeTypes}
							connectionLineStyle={{ stroke: "#ddd", strokeWidth: 2 }}
						>
							<MiniMap />
							<Background />
							<Controls />
						</ReactFlow>

						{/* Possibly context menus for panel/node/edge */}
						{/* Possibly run or config windows */}
						{isRunWindowOpen && (
							<RunWindow onClose={onCloseRunWindow} />
						)}
						{isConfigWindowOpen && (
							<ConfigWindow onClose={onCloseConfig} />
						)}
					</DebugLayer>
				</Content>
			</ContentRow>

			<Content>
				<DebugLayer label="Footer" />
			</Content>
		</>
	);
};
