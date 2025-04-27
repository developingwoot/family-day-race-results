const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

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

// Configuration
const config = {
    watchFolder: path.join(__dirname, '..', 'results'),
    collectionName: 'race-data', // Specify your collection name here
    deleteAfterUpload: true,
    maxRetries: 3,
    retryDelay: 1000 // 1 second
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Safely read file with retries
async function safeReadFile(filePath, retries = config.maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Retry ${i + 1}/${retries} reading file...`);
            await wait(config.retryDelay);
        }
    }
}

// Safely delete file with retries
async function safeDeleteFile(filePath, retries = config.maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                console.log(`Deleted file: ${filePath}`);
                return true;
            }
            return false;
        } catch (error) {
            if (i === retries - 1) {
                console.error(`Failed to delete file after ${retries} attempts:`, error);
                return false;
            }
            console.log(`Retry ${i + 1}/${retries} deleting file...`);
            await wait(config.retryDelay);
        }
    }
}

// Check if watch directory exists
function ensureDirectoriesExist() {
    console.log('Checking directories...');
    if (!fs.existsSync(config.watchFolder)) {
        console.error(`Error: Watch directory does not exist: ${config.watchFolder}`);
        console.error('Please create the directory manually before running this script.');
        process.exit(1);
    }
}

// Process JSON file
async function processFile(filePath) {
    try {
        console.log(`Starting to process file: ${filePath}`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log(`File no longer exists: ${filePath}`);
            return false;
        }

        // Wait a moment before trying to read the file
        await wait(1000);

        // Read and parse the file
        const fileContent = await safeReadFile(filePath);
        console.log('File content:', fileContent);
        
        let documents;
        try {
            documents = JSON.parse(fileContent);
            if (!Array.isArray(documents)) {
                documents = [documents]; // If it's a single object, convert to array
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            return false;
        }

        console.log(`Uploading ${documents.length} documents to collection: ${config.collectionName}`);

        // Upload documents in batches
        const batchSize = 500;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = db.batch();
            const chunk = documents.slice(i, i + batchSize);

            chunk.forEach((doc) => {
                const docRef = db.collection(config.collectionName).doc();
                const docWithTimestamp = {
                    ...doc,
                    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
                    sourceFile: path.basename(filePath)
                };
                batch.set(docRef, docWithTimestamp);
            });

            await batch.commit();
            console.log(`Uploaded ${i + chunk.length} documents to ${config.collectionName}`);
        }

        // Wait a moment before trying to delete the file
        await wait(1000);

        // Delete the file after successful upload if configured to do so
        if (config.deleteAfterUpload) {
            await safeDeleteFile(filePath);
        }

        return true;
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return false;
    }
}

// Initialize file watcher
function initializeWatcher() {
    console.log(`Starting to watch folder: ${config.watchFolder}`);
    console.log('Waiting for JSON files...');

    const watcher = chokidar.watch(config.watchFolder, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
        usePolling: true, // Add polling for Windows
        interval: 1000 // Check every second
    });

    watcher
        .on('ready', () => {
            console.log('Initial scan complete. Ready for changes...');
        })
        .on('add', async (filePath) => {
            if (path.extname(filePath).toLowerCase() === '.json') {
                console.log(`New JSON file detected: ${filePath}`);
                // Wait a moment before processing
                await wait(1000);
                await processFile(filePath);
            } else {
                console.log(`Ignoring non-JSON file: ${filePath}`);
            }
        })
        .on('error', error => console.error(`Watcher error: ${error}`));
}

// Start the application
function start() {
    try {
        console.log('Starting application...');
        ensureDirectoriesExist();
        
        // Process any existing files
        console.log('Checking for existing files...');
        const files = fs.readdirSync(config.watchFolder);
        if (files.length > 0) {
            console.log('Found existing files:', files);
            files.forEach(async (file) => {
                if (path.extname(file).toLowerCase() === '.json') {
                    const filePath = path.join(config.watchFolder, file);
                    await processFile(filePath);
                }
            });
        } else {
            console.log('No existing files found.');
        }

        // Start the watcher
        initializeWatcher();
        
    } catch (error) {
        console.error('Error starting the application:', error);
        process.exit(1);
    }
}

// Handle application shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    admin.app().delete();
    process.exit(0);
});

// Start the application
console.log('Initializing...');
start();
