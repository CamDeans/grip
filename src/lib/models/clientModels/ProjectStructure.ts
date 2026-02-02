/**
 * Client-safe version of the ProjectStructure model
 * This version doesn't import or use any MongoDB-specific code
 * and is safe to use in client components.
 */

// Import client-safe ID type
import { ClientId } from './BuildLog';

// Type for file/directory node
export interface IFileNode {
  type: 'directory' | 'file';
  name: string;
  path: string;
  language?: string;
  size?: number; // in bytes for files
  children?: IFileNode[]; // for directories
  description?: string; // purpose of this file
  dependencies?: string[]; // other files this depends on
}

// Client-friendly data structure that matches server schema
export interface IProjectStructureData {
  projectId: ClientId;
  name: string;
  description: string;
  fileHierarchy: {
    type: 'directory' | 'file';
    name: string;
    path: string;
    language?: string;
    children?: IFileNode[];
  };
  dependencies: {
    [key: string]: string; // name: version
  };
  buildConfig: {
    commands: {
      [key: string]: string; // e.g., "build": "npm run build"
    };
    environment: {
      [key: string]: string; // environment variables
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Factory function to create an empty project structure (for client-side initialization)
export function createEmptyProjectStructure(): Partial<IProjectStructureData> {
  return {
    name: '',
    description: '',
    fileHierarchy: {
      type: 'directory',
      name: 'root',
      path: '/',
      children: []
    },
    dependencies: {},
    buildConfig: {
      commands: {},
      environment: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Client-side utilities for working with project structures
export const ProjectStructureUtils = {
  // Add a file or directory to the structure
  addFileNode: (structure: IProjectStructureData, node: IFileNode, parentPath: string = '/'): boolean => {
    // Find parent node
    const findParent = (current: IFileNode): IFileNode | null => {
      if (current.path === parentPath) return current;
      if (!current.children) return null;
      
      for (const child of current.children) {
        const found = findParent(child);
        if (found) return found;
      }
      
      return null;
    };
    
    const parent = findParent(structure.fileHierarchy);
    if (!parent) return false;
    
    // Add node to parent's children
    if (!parent.children) parent.children = [];
    parent.children.push(node);
    
    return true;
  },
  
  // Remove a file or directory from the structure
  removeFileNode: (structure: IProjectStructureData, path: string): boolean => {
    // Find parent node
    const findParentOf = (
      current: IFileNode, 
      targetPath: string, 
      parent: IFileNode | null = null
    ): { parent: IFileNode | null, index: number } | null => {
      if (!current.children) return null;
      
      for (let i = 0; i < current.children.length; i++) {
        const child = current.children[i];
        if (child.path === targetPath) {
          return { parent: current, index: i };
        }
        
        const found = findParentOf(child, targetPath, child);
        if (found) return found;
      }
      
      return null;
    };
    
    const found = findParentOf(structure.fileHierarchy, path);
    if (!found || !found.parent || !found.parent.children) return false;
    
    // Remove node from parent's children
    found.parent.children.splice(found.index, 1);
    
    return true;
  },
  
  // Convert file hierarchy to a flat list
  flattenHierarchy: (node: IFileNode): string[] => {
    if (node.type === 'file') {
      return [node.path];
    }
    
    const result: string[] = [];
    if (node.path !== '/') {
      result.push(node.path);
    }
    
    if (node.children) {
      for (const child of node.children) {
        result.push(...ProjectStructureUtils.flattenHierarchy(child));
      }
    }
    
    return result;
  }
}; 