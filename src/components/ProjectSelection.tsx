import React from "react";
import { Content, DebugLayer, Paragraph, Space, Title, Button } from "oakd";
import { Project } from "./Context";

interface ProjectSelectionProps {
	projects: Project[];
	onSelectProject: (project: Project) => void;
	onNewProject: () => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({
																	  projects,
																	  onSelectProject,
																	  onNewProject
																  }) => {
	return (
		<>
			<Content>
				<DebugLayer label="Select a Project" />
				<Title>Select a Project</Title>

				{projects.length === 0 && <Paragraph>No projects available.</Paragraph>}

				<Space>
					{projects.map((proj) => (
						<Button
							key={proj.name}
							onClick={() => onSelectProject(proj)}
						>
							{proj.name}
						</Button>
					))}
				</Space>
				<Space>
					<Button onClick={onNewProject}>New Project</Button>
				</Space>
			</Content>
		</>
	);
};
