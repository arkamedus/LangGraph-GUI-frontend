import { useState, useEffect, useRef } from 'react';
import { SubGraph, useGraph } from '../Graph/GraphContext';
import { allSubGraphsToJson } from '../Graph/JsonUtil';
import ConfigManager from '../utils/ConfigManager';
import { Button, ButtonGroup, Paragraph, Space } from "oakd";
import {convertUTCToLocalDatetime} from "../utils/DateTime.ts";

interface RunWindowProps {
	onClose?: () => void;
	onClear: () => void;
	onGraphMessage?: (graph: string, message: any) => void;
	subGraphs: SubGraph[];
	//executionState: ExecutionState;
}

type ResponseMessageType = "system" | "graph" | "info";

interface IResponseMessage {
	message: string;
	type:ResponseMessageType;
	error?: boolean;
	created_at?:string;
}

class ResponseMessage implements IResponseMessage{
	message = "";
	type:ResponseMessageType = "system";
	error = false;
	created_at = new Date().toISOString();
	constructor(options:IResponseMessage) {
		 if (options){
			 this.message = options.message;
			 this.type = options.type;
			 this.error = options.error||false;
		 }
	}
}

function RunWindow({ onClose, onGraphMessage, subGraphs, onClear }: RunWindowProps) {
	const [responseMessages, setResponseMessages] = useState<ResponseMessage[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	//const [cachedGraphs, setCachedGraphs] = useState(false);
	const { username, llmModel, apiKey } = ConfigManager.getSettings();
	const isPollingRef = useRef(false);
	const outputRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	const SERVER_URL = import.meta.env.VITE_BACKEND_URL;

	const uploadGraphData = async () => {
		try {
			const flowData = allSubGraphsToJson(subGraphs);
			console.log('Uploading graph data', subGraphs);

			if (!username) throw new Error("Username not available to upload graph data.");

			const jsonString = JSON.stringify(flowData, null, 2);
			const blob = new Blob([jsonString], { type: 'application/json' });
			const graphFile = new File([blob], 'graph.json');

			const formData = new FormData();
			formData.append('files', graphFile);

			const response = await fetch(`${SERVER_URL}/upload/${encodeURIComponent(username)}`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error('Failed to upload graph data: ' + errorData.error);
			}

			console.log('Graph data successfully uploaded to server.');
			setResponseMessages(prev => [...prev, new ResponseMessage({ message: 'Graph data successfully uploaded to server.',type:"system" })]);

		} catch (error: unknown) {
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) errorMessage = error.message;

			console.error('Error uploading graph data:', errorMessage);
			setResponseMessages(prev => [...prev, new ResponseMessage({ message: `Error uploading graph data: ${errorMessage}`,type:"system", error:true })]);
			throw error;
		}
	};

	const handleRun = async () => {
		if (isRunning) return;
		setIsRunning(true);
		//setResponseMessages([]);
		if (onGraphMessage) onGraphMessage('root', { __EXECUTION: "running" });

		try {
			await uploadGraphData();
			console.log("Attempting to send request to Flask server...");

			if (!username) throw new Error("Username not available to run.");

			const response = await fetch(`${SERVER_URL}/run/${encodeURIComponent(username)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, llm_model: llmModel, api_key: apiKey }),
			});

			if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;

			while (!done) {
				const { value, done: streamDone } = await reader.read();
				done = streamDone;
				if (value) {
					const chunk = decoder.decode(value, { stream: !done });
					const lines = chunk.split("\n");


					//////

					lines.forEach((line: string) => {
						const trimmed = line.trim();
						if (!trimmed) return;

						let jsonPart: string | null = null;

						// Attempt to extract JSON from various formats
						const jsonMatch = trimmed.match(/\{.*\}$/); // Matches JSON-like content at the end of a line
						if (jsonMatch) {
							jsonPart = jsonMatch[0]; // Extract the JSON portion
						} else {
							jsonPart = trimmed.replace(/^data: (STDOUT: )?/, "").trim(); // Fallback for raw JSON
						}

						if (!jsonPart) return;

						try {
							const parsed = JSON.parse(jsonPart);
							//console.log("A",parsed);

							if (parsed.graph && onGraphMessage) {
								onGraphMessage(parsed.graph, parsed);
								setResponseMessages(prev => [...prev, new ResponseMessage({ message: jsonPart,type:"graph" })]);

							}

							if (parsed.status) {
								//console.warn(parsed);
								setResponseMessages(prev => [...prev, new ResponseMessage({ message: parsed.message||"--no message provided--",type:"system", error:parsed.status==="error" })]);

								if (onGraphMessage) {
									onGraphMessage("root", { __EXECUTION: typeof parsed.status === "string"?parsed.status:(parsed.status?"running":"none") });
								}
								if (parsed.status === "success" || parsed.status === "error") {
									setIsRunning(false);
								}
							}
						} catch (error) {
							console.error("Error parsing JSON:", error, "Original Line:", line);
							// Ignore non-JSON lines
							setResponseMessages(prev => [...prev, new ResponseMessage({ message: line,type:"info" })]);
						}
					});




				}
			}
		} catch (error: unknown) {
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) errorMessage = error.message;

			console.error('Error:', errorMessage);
			setResponseMessages(prev => [...prev, new ResponseMessage({ message: `Error: ${errorMessage}`,type:"system", error:true })]);
			setIsRunning(false);
			if (onGraphMessage) onGraphMessage('root', { __EXECUTION: "error" });
		} finally {
			if (isPollingRef.current) {
				// Handle polling cleanup if necessary
			}
		}
	};

	useEffect(() => {
		isPollingRef.current = true;
		const checkStatus = async () => {
			try {
				if (!username) throw new Error("Username not available to check status.");

				const response = await fetch(`${SERVER_URL}/status/${encodeURIComponent(username)}`, {
					method: 'GET',
				});
				const status = await response.json();
				if (status.running) {
					console.error("SET IsRunning from server:", status);
					setIsRunning(status.running);
				}
			} catch (error) {
				console.error('Error checking status:', error);
			}
		};

		const interval = setInterval(checkStatus, 2000);
		return () => {
			isPollingRef.current = false;
			clearInterval(interval);
		};
	}, [username, SERVER_URL]);

	useEffect(() => {
		if (bottomRef.current) {
			bottomRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [responseMessages]);

	//useEffect(() => {
//		setCachedState(executionState);
//	}, [executionState]);

	//const handleLeave = () => {if (onClose){onClose();}}
	const handleClear = () => {
		setResponseMessages([]);
		onClear();
	};

	const hasMessages = responseMessages.length > 0;

	return (
		<div style={{ height: "100%" }} className="oakd standardized-reset standardized-text">
			<Space direction={"vertical"} gap>
				<Paragraph></Paragraph>
				<ButtonGroup>
					<Button
						icon={isRunning ? "Spinner" : "Angle"}
						type="primary"
						onClick={handleRun}
						disabled={isRunning}
					>
						<Paragraph>Run Graph {subGraphs.length}</Paragraph>
					</Button>
					<Button
						onClick={handleClear}
						type="warning"
						disabled={!hasMessages}
					>
						Clear Output
					</Button>
				</ButtonGroup>
				<Space gap justify={"stretch"} wide>
					<div
						ref={outputRef}
						className={hasMessages ? "oakd card pad terminal" : ''}
						style={{
							width: "100%",
							maxWidth: "100%",
							maxHeight: "300px",
							height: isRunning ? "100%" : "auto",
							overflowY: "scroll"
						}}
					>
						{hasMessages && responseMessages.slice(-200).map((rm, index) => (
							<div key={index} className={["entry",rm.type,rm.error?"error":undefined,"pad-h"].filter(Boolean).join(" ")}>

								<Space wide gap style={{flexWrap:"nowrap"}}>
									<Paragraph className={"pad-h"} style={{width:"auto", whiteSpace:"nowrap"}}><strong>{convertUTCToLocalDatetime(rm.created_at)}</strong></Paragraph>
									<Paragraph>|</Paragraph>
								<Paragraph className={"pad-h"} style={{width:"100%"}}>{rm.message}</Paragraph>
								</Space>
							</div>
						))}
						<div ref={bottomRef} />
					</div>
				</Space>
			</Space>
		</div>
	);
}

export default RunWindow;
