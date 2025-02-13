import React, { useState, useCallback} from "react";
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
    useReactFlow
} from "@xyflow/react";
import {SubGraph, useGraph} from "../Graph/GraphContext";
import {useGraphActions} from "../Graph/GraphActions";
import {Edge as ReactFlowEdge} from "@xyflow/react/dist/esm/types/edges";
import "oakd/build/index.css";
import SubGraphTree, {GraphNode} from "./SubGraphTree";
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

interface Project {
	name: string;
	graphs: SubGraph[];
}

export const Context: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
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

    const {screenToFlowPosition, setCenter} = useReactFlow();
    const graphInContext = getCurrentGraph();

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
        },
        [currentProject, subGraphs, removeSubGraph, updateSubGraph, setCurrentProject, setProjects, setCurrentGraphName]
    );

    const handleBackToProjects = useCallback(() => {
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
            const { data: jsonData } = await loadJsonFromFile();
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
        saveJsonToFile(`subgraph_${curGraph.graphName}.json`, jsonData);
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

    function handleSaveGraph() {
        const jsonData = allSubGraphsToJson(subGraphs);
        saveJsonToFile(`graph_${currentGraphName}.json`, jsonData);
    }

    // ---------------------------------------------------------------------------
    // REACT FLOW: Node + Edge Updates
    // ---------------------------------------------------------------------------

    function onNodesChange(changes: NodeChange[]) {
        console.log("onNodesChange =>", changes);
        // Filter out ephemeral "select"/"dragging"/"dimensions"
        const stableChanges = changes.filter(
            (change) => !["select"].includes(change.type)
        );
        if (stableChanges.length > 0) {
            handleNodesChange(currentGraphName, stableChanges);
        }
    }

    // 2) onEdgesChange is unchanged
    function onEdgesChange(changes: EdgeChange[]) {
        console.log("onEdgesChange =>", changes);
        handleEdgesChange(currentGraphName, changes);
    }

    // Basic edge click
    function handleEdgeClick(event: React.MouseEvent, edge: ReactFlowEdge) {
        event.preventDefault();
        event.stopPropagation();
        console.log("handleEdgeClick", edge);
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

    function handleSelectItem(item: SubGraph | any, ancestry: SubGraph[]) {
        if (item && "graphName" in item) {
            setCurrentGraphName(item.graphName);
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

    function handleRun() {
        setIsRunWindowOpen(true);
    }

    // Node/Edge definitions
    const nodeTypes = {
        custom: (props: any) => (
            <CustomNode
                {...props}
                subGraph={getCurrentGraph()}
                onNodeDataChange={(nodeId, newData) => {
                    // We'll call updateNodeData only after the user finishes (in the node's onBlur).
                    updateNodeData(currentGraphName, nodeId, newData);
                }}
            />
        ),
    };

    return (
        <Page fixed gap className="oakd content pad">
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
                                <Button type="primary" onClick={handleRun}>
                                    <Paragraph>Run Graph</Paragraph>
                                </Button>
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
                                                graphs={subGraphs}
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
                                                            updateSubGraph(e.graphName, { ...currentGraph, nodes: [], edges: [] });
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
                                                <Button icon="Plus"  onClick={handleAddGraph}>
                                                    <Paragraph>Add SubGraph</Paragraph>
                                                </Button>
                                                <Button  onClick={handleLoadSubGraph}>
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
                                        >
                                            {JSON.stringify(subGraphs)}
                                        </textarea>
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
                                    </Paragraph>
                                }
                            >
                                <ReactFlow
                                    nodes={graphInContext.nodes}
                                    edges={graphInContext.edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={(connection) => {
                                        console.log("New connection", connection);
                                        // This is where you can add the new edge to your state
                                        handleAddEdge(connection);
                                    }}
                                    onEdgeClick={(evt, edge) => handleEdgeClick(evt, edge)}
                                    onContextMenu={(evt) => handlePanelContextMenu(evt, setContextMenu)}
                                    onClick={() => setContextMenu(null)}
                                    nodeTypes={nodeTypes}
                                    edgeTypes={{
                                        custom: (props) => {
                                            const {sourceNode, targetNode} = props.data || {}
                                            return <CustomEdge {...props} sourceNode={sourceNode} targetNode={targetNode} />
                                        },
                                    }}
                                    connectionLineStyle={{stroke: "#ddd", strokeWidth: 4}}
                                >
                                    <MiniMap/>
                                    <Background/>
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
                </>
            )}
            {isRunWindowOpen && <RunWindow onClose={() => setIsRunWindowOpen(false)}/>}
            {isConfigWindowOpen && <ConfigWindow onClose={() => setIsConfigWindowOpen(false)}/>}
        </Page>
    );
};
