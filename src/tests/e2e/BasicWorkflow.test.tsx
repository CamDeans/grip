import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple component for testing
const ProjectDisplay = ({ projectId }: { projectId: string }) => {
  return (
    <div>
      <h1>Project: {projectId}</h1>
      <p className="project-description">This is a test project</p>
      <button>Edit Project</button>
    </div>
  );
};

// Define project type
interface Project {
  id: string;
  name: string;
  description: string;
}

describe('Basic End-to-End Workflow', () => {
  it('renders a simple component successfully', async () => {
    render(<ProjectDisplay projectId="test-project-id" />);
    
    expect(screen.getByText(/Project: test-project-id/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a test project/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Project/i })).toBeInTheDocument();
  });
  
  it('handles async operations', async () => {
    // Mock a simple async operation
    const fetchData = jest.fn().mockResolvedValue({
      id: 'test-project-id',
      name: 'Test Project',
      description: 'A test project'
    });
    
    // Component that uses async data
    const AsyncProjectDisplay = () => {
      const [project, setProject] = React.useState<Project | null>(null);
      
      React.useEffect(() => {
        fetchData().then((data: Project) => {
          setProject(data);
        });
      }, []);
      
      if (!project) return <div>Loading...</div>;
      
      return (
        <div>
          <h1>Project: {project.id}</h1>
          <h2>{project.name}</h2>
          <p>{project.description}</p>
        </div>
      );
    };
    
    render(<AsyncProjectDisplay />);
    
    // First it should show loading
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    
    // Then it should show the project data
    await waitFor(() => {
      expect(screen.getByText(/Project: test-project-id/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument();
      expect(screen.getByText(/^A test project$/i)).toBeInTheDocument();
    });
    
    // Verify the fetch was called
    expect(fetchData).toHaveBeenCalledTimes(1);
  });
}); 