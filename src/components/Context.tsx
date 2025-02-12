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
import {useGraph} from "../Graph/GraphContext.tsx";
import {useGraphActions} from "../Graph/GraphActions.tsx";
import {Edge as ReactFlowEdge} from "@xyflow/react/dist/esm/types/edges";
import CustomEdge from "../Graph/CustomEdge.tsx";
import CustomNode from "../Graph/CustomNode.tsx";
import GraphPanel from "../Graph/GraphPanel.tsx";
import 'oakd/build/index.css';
import SubGraphTree from "./SubGraphTree.tsx";


export const Context: React.FC = () => {


	const [isRunWindowOpen, setIsRunWindowOpen] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

	const {subGraphs, currentGraphName, updateNodeData, handleNodesChange, handleEdgesChange, getCurrentGraph} = useGraph();
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
	}, [])


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

	return (<Page fixed gap>
		<Content>
			<DebugLayer label="LangGraph-GUI" >
				<Space>
					<Button icon="Bar" size={"default"} onClick={()=>{
					setSidebarOpen(!sidebarOpen);
				}}/>
				

				</Space>
			</DebugLayer>
		</Content>
		<ContentRow>
			<Content pad style={{display: sidebarOpen?"block":"none", maxWidth:"320px"}}>
				<Title>Sidebar</Title>
				<Content>
					<Card pad><SubGraphTree graphs={subGraphs} onSelect={(item)=>{
						console.log('SELECTED', item);
					}}/></Card></Content>
				<Paragraph>{JSON.stringify(getCurrentGraph())}</Paragraph>
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

