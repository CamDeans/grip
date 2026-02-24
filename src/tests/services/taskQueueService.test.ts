import { ObjectId } from 'mongodb';
import { 
  createTask,
  getTaskById,
  getProjectTasks,
  cancelTask,
  getQueueStatus,
  taskEvents,
} from '@/lib/services/taskQueueService';
import { connectToDatabase } from '@/lib/mongodb';

// Mock MongoDB client
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
  clientPromise: {
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          toArray: jest.fn()
        }),
        updateOne: jest.fn(),
        countDocuments: jest.fn()
      })
    })
  }
}));

// Mock ObjectId
jest.mock('mongodb', () => {
  const originalModule = jest.requireActual('mongodb');
  return {
    ...originalModule,
    ObjectId: jest.fn().mockImplementation((id) => ({
      toString: () => id || 'mock-id',
      toHexString: () => id || 'mock-id'
    }))
  };
});

// Mock TaskRunnerService
jest.mock('@/lib/services/taskRunnerService', () => ({
  __esModule: true,
  default: {
    executeCommand: jest.fn().mockResolvedValue({ success: true, output: 'Task executed successfully' })
  }
}));

describe.skip('Task Queue Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      // Mock insertOne to return a successful result
      const mockInsertOne = jest.fn().mockResolvedValue({
        insertedId: new ObjectId('mock-task-id')
      });
      
      // Set up the mock for the collection method
      const mockCollection = jest.fn().mockReturnValue({
        insertOne: mockInsertOne
      });
      
      // Set up the mock for the db method
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase to return an object with a db method
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Task parameters
      const taskParams = {
        projectId: 'project-123',
        name: 'Test Task',
        description: 'A test task for unit testing',
        type: 'build' as const,
        priority: 'normal' as const,
        command: 'npm run build',
        metadata: {
          createdBy: 'unit-test',
          phase: 'Testing',
          step: 'Unit Tests'
        }
      };

      // Call the createTask function
      const result = await createTask(taskParams);

      // Verify the database was connected to
      expect(connectToDatabase).toHaveBeenCalled();
      
      // Verify the correct collection was accessed
      expect(mockDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('tasks');
      
      // Verify insertOne was called with the expected parameters
      expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
        projectId: new ObjectId('project-123'),
        name: 'Test Task',
        description: 'A test task for unit testing',
        type: 'build',
        priority: 'normal',
        command: 'npm run build',
        status: 'queued',
        metadata: {
          createdBy: 'unit-test',
          phase: 'Testing',
          step: 'Unit Tests'
        }
      }));
      
      // Verify the function returned the expected result
      expect(result).toEqual(expect.objectContaining({
        _id: new ObjectId('mock-task-id'),
        projectId: new ObjectId('project-123'),
        name: 'Test Task',
        status: 'queued'
      }));
    });

    it('should handle errors during task creation', async () => {
      // Mock the database error
      (connectToDatabase as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Task parameters
      const taskParams = {
        projectId: 'project-123',
        name: 'Test Task',
        description: 'A test task for unit testing',
        type: 'build' as const,
        command: 'npm run build',
        metadata: {
          createdBy: 'unit-test'
        }
      };

      // Expect the function to throw an error
      await expect(createTask(taskParams)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getTaskById', () => {
    it('should retrieve a task by ID', async () => {
      // Mock task data
      const mockTask = {
        _id: new ObjectId('task-123'),
        projectId: new ObjectId('project-123'),
        name: 'Test Task',
        description: 'A test task',
        status: 'completed',
        type: 'build',
        command: 'npm run build',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock findOne to return the mock task
      const mockFindOne = jest.fn().mockResolvedValue(mockTask);
      
      // Set up collection mock
      const mockCollection = jest.fn().mockReturnValue({
        findOne: mockFindOne
      });
      
      // Set up db mock
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Call getTaskById
      const result = await getTaskById('task-123');

      // Verify database interactions
      expect(connectToDatabase).toHaveBeenCalled();
      expect(mockDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('tasks');
      expect(mockFindOne).toHaveBeenCalledWith({ _id: new ObjectId('task-123') });
      
      // Verify result
      expect(result).toEqual(mockTask);
    });

    it('should return null for non-existent task', async () => {
      // Mock findOne to return null (task not found)
      const mockFindOne = jest.fn().mockResolvedValue(null);
      
      // Set up collection mock
      const mockCollection = jest.fn().mockReturnValue({
        findOne: mockFindOne
      });
      
      // Set up db mock
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Call getTaskById
      const result = await getTaskById('nonexistent-task');

      // Verify result is null
      expect(result).toBeNull();
    });
  });

  describe('getProjectTasks', () => {
    it('should retrieve tasks for a project with filters', async () => {
      // Mock tasks
      const mockTasks = [
        {
          _id: new ObjectId('task-1'),
          projectId: new ObjectId('project-123'),
          name: 'Task 1',
          status: 'completed',
          type: 'build'
        },
        {
          _id: new ObjectId('task-2'),
          projectId: new ObjectId('project-123'),
          name: 'Task 2',
          status: 'running',
          type: 'deploy'
        }
      ];

      // Mock find and related operations
      const mockToArray = jest.fn().mockResolvedValue(mockTasks);
      const mockSkip = jest.fn().mockReturnValue({ toArray: mockToArray });
      const mockLimit = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFind = jest.fn().mockReturnValue({ sort: mockSort });
      
      // Set up collection mock
      const mockCollection = jest.fn().mockReturnValue({
        find: mockFind
      });
      
      // Set up db mock
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Call getProjectTasks with filters
      const result = await getProjectTasks('project-123', {
        status: ['completed', 'running'],
        type: ['build', 'deploy'],
        limit: 10,
        skip: 0
      });

      // Verify database interactions
      expect(connectToDatabase).toHaveBeenCalled();
      expect(mockDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('tasks');
      expect(mockFind).toHaveBeenCalledWith({
        projectId: new ObjectId('project-123'),
        status: { $in: ['completed', 'running'] },
        type: { $in: ['build', 'deploy'] }
      });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockToArray).toHaveBeenCalled();
      
      // Verify result
      expect(result).toEqual(mockTasks);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a task successfully', async () => {
      // Mock the task
      const mockTask = {
        _id: new ObjectId('task-123'),
        projectId: new ObjectId('project-123'),
        name: 'Test Task',
        status: 'queued',
        type: 'build'
      };
      
      // Mock findOne to return the task
      const mockFindOne = jest.fn().mockResolvedValue(mockTask);
      
      // Mock updateOne to indicate success
      const mockUpdateOne = jest.fn().mockResolvedValue({
        modifiedCount: 1
      });
      
      // Set up collection mock
      const mockCollection = jest.fn().mockReturnValue({
        findOne: mockFindOne,
        updateOne: mockUpdateOne
      });
      
      // Set up db mock
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Call cancelTask
      const result = await cancelTask('task-123', 'Cancelled for testing');

      // Verify database interactions
      expect(connectToDatabase).toHaveBeenCalled();
      expect(mockDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('tasks');
      expect(mockFindOne).toHaveBeenCalledWith({ _id: new ObjectId('task-123') });
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: new ObjectId('task-123') },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'cancelled',
            cancellationReason: 'Cancelled for testing'
          })
        })
      );
      
      // Verify result
      expect(result).toBe(true);
    });

    it('should return false when task is not found', async () => {
      // Mock findOne to return null (task not found)
      const mockFindOne = jest.fn().mockResolvedValue(null);
      
      // Set up collection mock
      const mockCollection = jest.fn().mockReturnValue({
        findOne: mockFindOne
      });
      
      // Set up db mock
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Call cancelTask for non-existent task
      const result = await cancelTask('nonexistent-task', 'Cancellation reason');

      // Verify result is false
      expect(result).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status with task counts', async () => {
      // Mock countDocuments for different statuses
      const mockCountDocuments = jest.fn()
        .mockResolvedValueOnce(5)  // queued
        .mockResolvedValueOnce(2)  // scheduled
        .mockResolvedValueOnce(3)  // running
        .mockResolvedValueOnce(10) // completed
        .mockResolvedValueOnce(1)  // failed
        .mockResolvedValueOnce(0); // cancelled
      
      // Set up collection mock
      const mockCollection = jest.fn().mockReturnValue({
        countDocuments: mockCountDocuments
      });
      
      // Set up db mock
      const mockDb = jest.fn().mockReturnValue({
        collection: mockCollection
      });
      
      // Mock connectToDatabase
      (connectToDatabase as jest.Mock).mockResolvedValue({
        db: mockDb
      });

      // Call getQueueStatus
      const result = await getQueueStatus();

      // Verify database interactions
      expect(connectToDatabase).toHaveBeenCalled();
      expect(mockDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('tasks');
      expect(mockCountDocuments).toHaveBeenCalledTimes(6);
      
      // Verify the returned status object
      expect(result).toEqual({
        queued: 5,
        scheduled: 2,
        running: 3,
        completed: 10,
        failed: 1,
        cancelled: 0,
        totalActive: 10,  // queued + scheduled + running
        totalProcessed: 11 // completed + failed + cancelled
      });
    });
  });

  describe('taskEvents', () => {
    it('should emit events for task lifecycle', () => {
      // Set up event listeners
      const taskCreatedListener = jest.fn();
      const taskStartedListener = jest.fn();
      const taskCompletedListener = jest.fn();
      
      // Register event listeners
      taskEvents.on('task:created', taskCreatedListener);
      taskEvents.on('task:started', taskStartedListener);
      taskEvents.on('task:completed', taskCompletedListener);
      
      // Mock task data
      const mockTask = {
        _id: new ObjectId('task-123'),
        projectId: new ObjectId('project-123'),
        name: 'Test Task',
        status: 'completed'
      };
      
      // Emit events
      taskEvents.emit('task:created', mockTask);
      taskEvents.emit('task:started', mockTask);
      taskEvents.emit('task:completed', mockTask);
      
      // Verify each listener was called once with the mock task
      expect(taskCreatedListener).toHaveBeenCalledTimes(1);
      expect(taskCreatedListener).toHaveBeenCalledWith(mockTask);
      
      expect(taskStartedListener).toHaveBeenCalledTimes(1);
      expect(taskStartedListener).toHaveBeenCalledWith(mockTask);
      
      expect(taskCompletedListener).toHaveBeenCalledTimes(1);
      expect(taskCompletedListener).toHaveBeenCalledWith(mockTask);
      
      // Clean up event listeners
      taskEvents.removeAllListeners();
    });
  });
}); 