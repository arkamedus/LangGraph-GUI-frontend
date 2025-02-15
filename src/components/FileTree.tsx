import React, {useEffect, useState} from 'react';
import {Button, Paragraph, Space} from 'oakd';

interface FileNode {
	name: string;
	isDir: boolean;
	children?: FileNode[];
}

function FileTree({username, status}: { username: string, status: string }) {
	const [tree, setTree] = useState<FileNode | null>(null);
	const SERVER_URL = import.meta.env.VITE_BACKEND_URL;

	useEffect(() => {
		const fetchTree = () => {
			fetch(`${SERVER_URL}/list-files/${encodeURIComponent(username)}`)
				.then(res => res.json())
				.then(data => setTree(data))
				.catch(err => console.error(err));
		};
		fetchTree();
		const interval = setInterval(fetchTree, 5000);
		return () => clearInterval(interval);
	}, [username, SERVER_URL, status]);

	if (!tree) return <Paragraph>Loading...</Paragraph>;

	const renderTree = (node: FileNode, path: string = './workspace') => {
		const currentPath = node.name == username ? `workspace/${node.name}` : node.name;
		return (
			<div key={currentPath} style={{width: "100%"}}>
				<Space gap direction={"vertical"} style={{maxWidth: "100%"}}>
					<Space gap justify={"between"} style={{flexWrap: "nowrap", width: "100%"}}>
						<Paragraph style={{
							textOverflow: "ellipsis",
							maxWidth: "100%",
							overflowX: "hidden"
						}}>{node.isDir?<strong>{currentPath}</strong>:currentPath}</Paragraph>
						{!node.isDir && (
							<Button size={"small"}
									onClick={() =>
										window.open(
											`${SERVER_URL}/download-file/${encodeURIComponent(username)}?filepath=${encodeURIComponent(node.name)}`
										)
									}
							>
								Download
							</Button>
						)}
					</Space>

					{node.isDir &&<Space style={{paddingLeft: "1em", width:"100%"}} gap direction={"vertical"}>
						{node.isDir && node.children?.map(child => renderTree(child, currentPath))}
					</Space>}
				</Space>
			</div>
		);
	};

	return <div>{renderTree(tree)}</div>;
}

export default FileTree;
