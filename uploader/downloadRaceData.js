const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if serviceAccountKey.json exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: serviceAccountKey.json not found!');
    console.error('Please create serviceAccountKey.json in the same directory as this script.');
    process.exit(1);
}

const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuration options
const config = {
    collectionName: 'race-data',
    outputDir: path.join(__dirname, 'downloaded-data'),
    outputFile: 'race-data-export.json',
    prettyPrint: true
};

async function downloadCollection() {
    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }

        console.log(`Downloading collection: ${config.collectionName}...`);
        
        // Get all documents from the collection
        const snapshot = await db.collection(config.collectionName).get();
        
        if (snapshot.empty) {
            console.log('No documents found in collection.');
            return;
        }
        
        // Convert documents to array of objects
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Downloaded ${documents.length} documents.`);
        
        // Write to file
        const outputPath = path.join(config.outputDir, config.outputFile);
        const jsonData = config.prettyPrint 
            ? JSON.stringify(documents, null, 2) 
            : JSON.stringify(documents);
            
        fs.writeFileSync(outputPath, jsonData);
        
        console.log(`Data saved to: ${outputPath}`);
    } catch (error) {
        console.error('Error downloading collection:', error);
    } finally {
        // Clean up Firebase app
        admin.app().delete();
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    
    args.forEach(arg => {
        if (arg.startsWith('--output=')) {
            config.outputFile = arg.split('=')[1];
        } else if (arg.startsWith('--pretty=')) {
            config.prettyPrint = arg.split('=')[1].toLowerCase() === 'true';
        } else if (arg.startsWith('--collection=')) {
            config.collectionName = arg.split('=')[1];
        } else if (arg.startsWith('--dir=')) {
            config.outputDir = arg.split('=')[1];
        }
    });
}

// Main execution
async function main() {
    try {
        parseArgs();
        await downloadCollection();
        console.log('Download completed successfully.');
    } catch (error) {
        console.error('Error in main execution:', error);
        process.exit(1);
    }
}

// Execute the script
main();
