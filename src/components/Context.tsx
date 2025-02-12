import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import RunWindow from "../GraphMenu/RunWindow.tsx";
import {Button, Card, Content, ContentRow, DebugLayer, Page, Paragraph, Space, Title} from "oakd";
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
import {SubGraph, useGraph} from "../Graph/GraphContext.tsx";
import {useGraphActions} from "../Graph/GraphActions.tsx";
import {Edge as ReactFlowEdge} from "@xyflow/react/dist/esm/types/edges";
import CustomEdge from "../Graph/CustomEdge.tsx";
import CustomNode from "../Graph/CustomNode.tsx";
import 'oakd/build/index.css';
import SubGraphTree from "./SubGraphTree.tsx";
import {loadJsonFromFile, saveJsonToFile} from "../utils/JsonIO.ts";
import {allSubGraphsToJson, JsonSubGraph, jsonToSubGraph, jsonToSubGraphs, subGraphToJson} from "../Graph/JsonUtil.tsx";


export const Context: React.FC = () => {


	const [isRunWindowOpen, setIsRunWindowOpen] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

	const {subGraphs, currentGraphName, addSubGraph, updateNodeData, handleNodesChange, handleEdgesChange, getCurrentGraph, removeSubGraph, updateSubGraph} = useGraph();
	const [contextMenu, setContextMenu] = useState<{mouseX: number, mouseY: number, nodeId: string | null, edgeId:string | null, type: 'panel' | 'node' | 'edge'} | null>(null);
	const [canvasHeight, setCanvasHeight] = useState<number>(window.innerHeight);
	const menuBarRef = useRef<HTMLDivElement>(null);  //ref for menu bar
	const { screenToFlowPosition } = useReactFlow();

	const { handleAddNode, handleDeleteNode, handleDeleteEdge, handlePanelContextMenu, handleAddEdge } = useGraphActions();


	// Always get the current graph, use initial graph data when current graph is not loaded
	const currentGraph = useMemo(()=> getCurrentGraph(), [getCurrentGraph]);

	const handleCloseContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);


	const handleNodeDataChange = useCallback((nodeId: string, newData: any) => {
		updateNodeData(currentGraphName, nodeId, newData)
	}, [updateNodeData, currentGraphName]);

	const handleEdgeClick = useCallback((event: React.MouseEvent, edge: ReactFlowEdge) => {
		event.preventDefault();
		event.stopPropagation();
		console.log("handleEdgeClick", edge)
	}, []);


	const handleAddGraph = () => {
		const newGraphName = prompt("Enter a new graph name:");
		if (newGraphName) {
			addSubGraph(newGraphName);
		}
	};

	const handleLoadSubGraph = async () => {
		try {
			const jsonData = await loadJsonFromFile();

			if (jsonData) {

				// Make sure jsonData is JsonSubGraph
				if(!jsonData.name || !jsonData.nodes || !jsonData.serial_number){
					throw new Error("Invalid Json Format: must be JsonSubGraph")
				}

				const loadedSubGraph: SubGraph = jsonToSubGraph(jsonData as JsonSubGraph);

				updateSubGraph(loadedSubGraph.graphName, loadedSubGraph);

				alert('Subgraph loaded successfully!');
			}
		} catch (error) {
			console.error("Error loading subgraph:", error);
			alert('Failed to load subgraph: ' + error);
		}
	};
	const handleSaveSubGraph = () => {
		const currentGraph = getCurrentGraph();
		const jsonData = subGraphToJson(currentGraph);
		saveJsonToFile(`${currentGraph.graphName}.json`, jsonData);
	};



	const reactFlowProps = useMemo<ReactFlowProps>(() => ({
		onContextMenu: (event: React.MouseEvent)=> {
			console.log('ON CONTEXT');
			console.log(event);
			return handlePanelContextMenu(event, setContextMenu)},
		onClick: handleCloseContextMenu,
		onNodesChange: (changes: NodeChange[]) => handleNodesChange(currentGraphName, changes),
		onEdgesChange: (changes: EdgeChange[]) => handleEdgesChange(currentGraphName, changes),
		onEdgeClick: handleEdgeClick,
		onConnect: handleAddEdge,
		edgeTypes: {
			custom: (props) => {
				const {sourceNode, targetNode} = props.data || {}
				return <CustomEdge {...props} sourceNode={sourceNode} targetNode={targetNode} />
			},
		},
	}),[handlePanelContextMenu,handleCloseContextMenu, handleNodesChange, handleEdgesChange, handleEdgeClick, handleAddEdge, currentGraphName, setContextMenu])

	useEffect(() => {
		const handleResize = () => {
			if (menuBarRef.current) {
				const menuBarHeight = menuBarRef.current.offsetHeight;
				setCanvasHeight(window.innerHeight - menuBarHeight - 10);
			} else {
				setCanvasHeight(window.innerHeight-10);
			}
		};

		window.addEventListener('resize', handleResize);
		handleResize();

		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const nodeTypes = useMemo(() => ({
		custom: (props: any) => <CustomNode {...props} onNodeDataChange={handleNodeDataChange}  />,
	}), [handleNodeDataChange]);


	const handleRun=()=>{
		console.log('running');
		setIsRunWindowOpen(true);
	}

	const handleNewGraph = () => {
		console.log("New Graph clicked");
	};

	const handleLoadGraph = async () => {
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

				alert('Graph loaded successfully!');
			}

		} catch (error) {
			console.error("Error loading graph:", error);
			alert('Failed to load graph: ' + error);
		}
	};

	const handleSaveGraph = () => {
		const jsonData = allSubGraphsToJson(subGraphs);
		saveJsonToFile("Save.json", jsonData);
	};

	return (<Page fixed gap>
		<Content>
			<DebugLayer label="LangGraph-GUI" >
				<Space>
					<Button icon="Bar" size={"default"} onClick={()=>{
					setSidebarOpen(!sidebarOpen);
				}}/>

					<Button  onClick={handleNewGraph}>New Graph</Button>
					<Button  onClick={handleLoadGraph}>Load Graph</Button>
					<Button  onClick={handleSaveGraph}>Save Graph</Button>

				</Space>
			</DebugLayer>
		</Content>
		<ContentRow>
			<Content pad style={{display: sidebarOpen?"block":"none", maxWidth:"320px"}}>

				<Content>
					<Paragraph>Graph Tree</Paragraph>
					<Card pad>
						<SubGraphTree graphs={subGraphs} onSelect={(item)=>{
						console.log('SELECTED', item);
					}}/>
					</Card>
					<Space justify={"stretch"}>
						<Button  onClick={handleAddGraph}>Add Subgraph</Button>
						<Button onClick={handleLoadSubGraph}>Load Subgraph</Button>
						<Button  onClick={handleSaveSubGraph}>Save Subgraph</Button>
					</Space>
				</Content>
				<Paragraph>{JSON.stringify(subGraphs)}</Paragraph>
			</Content>
			<Content grow style={{width:"100%",height:"100%"}}>
				<DebugLayer label={"Graph"}><ReactFlow
					nodes={currentGraph.nodes}
					edges={currentGraph.edges}
					{...reactFlowProps}
					nodeTypes={nodeTypes}
					connectionLineStyle={{ stroke: '#ddd', strokeWidth: 2 }}

				>
					<MiniMap />
					<Background />
					<Controls />
				</ReactFlow>

					{contextMenu && contextMenu.type === 'panel' && (
						<div
							className="fixed bg-white border border-gray-300 z-1000 p-2"
							style={{
								top: contextMenu.mouseY,
								left: contextMenu.mouseX,
							}}
						>
							<button onClick={()=> handleAddNode({contextMenu, setContextMenu, screenToFlowPosition})} className="block bg-green-500 hover:bg-green-700 text-white font-bold px-2 rounded">Add Node</button>
							<button onClick={handleCloseContextMenu} className="block bg-gray-500 hover:bg-gray-700 text-white font-bold px-2 rounded">Cancel</button>
						</div>
					)}
					{contextMenu && contextMenu.type === 'node' &&(
						<div
							className="fixed bg-white border border-gray-300 z-1000 p-2"
							style={{
								top: contextMenu.mouseY,
								left: contextMenu.mouseX,
							}}
						>
							{/* <button onClick={handleAddEdge} className="block bg-blue-500 hover:bg-blue-700 text-white font-bold px-2 rounded">Add Edge</button> */}
							<button onClick={()=> handleDeleteNode(contextMenu, setContextMenu)} className="block bg-red-500 hover:bg-red-700 text-white font-bold px-2 rounded">Delete Node</button>
							<button onClick={handleCloseContextMenu} className="block bg-gray-500 hover:bg-gray-700 text-white font-bold px-2 rounded">Cancel</button>
						</div>
					)}
					{contextMenu && contextMenu.type === 'edge' &&(
						<div
							className="fixed bg-white border border-gray-300 z-1000 p-2"
							style={{
								top: contextMenu.mouseY,
								left: contextMenu.mouseX,
							}}
						>
							<button onClick={()=> handleDeleteEdge(contextMenu, setContextMenu)} className="block bg-red-500 hover:bg-red-700 text-white font-bold px-2 rounded">Delete Edge</button>
							<button onClick={handleCloseContextMenu} className="block bg-gray-500 hover:bg-gray-700 text-white font-bold px-2 rounded">Cancel</button>
						</div>
					)}

				</DebugLayer>
			</Content>
		</ContentRow>
		<Content>
			<DebugLayer label="Footer" />
		</Content>
	</Page>)

	return <div>

		<button onClick={handleRun}> RUN </button>
		{isRunWindowOpen && <RunWindow onClose={()=>{
			setIsRunWindowOpen(false);
		}} />}

	</div>

}

