// Script to verify if a project exists in MongoDB
require('dotenv').config({ path: './.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

// Get project ID from command line arguments
const projectId = process.argv[2];

if (!projectId) {
  console.error('Please provide a project ID as an argument');
  console.error('Usage: node scripts/check-project.js <projectId>');
  process.exit(1);
}

async function main() {
  console.log(`Checking for project with ID: ${projectId}`);
  
  // Log MongoDB connection string (masked)
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  const maskedUri = uri.replace(
    /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
    'mongodb$1://$2:****@'
  );
  console.log('Using MongoDB connection:', maskedUri);
  
  // Connect to MongoDB
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db('test');
    
    // Check if the ObjectId is valid
    let objectId;
    try {
      objectId = new ObjectId(projectId);
      console.log('Valid ObjectId format');
    } catch (err) {
      console.error('Invalid ObjectId format:', err.message);
      process.exit(1);
    }
    
    // Check if the project exists
    const project = await db.collection('projects').findOne({ _id: objectId });
    
    if (project) {
      console.log('✅ Project found:');
      console.log(JSON.stringify({
        _id: project._id.toString(),
        title: project.title,
        description: project.description?.substring(0, 50) + '...',
        userId: project.userId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }, null, 2));
    } else {
      console.log('❌ Project not found in the database');
      
      // List some projects to help debug
      console.log('Listing up to 5 projects from the database:');
      const projects = await db.collection('projects').find({}).limit(5).toArray();
      
      if (projects.length > 0) {
        projects.forEach(p => {
          console.log(`- ${p._id.toString()}: ${p.title}`);
        });
      } else {
        console.log('No projects found in the database');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

main().catch(console.error); 