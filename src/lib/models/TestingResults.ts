import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * TestingResults model - Stores testing outputs and refinements
 * This tracks test configurations, results, and links to developed components
 */

// Base interface for client-side use
export interface ITestingResultsData {
  projectId: ObjectId;
  testRunId: string;
  name: string;
  testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  framework: string;
  configuration: {
    testFiles: string[];
    testCommand: string;
    environment: string;
    coverage: boolean;
    timeout: number;
    retries: number;
    configFile?: string;
  };
  testSuites: Array<{
    name: string;
    file: string;
    totalTests: number;
    passingTests: number;
    failingTests: number;
    skippedTests: number;
    duration: number; // in milliseconds
    testCases: Array<{
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: number; // in milliseconds
      errorMessage?: string;
      errorStack?: string;
      code?: string;
      assertions: number;
    }>;
  }>;
  coverageResults?: {
    totalCoverage: number;
    statementCoverage: number;
    branchCoverage: number;
    functionCoverage: number;
    lineCoverage: number;
    uncoveredLines: string[];
  };
  consoleOutput: string;
  refinements: Array<{
    file: string;
    issueDescription: string;
    recommendation: string;
    status: 'pending' | 'applied' | 'rejected';
    appliedAt?: Date;
  }>;
  metadata: {
    startedAt: Date;
    endedAt?: Date;
    duration: number; // in milliseconds
    relatedDevelopmentSessionId?: ObjectId;
    userInitiated: boolean;
    automatedRun: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface ITestingResults extends Document, ITestingResultsData {}

// Test case schema
const TestCaseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['passed', 'failed', 'skipped']
  },
  duration: { 
    type: Number, 
    required: true 
  },
  errorMessage: { 
    type: String 
  },
  errorStack: { 
    type: String 
  },
  code: { 
    type: String 
  },
  assertions: { 
    type: Number, 
    required: true,
    default: 0
  }
}, { _id: false });

// Test suite schema
const TestSuiteSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  file: { 
    type: String, 
    required: true 
  },
  totalTests: { 
    type: Number, 
    required: true,
    default: 0
  },
  passingTests: { 
    type: Number, 
    required: true,
    default: 0
  },
  failingTests: { 
    type: Number, 
    required: true,
    default: 0
  },
  skippedTests: { 
    type: Number, 
    required: true,
    default: 0
  },
  duration: { 
    type: Number, 
    required: true,
    default: 0
  },
  testCases: [TestCaseSchema]
}, { _id: false });

// Coverage results schema
const CoverageResultsSchema = new mongoose.Schema({
  totalCoverage: { 
    type: Number, 
    required: true 
  },
  statementCoverage: { 
    type: Number, 
    required: true 
  },
  branchCoverage: { 
    type: Number, 
    required: true 
  },
  functionCoverage: { 
    type: Number, 
    required: true 
  },
  lineCoverage: { 
    type: Number, 
    required: true 
  },
  uncoveredLines: [{ 
    type: String 
  }]
}, { _id: false });

// Refinement schema
const RefinementSchema = new mongoose.Schema({
  file: { 
    type: String, 
    required: true 
  },
  issueDescription: { 
    type: String, 
    required: true 
  },
  recommendation: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'applied', 'rejected'],
    default: 'pending'
  },
  appliedAt: { 
    type: Date 
  }
}, { _id: false });

// Main schema
const TestingResultsSchema = new mongoose.Schema<ITestingResults>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
  },
  testRunId: { 
    type: String, 
    required: true
  },
  name: { 
    type: String, 
    required: true 
  },
  testType: { 
    type: String, 
    required: true,
    enum: ['unit', 'integration', 'e2e', 'performance', 'security', 'accessibility']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'aborted'],
    default: 'pending'
  },
  framework: { 
    type: String, 
    required: true 
  },
  configuration: {
    testFiles: [{ 
      type: String, 
      required: true 
    }],
    testCommand: { 
      type: String, 
      required: true 
    },
    environment: { 
      type: String, 
      required: true 
    },
    coverage: { 
      type: Boolean, 
      required: true,
      default: false
    },
    timeout: { 
      type: Number, 
      required: true,
      default: 5000
    },
    retries: { 
      type: Number, 
      required: true,
      default: 0
    },
    configFile: { 
      type: String 
    }
  },
  testSuites: [TestSuiteSchema],
  coverageResults: CoverageResultsSchema,
  consoleOutput: { 
    type: String,
    default: ''
  },
  refinements: [RefinementSchema],
  metadata: {
    startedAt: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    endedAt: { 
      type: Date 
    },
    duration: { 
      type: Number, 
      required: true,
      default: 0
    },
    relatedDevelopmentSessionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'DevelopmentSession' 
    },
    userInitiated: { 
      type: Boolean, 
      required: true,
      default: false
    },
    automatedRun: { 
      type: Boolean, 
      required: true,
      default: true
    }
  }
}, {
  timestamps: true
});

// Create indexes
TestingResultsSchema.index({ projectId: 1, testType: 1 });
TestingResultsSchema.index({ testRunId: 1 }, { unique: true });
TestingResultsSchema.index({ status: 1 });
TestingResultsSchema.index({ 'metadata.startedAt': -1 });

// Pre-save hook
TestingResultsSchema.pre('save', function(next) {
  // Calculate test duration if a test run is completed
  if ((this.status === 'completed' || this.status === 'failed') && !this.metadata.endedAt) {
    this.metadata.endedAt = new Date();
    this.metadata.duration = this.metadata.endedAt.getTime() - this.metadata.startedAt.getTime();
  }
  
  // Recalculate test suite statistics
  if (this.testSuites && this.testSuites.length > 0) {
    for (const suite of this.testSuites) {
      if (suite.testCases && suite.testCases.length > 0) {
        suite.totalTests = suite.testCases.length;
        suite.passingTests = suite.testCases.filter((tc: any) => tc.status === 'passed').length;
        suite.failingTests = suite.testCases.filter((tc: any) => tc.status === 'failed').length;
        suite.skippedTests = suite.testCases.filter((tc: any) => tc.status === 'skipped').length;
      }
    }
  }
  
  next();
});

// Method to add a test case to a suite
TestingResultsSchema.methods.addTestCase = function(
  suiteName: string,
  testCase: {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    errorMessage?: string;
    errorStack?: string;
    code?: string;
    assertions: number;
  }
) {
  // Find or create the suite
  let suite = this.testSuites.find((s: any) => s.name === suiteName);
  
  if (!suite) {
    this.testSuites.push({
      name: suiteName,
      file: 'unknown',
      totalTests: 0,
      passingTests: 0,
      failingTests: 0,
      skippedTests: 0,
      duration: 0,
      testCases: []
    });
    
    suite = this.testSuites[this.testSuites.length - 1];
  }
  
  // Add the test case
  suite.testCases.push(testCase);
  
  // Update suite stats
  suite.totalTests = suite.testCases.length;
  suite.passingTests = suite.testCases.filter((tc: any) => tc.status === 'passed').length;
  suite.failingTests = suite.testCases.filter((tc: any) => tc.status === 'failed').length;
  suite.skippedTests = suite.testCases.filter((tc: any) => tc.status === 'skipped').length;
  
  // Update suite duration
  suite.duration = suite.testCases.reduce((total: number, tc: any) => total + tc.duration, 0);
  
  return this.save();
};

// Method to add a refinement
TestingResultsSchema.methods.addRefinement = function(
  file: string,
  issueDescription: string,
  recommendation: string
) {
  this.refinements.push({
    file,
    issueDescription,
    recommendation,
    status: 'pending'
  });
  
  return this.save();
};

// Method to update refinement status
TestingResultsSchema.methods.updateRefinementStatus = function(
  index: number,
  status: 'pending' | 'applied' | 'rejected'
) {
  if (this.refinements[index]) {
    this.refinements[index].status = status;
    
    if (status === 'applied') {
      this.refinements[index].appliedAt = new Date();
    }
  }
  
  return this.save();
};

export const TestingResults = mongoose.models.TestingResults || 
  mongoose.model<ITestingResults>('TestingResults', TestingResultsSchema); 