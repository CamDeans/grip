/// <reference types="node" />
import mongoose from 'mongoose'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { Project } from './models/Project'

// Check if we're on the client side
const isClient = typeof window !== 'undefined'

// Only proceed with MongoDB setup on server side
if (!isClient) {
  // Check for MONGODB_URI on server side
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables')
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
  }

  const uri = process.env.MONGODB_URI
  
  // Safely log MongoDB URI without exposing sensitive information
  const maskedUri = uri.replace(
    /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
    'mongodb$1://$2:****@'
  )
  console.log('MongoDB URI configured:', maskedUri)
}

const DB_NAME = 'test'

// MongoDB Client Configuration
const clientOpts = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  dbName: DB_NAME,
}

// Mongoose Configuration
const mongooseOpts = {
  bufferCommands: true,
  autoIndex: true,
  dbName: DB_NAME,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
}

// Create cached variables
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
  var mongoose: {
    conn: mongoose.Mongoose | null
    promise: Promise<mongoose.Mongoose> | null
  }
}

let cached = global.mongoose || { conn: null, promise: null }
let clientPromise: Promise<MongoClient>

if (isClient) {
  clientPromise = new Promise(() => {})
} else {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(process.env.MONGODB_URI!, clientOpts)
      global._mongoClientPromise = client.connect()
        .then((client) => {
          console.log(`Connected to MongoDB Atlas - Database: ${DB_NAME}`)
          return client
        })
        .catch((err) => {
          console.error('MongoDB connection error:', err)
          throw err
        })
    }
    clientPromise = global._mongoClientPromise
  } else {
    const client = new MongoClient(process.env.MONGODB_URI!, clientOpts)
    clientPromise = client.connect()
      .then((client) => {
        console.log(`Connected to MongoDB Atlas - Database: ${DB_NAME}`)
        return client
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err)
        throw err
      })
  }
}

export async function connectToDatabase() {
  if (isClient) {
    console.warn('Attempting to connect to MongoDB from client-side code')
    return mongoose
  }

  if (cached.conn) {
    console.log('Using cached mongoose connection')
    return cached.conn
  }

  if (!cached.promise) {
    console.log('Creating new mongoose connection...')
    cached.promise = mongoose.connect(process.env.MONGODB_URI!, mongooseOpts)
      .then((mongoose) => {
        console.log('Connected to MongoDB with Mongoose')
        return mongoose
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

async function ensureCollections() {
  if (isClient) return;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Get list of collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    // Ensure Projects collection exists with validation
    if (!collectionNames.includes('projects')) {
      console.log('Creating projects collection with validation...');
      await db.createCollection('projects', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["title", "description", "ideation", "userId"],
            properties: {
              title: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              description: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              repository: {
                bsonType: "object",
                required: ["owner", "name"],
                properties: {
                  owner: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  name: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  }
                }
              },
              ideation: {
                bsonType: "object",
                required: ["goals", "targetAudience", "keyFeatures", "technicalRequirements"],
                properties: {
                  goals: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  targetAudience: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  keyFeatures: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  technicalRequirements: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  }
                }
              },
              userId: {
                bsonType: "string",
                description: "must be a string and is required"
              }
            }
          }
        }
      });
      console.log('Projects collection created successfully');
    } else {
      // Update validation for existing collection
      console.log('Updating projects collection validation...');
      await db.command({
        collMod: 'projects',
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["title", "description", "ideation", "userId"],
            properties: {
              title: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              description: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              repository: {
                bsonType: "object",
                required: ["owner", "name"],
                properties: {
                  owner: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  name: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  }
                }
              },
              ideation: {
                bsonType: "object",
                required: ["goals", "targetAudience", "keyFeatures", "technicalRequirements"],
                properties: {
                  goals: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  targetAudience: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  keyFeatures: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  technicalRequirements: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  }
                }
              },
              userId: {
                bsonType: "string",
                description: "must be a string and is required"
              }
            }
          }
        },
        validationLevel: "strict"
      });
      console.log('Projects collection validation updated successfully');
    }

    // Ensure projectStates collection exists
    if (!collectionNames.includes('projectStates')) {
      console.log('Creating projectStates collection...');
      await db.createCollection('projectStates', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "currentPhase", "phases", "createdAt", "updatedAt"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              currentPhase: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              phases: {
                bsonType: "array",
                description: "must be an array and is required",
                items: {
                  bsonType: "object",
                  required: ["name", "status", "steps"],
                  properties: {
                    name: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    status: {
                      bsonType: "string",
                      description: "must be a string and is required",
                      enum: ["pending", "in_progress", "completed"]
                    },
                    steps: {
                      bsonType: "array",
                      description: "must be an array and is required",
                      items: {
                        bsonType: "object",
                        required: ["id", "title", "status", "action", "dependencies", "progress"],
                        properties: {
                          id: {
                            bsonType: ["number", "string"],
                            description: "must be a number or string and is required"
                          },
                          title: {
                            bsonType: "string",
                            description: "must be a string and is required"
                          },
                          status: {
                            bsonType: "string",
                            description: "must be a string and is required",
                            enum: ["pending", "in_progress", "completed"]
                          },
                          action: {
                            bsonType: "string",
                            description: "must be a string and is required"
                          },
                          dependencies: {
                            bsonType: "array",
                            description: "must be an array and is required",
                            items: {
                              bsonType: "string",
                              description: "must be a string"
                            }
                          },
                          progress: {
                            bsonType: "string",
                            description: "must be a string and is required"
                          },
                          completedAt: {
                            bsonType: ["date", "null"],
                            description: "must be a date if present"
                          }
                        }
                      }
                    },
                    completedAt: {
                      bsonType: ["date", "null"],
                      description: "must be a date if present"
                    }
                  }
                }
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              updatedAt: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('ProjectStates collection created successfully');
    }

    // Ensure repositories collection exists with validation
    if (!collectionNames.includes('repositories')) {
      console.log('Creating repositories collection with validation...');
      await db.createCollection('repositories', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["owner", "repo", "files", "linkedProjects", "createdAt", "lastUpdated", "lastAccessed"],
            properties: {
              owner: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              repo: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              files: {
                bsonType: "array",
                description: "must be an array and is required",
                items: {
                  bsonType: "object",
                  required: ["path", "content", "type"],
                  properties: {
                    path: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    content: {
                      anyOf: [
                        { bsonType: "string" },
                        { bsonType: "null" }
                      ],
                      description: "must be a string or null and is required"
                    },
                    type: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    sha: {
                      bsonType: "string",
                      description: "must be a string if present"
                    },
                    lastModified: {
                      bsonType: "date",
                      description: "must be a date if present"
                    },
                    encoding: {
                      bsonType: "string",
                      description: "must be a string if present"
                    }
                  }
                }
              },
              linkedProjects: {
                bsonType: "array",
                description: "must be an array and is required",
                items: {
                  bsonType: "objectId",
                  description: "must be an objectId"
                }
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              lastUpdated: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              lastAccessed: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('Repositories collection created successfully');
    } else {
      // Update validation for existing collection
      console.log('Updating repositories collection validation...');
      await db.command({
        collMod: 'repositories',
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["owner", "repo", "files", "linkedProjects", "createdAt", "lastUpdated", "lastAccessed"],
            properties: {
              owner: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              repo: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              files: {
                bsonType: "array",
                description: "must be an array and is required",
                items: {
                  bsonType: "object",
                  required: ["path", "content", "type"],
                  properties: {
                    path: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    content: {
                      anyOf: [
                        { bsonType: "string" },
                        { bsonType: "null" }
                      ],
                      description: "must be a string or null and is required"
                    },
                    type: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    sha: {
                      bsonType: "string",
                      description: "must be a string if present"
                    },
                    lastModified: {
                      bsonType: "date",
                      description: "must be a date if present"
                    },
                    encoding: {
                      bsonType: "string",
                      description: "must be a string if present"
                    }
                  }
                }
              },
              linkedProjects: {
                bsonType: "array",
                description: "must be an array and is required",
                items: {
                  bsonType: "objectId",
                  description: "must be an objectId"
                }
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              lastUpdated: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              lastAccessed: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('Repositories collection validation updated successfully');
    }

    // Ensure chatHistory collection exists
    if (!collectionNames.includes('chatHistory')) {
      console.log('Creating chatHistory collection...');
      await db.createCollection('chatHistory', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "id", "role", "content", "timestamp"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              id: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              role: {
                bsonType: "string",
                description: "must be a string and is required",
                enum: ["user", "assistant", "system"]
              },
              content: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              timestamp: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              context: {
                bsonType: "object",
                description: "must be an object if present",
                properties: {
                  phase: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  step: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  action: {
                    bsonType: "string",
                    description: "must be a string if present"
                  }
                }
              }
            }
          }
        }
      });
      console.log('ChatHistory collection created successfully');
    }

    // Ensure analyses collection exists
    if (!collectionNames.includes('analyses')) {
      console.log('Creating analyses collection...');
      await db.createCollection('analyses', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "stages", "repositoryStructure", "codeStructure", "createdAt", "updatedAt"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              stages: {
                bsonType: "array",
                description: "must be an array and is required",
                items: {
                  bsonType: "object",
                  required: ["name", "status", "progress"],
                  properties: {
                    name: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    status: {
                      bsonType: "string",
                      description: "must be a string and is required",
                      enum: ["pending", "in-progress", "completed", "failed"]
                    },
                    progress: {
                      bsonType: "number",
                      description: "must be a number and is required",
                      minimum: 0,
                      maximum: 100
                    }
                  }
                }
              },
              repositoryStructure: {
                bsonType: "object",
                required: ["files", "totalFiles", "languages"],
                properties: {
                  files: {
                    bsonType: "array",
                    description: "must be an array and is required",
                    items: {
                      bsonType: "object",
                      required: ["path", "type"],
                      properties: {
                        path: {
                          bsonType: "string",
                          description: "must be a string and is required"
                        },
                        type: {
                          bsonType: "string",
                          description: "must be a string and is required"
                        },
                        language: {
                          bsonType: "string",
                          description: "must be a string if present"
                        }
                      }
                    }
                  },
                  totalFiles: {
                    bsonType: "number",
                    description: "must be a number and is required"
                  },
                  languages: {
                    bsonType: "object",
                    description: "must be an object and is required"
                  }
                }
              },
              codeStructure: {
                bsonType: "object",
                required: ["fileCount", "directoryStructure", "mainLanguages", "components", "features"],
                properties: {
                  fileCount: {
                    bsonType: "number",
                    description: "must be a number and is required"
                  },
                  directoryStructure: {
                    bsonType: "array",
                    description: "must be an array and is required"
                  },
                  mainLanguages: {
                    bsonType: "object",
                    description: "must be an object and is required"
                  },
                  components: {
                    bsonType: "array",
                    description: "must be an array and is required"
                  },
                  features: {
                    bsonType: "array",
                    description: "must be an array and is required"
                  }
                }
              },
              metrics: {
                bsonType: "object",
                required: ["linesOfCode", "averageFileSize", "cyclomaticComplexity"],
                properties: {
                  linesOfCode: {
                    bsonType: "number",
                    description: "must be a number and is required"
                  },
                  averageFileSize: {
                    bsonType: "number",
                    description: "must be a number and is required"
                  },
                  cyclomaticComplexity: {
                    bsonType: "number",
                    description: "must be a number and is required"
                  }
                }
              },
              recommendations: {
                bsonType: "array",
                description: "must be an array and is required"
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              updatedAt: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('Analyses collection created successfully');
    }

    // Phase 1 of the GRIP AI Assistant Enhancement Plan

    // Step 2: Ensure projectStructures collection exists
    if (!collectionNames.includes('projectStructures')) {
      console.log('Creating projectStructures collection...');
      await db.createCollection('projectStructures', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "name", "description", "fileHierarchy", "createdAt", "updatedAt"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              name: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              description: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              fileHierarchy: {
                bsonType: "object",
                required: ["type", "name", "path"],
                properties: {
                  type: {
                    bsonType: "string",
                    description: "must be 'directory' or 'file' and is required",
                    enum: ["directory", "file"]
                  },
                  name: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  path: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  language: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  children: {
                    bsonType: "array",
                    description: "must be an array if present"
                  }
                }
              },
              dependencies: {
                bsonType: "object",
                description: "must be an object if present"
              },
              buildConfig: {
                bsonType: "object",
                properties: {
                  commands: {
                    bsonType: "object",
                    description: "must be an object if present"
                  },
                  environment: {
                    bsonType: "object",
                    description: "must be an object if present"
                  }
                }
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              updatedAt: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('ProjectStructures collection created successfully');
    }

    // Step 3: Ensure projectFiles collection exists
    if (!collectionNames.includes('projectFiles')) {
      console.log('Creating projectFiles collection...');
      await db.createCollection('projectFiles', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "path", "filename", "content", "language", "size", "version", "hash", "metadata", "createdAt", "updatedAt"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              path: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              filename: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              content: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              language: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              size: {
                bsonType: "number",
                description: "must be a number and is required"
              },
              version: {
                bsonType: "number",
                description: "must be a number and is required"
              },
              hash: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              metadata: {
                bsonType: "object",
                required: ["generatedBy", "purpose"],
                properties: {
                  generatedBy: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  purpose: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  dependencies: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  },
                  imports: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  },
                  exports: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  }
                }
              },
              history: {
                bsonType: "array",
                description: "must be an array if present",
                items: {
                  bsonType: "object",
                  required: ["version", "content", "timestamp"],
                  properties: {
                    version: {
                      bsonType: "number",
                      description: "must be a number and is required"
                    },
                    content: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    timestamp: {
                      bsonType: "date",
                      description: "must be a date and is required"
                    },
                    changes: {
                      bsonType: "string",
                      description: "must be a string if present"
                    }
                  }
                }
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              updatedAt: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('ProjectFiles collection created successfully');
    }

    // Step 4: Ensure buildLogs collection exists
    if (!collectionNames.includes('buildLogs')) {
      console.log('Creating buildLogs collection...');
      await db.createCollection('buildLogs', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "taskId", "taskType", "status", "command", "startTime", "output", "createdAt", "updatedAt"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              taskId: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              taskType: {
                bsonType: "string",
                description: "must be a string and is required",
                enum: ["build", "test", "deploy", "generate", "analyze", "other"]
              },
              status: {
                bsonType: "string",
                description: "must be a string and is required",
                enum: ["pending", "running", "completed", "failed", "cancelled"]
              },
              command: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              startTime: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              endTime: {
                bsonType: "date",
                description: "must be a date if present"
              },
              duration: {
                bsonType: "number",
                description: "must be a number if present"
              },
              output: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              exitCode: {
                bsonType: "number",
                description: "must be a number if present"
              },
              environment: {
                bsonType: "object",
                description: "must be an object if present"
              },
              metadata: {
                bsonType: "object",
                required: ["triggeredBy"],
                properties: {
                  triggeredBy: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  phase: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  step: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  files: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  },
                  dependencies: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  }
                }
              },
              error: {
                bsonType: "object",
                properties: {
                  message: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  stack: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  code: {
                    bsonType: "string",
                    description: "must be a string if present"
                  }
                }
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              updatedAt: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('BuildLogs collection created successfully');
    }

    // Step 5: Ensure terminalSessions collection exists
    if (!collectionNames.includes('terminalSessions')) {
      console.log('Creating terminalSessions collection...');
      await db.createCollection('terminalSessions', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "sessionId", "name", "status", "currentDirectory", "metadata", "lastActive", "createdAt", "updatedAt"],
            properties: {
              projectId: {
                bsonType: "objectId",
                description: "must be an objectId and is required"
              },
              sessionId: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              name: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              status: {
                bsonType: "string",
                description: "must be a string and is required",
                enum: ["active", "inactive", "error"]
              },
              currentDirectory: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              environment: {
                bsonType: "object",
                description: "must be an object if present"
              },
              history: {
                bsonType: "array",
                description: "must be an array if present",
                items: {
                  bsonType: "object",
                  required: ["command", "output", "exitCode", "timestamp", "duration"],
                  properties: {
                    command: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    output: {
                      bsonType: "string",
                      description: "must be a string and is required"
                    },
                    exitCode: {
                      bsonType: "number",
                      description: "must be a number and is required"
                    },
                    timestamp: {
                      bsonType: "date",
                      description: "must be a date and is required"
                    },
                    duration: {
                      bsonType: "number",
                      description: "must be a number and is required"
                    }
                  }
                }
              },
              metadata: {
                bsonType: "object",
                required: ["createdBy", "purpose"],
                properties: {
                  createdBy: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  purpose: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  taskIds: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  },
                  relatedFiles: {
                    bsonType: "array",
                    description: "must be an array if present",
                    items: {
                      bsonType: "string"
                    }
                  }
                }
              },
              lastActive: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              createdAt: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              updatedAt: {
                bsonType: "date",
                description: "must be a date and is required"
              }
            }
          }
        }
      });
      console.log('TerminalSessions collection created successfully');
    }

    // Ensure UserSettings collection exists
    if (!collectionNames.includes('usersettings')) {
      console.log('Creating usersettings collection with validation...');
      await db.createCollection('usersettings', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["userId"],
            properties: {
              userId: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              profile: {
                bsonType: "object",
                required: ["name", "email"],
                properties: {
                  name: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  email: {
                    bsonType: "string",
                    description: "must be a string and is required"
                  },
                  avatar: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  bio: {
                    bsonType: "string",
                    description: "must be a string if present"
                  }
                }
              },
              preferences: {
                bsonType: "object",
                properties: {
                  theme: {
                    enum: ["light", "dark", "system"],
                    description: "must be one of the allowed values"
                  },
                  language: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  timezone: {
                    bsonType: "string",
                    description: "must be a string if present"
                  },
                  dateFormat: {
                    bsonType: "string",
                    description: "must be a string if present"
                  }
                }
              },
              notifications: {
                bsonType: "object",
                properties: {
                  projectStatus: {
                    bsonType: "bool",
                    description: "must be a boolean if present"
                  },
                  timeTracking: {
                    bsonType: "bool",
                    description: "must be a boolean if present"
                  },
                  reminders: {
                    bsonType: "bool",
                    description: "must be a boolean if present"
                  },
                  emailNotifications: {
                    bsonType: "bool",
                    description: "must be a boolean if present"
                  },
                  pushNotifications: {
                    bsonType: "bool",
                    description: "must be a boolean if present"
                  },
                  notificationFrequency: {
                    enum: ["realtime", "daily", "weekly"],
                    description: "must be one of the allowed values"
                  },
                  quietHours: {
                    bsonType: "object",
                    properties: {
                      enabled: {
                        bsonType: "bool",
                        description: "must be a boolean if present"
                      },
                      start: {
                        bsonType: "string",
                        description: "must be a string if present"
                      },
                      end: {
                        bsonType: "string",
                        description: "must be a string if present"
                      }
                    }
                  }
                }
              },
              timeTracking: {
                bsonType: "object",
                properties: {
                  autoStart: {
                    bsonType: "bool",
                    description: "must be a boolean if present"
                  },
                  reminders: {
                    bsonType: "object",
                    properties: {
                      enabled: {
                        bsonType: "bool",
                        description: "must be a boolean if present"
                      },
                      interval: {
                        bsonType: "int",
                        description: "must be an integer if present"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      console.log('UserSettings collection created successfully');
    }
  } catch (error) {
    console.error('Error ensuring collections:', error);
  }
}

// Initialize mongoose connection and ensure collections only on server side
if (!isClient) {
  console.log('Initializing mongoose connection...');
  connectToDatabase()
    .then(async () => {
      console.log('Initial mongoose connection established');
      await ensureCollections();
    })
    .catch((err: Error) => console.error('Initial mongoose connection error:', err));
}

export { clientPromise, DB_NAME, isClient }
export default clientPromise

