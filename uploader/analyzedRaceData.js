const fs = require('fs');
const path = require('path');

// Configuration
const dataFilePath = path.join(__dirname, 'downloaded-data', 'race-data-export.json');
const outputFilePath = path.join(__dirname, 'race-analysis-improved-results.txt');

// Helper function to check if a time value is valid (not 0 or all 9's)
function isValidTime(time) {
    if (time === 0) return false;
    if (time === null || time === undefined) return false;
    if (/^9+$/.test(String(time))) return false;
    return true;
}

async function analyzeRaceData() {
    try {
        // Create output stream
        const outputStream = fs.createWriteStream(outputFilePath);
        
        const log = (message) => {
            console.log(message);
            outputStream.write(message + '\n');
        };
        
        log('Analyzing race data with improved validation...');
        
        // Check if file exists
        if (!fs.existsSync(dataFilePath)) {
            log(`Error: File not found at ${dataFilePath}`);
            outputStream.end();
            return;
        }
        
        // Get file size
        const stats = fs.statSync(dataFilePath);
        log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        
        // Read the file
        log('Reading race data file...');
        const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
        log(`Loaded ${data.length} race records.`);
        
        // Count unique races
        const uniqueRaceIds = new Set();
        data.forEach(race => {
            if (race.id) {
                uniqueRaceIds.add(race.id);
            }
        });
        
        // Track unique car/race combinations with valid times
        const uniqueCarRaceCombos = new Set();
        
        // Track unique drivers across all races
        const uniqueDriverGuids = new Set();
        const driversWithValidTimes = new Set();
        
        // Process each race
        data.forEach(race => {
            if (!race.id) return;
            
            // Process results
            if (race.Result && Array.isArray(race.Result)) {
                race.Result.forEach(result => {
                    // Count total unique drivers
                    if (result.DriverGuid) {
                        uniqueDriverGuids.add(result.DriverGuid);
                    }
                    
                    // Check if this car has valid lap data in the Laps array
                    const hasValidLaps = race.Laps && Array.isArray(race.Laps) && 
                        race.Laps.some(lap => 
                            lap.CarId === result.CarId && 
                            isValidTime(lap.LapTime)
                        );
                    
                    // Count cars with actual valid race times
                    if (isValidTime(result.BestLap) && 
                        isValidTime(result.TotalTime) && 
                        hasValidLaps) {
                        
                        // Add to unique car/race combinations
                        uniqueCarRaceCombos.add(`${race.id}-${result.CarId}`);
                        
                        // Add to unique drivers with valid times
                        if (result.DriverGuid) {
                            driversWithValidTimes.add(result.DriverGuid);
                        }
                    }
                });
            }
        });
        
        // Display results
        log('\n===== IMPROVED RACE DATA ANALYSIS =====');
        log(`Total races completed: ${uniqueRaceIds.size}`);
        log(`Total car entries with valid race times: ${uniqueCarRaceCombos.size}`);
        log(`Unique drivers across all races: ${uniqueDriverGuids.size}`);
        log(`Unique drivers with valid race times: ${driversWithValidTimes.size}`);
        
        // Additional analysis
        const trackCounts = {};
        const carModelCounts = {};
        const validCarModelCounts = {};
        
        // Track which car models have valid times
        const carModelsWithValidTimes = new Set();
        
        data.forEach(race => {
            // Count tracks
            const trackKey = `${race.TrackName} (${race.TrackConfig || 'default'})`;
            trackCounts[trackKey] = (trackCounts[trackKey] || 0) + 1;
            
            // Count car models
            if (race.Cars && Array.isArray(race.Cars)) {
                race.Cars.forEach(car => {
                    if (car.Model) {
                        carModelCounts[car.Model] = (carModelCounts[car.Model] || 0) + 1;
                        
                        // Check if this car has valid times in the results
                        if (race.Result && Array.isArray(race.Result)) {
                            const carResult = race.Result.find(r => r.CarId === car.CarId);
                            if (carResult && 
                                isValidTime(carResult.BestLap) && 
                                isValidTime(carResult.TotalTime)) {
                                
                                // Check if this car has valid lap data
                                const hasValidLaps = race.Laps && Array.isArray(race.Laps) && 
                                    race.Laps.some(lap => 
                                        lap.CarId === car.CarId && 
                                        isValidTime(lap.LapTime)
                                    );
                                
                                if (hasValidLaps) {
                                    carModelsWithValidTimes.add(car.Model);
                                    validCarModelCounts[car.Model] = (validCarModelCounts[car.Model] || 0) + 1;
                                }
                            }
                        }
                    }
                });
            }
        });
        
        // Show top tracks
        log('\nTop Tracks:');
        Object.entries(trackCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([track, count]) => {
                log(`- ${track}: ${count} races`);
            });
        
        // Show top car models
        log('\nTop Car Models (All Entries):');
        Object.entries(carModelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([model, count]) => {
                log(`- ${model}: ${count} entries`);
            });
        
        // Show car models with valid times
        log('\nCar Models with Valid Race Times:');
        Object.entries(validCarModelCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([model, count]) => {
                log(`- ${model}: ${count} valid entries`);
            });
        
        // Sample of valid car/race combinations
        log('\nSample of Valid Car/Race Combinations (up to 5):');
        let count = 0;
        for (const combo of uniqueCarRaceCombos) {
            if (count >= 5) break;
            log(`- ${combo}`);
            count++;
        }
        
        log('\nAnalysis complete. Results saved to ' + outputFilePath);
        outputStream.end();
        
    } catch (error) {
        console.error('Error analyzing race data:', error);
        fs.writeFileSync(outputFilePath, 'Error analyzing race data: ' + error.message);
    }
}

// Run the analysis
analyzeRaceData();
