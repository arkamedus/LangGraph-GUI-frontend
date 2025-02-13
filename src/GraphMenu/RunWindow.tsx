// GraphMenu/RunWindow.tsx

import {useState, useEffect, useRef} from 'react';
import {SubGraph, useGraph} from '../Graph/GraphContext';
import {allSubGraphsToJson} from '../Graph/JsonUtil';
import ConfigManager from '../utils/ConfigManager';
import {Button, ButtonGroup, Card, Paragraph, Space} from "oakd";

interface RunWindowProps {
	onClose: () => void;
	onClear: () => void;
	// New callback prop: when a message contains a "graph" parameter,
	// this callback is invoked with the graph name and the full message.
	onGraphMessage?: (graph: string, message: any) => void;
	subGraphs: SubGraph[];
}

function RunWindow({onClose, onGraphMessage, subGraphs, onClear}: RunWindowProps) {
	const [responseMessage, setResponseMessage] = useState('');
	const [isRunning, setIsRunning] = useState(false);
	const {username, llmModel, apiKey} = ConfigManager.getSettings();
	const isPollingRef = useRef(false);
	const outputRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);


	const SERVER_URL = import.meta.env.VITE_BACKEND_URL;

	const uploadGraphData = async () => {
		try {
			const flowData = allSubGraphsToJson(subGraphs);
			console.log('uploading', subGraphs);
			if (!username) {
				throw new Error("Username not available to upload graph data.");
			}
			const jsonString = JSON.stringify(flowData, null, 2);
			const blob = new Blob([jsonString], {type: 'application/json'});
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
			setResponseMessage(prev => prev + '\nGraph data successfully uploaded to server.\n');
		} catch (error: unknown) {
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			console.error('Error uploading graph data:', errorMessage);
			setResponseMessage(prev => prev + '\nError uploading graph data: ' + errorMessage);
			throw error;
		}
	};

	const handleRun = async () => {
		if (isRunning) return;
		setIsRunning(true);
		setResponseMessage('');
		if (onGraphMessage) {
			onGraphMessage('root', {__EXECUTION: "running"});
		}

		try {

			await uploadGraphData();
			console.log("Attempting to send request to Flask server...");

			if (!username) {
				throw new Error("Username not available to run.");
			}

			const response = await fetch(`${SERVER_URL}/run/${encodeURIComponent(username)}`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					username: username,
					llm_model: llmModel,
					api_key: apiKey,
				}),
			});

			if (!response.body) {
				throw new Error('ReadableStream not yet supported in this browser.');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;

			while (!done) {
				const {value, done: streamDone} = await reader.read();
				done = streamDone;
				if (value) {
					const chunk = decoder.decode(value, {stream: !done});
					// Split the chunk into individual stdout lines.
					const lines = chunk.split("\n");
					lines.forEach((line: string) => {
						// Remove any leading/trailing whitespace.
						//
						const trimmed = line.trim();
						if (!trimmed) return;
						// Remove the "data: STDOUT:" prefix if present.
						const jsonPart = trimmed.replace("data: STDOUT: ", "");
						try {
							const parsed = JSON.parse(jsonPart);
							console.log(parsed);
							// If the message contains a "graph" parameter, invoke the callback.
							if (parsed.graph && onGraphMessage) {
								onGraphMessage('root', parsed);
							}
						} catch (error) {
//                            console.error("Error parsing stdout chunk:", error);
						}

						try {
							const parsed = JSON.parse(line.replace("data: ", "").trim());
							console.warn(parsed);
							if (parsed.status) {
								if (onGraphMessage) {
									onGraphMessage('root', {__EXECUTION: parsed.status});
								}
								if (parsed.status === "success") {
									setIsRunning(false);
								} else if (parsed.status === "error") {
									setIsRunning(false);
								}
							}
						} catch (error) {
							//console.error(error);
							// Ignore parsing errors for non-JSON chunks.
						}

					});
					// Append raw chunk to our output.
					setResponseMessage(prev => prev + chunk);
					// Optionally, check if the parsed message signals completion.

				}
			}

		} catch (error: unknown) {
			let errorMessage = "An unknown error occurred";
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			console.error('Error:', errorMessage);
			setResponseMessage(prev => prev + '\nError: ' + errorMessage);
			// alert('Error: ' + errorMessage);
			setIsRunning(false);
			if (onGraphMessage) {
				onGraphMessage('root', {__EXECUTION: "error"});
			}

		} finally {
			if (isPollingRef.current) {
				//    setIsRunning(false);
			}
		}
	};

	useEffect(() => {
		isPollingRef.current = true;
		const checkStatus = async () => {
			try {
				if (!username) {
					throw new Error("Username not available to check status.");
				}
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

	// Auto-scroll output log when responseMessage updates
	useEffect(() => {
		if (bottomRef.current) {
			bottomRef.current.scrollIntoView({behavior: 'smooth'});
		}
	}, [responseMessage]);

	const handleLeave = async () => {
		onClose();
	};

	const handleClear = async () => {
		setResponseMessage("");
		onClear();
	};

	return (
		<div style={{maxHeight: "400px", height: "100%"}} className="oakd standardized-reset standardized-text">
			<Space direction={"vertical"} gap>
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
						disabled={responseMessage === ""}
					>
						Clear Output
					</Button>
				</ButtonGroup>
				<div
					ref={outputRef}
					className={responseMessage ? "oakd card pad" : ''}
					style={{
						width: "100%",
						maxWidth: "100%",
						maxHeight: "300px",
						height: isRunning ? "100%" : "auto",
						overflowY: "scroll"
					}}
				>
					{responseMessage && <pre>{responseMessage}</pre>}
					<div ref={bottomRef}/>
				</div>
			</Space>
		</div>
	);
}

export default RunWindow;
