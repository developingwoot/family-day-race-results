# Family Day Race Results Downloader

This repository contains scripts for working with race data in Firebase Firestore.

## Scripts

### 1. watchAndUpload.js

Watches a directory for new JSON files and uploads them to the Firebase Firestore 'race-data' collection.

### 2. downloadRaceData.js

Downloads the entire 'race-data' collection from Firebase Firestore and saves it as a JSON file.

### 3. analyzeRaceData.js

Analyzes the downloaded race data to provide statistics such as:
- Total races completed
- Total car entries with valid race times
- Unique drivers across all races
- Unique drivers with valid race times
- Top tracks and car models used

## Setup

1. Ensure you have Node.js installed
2. Make sure the `serviceAccountKey.json` file is in the root directory
3. Install dependencies:
   ```
   npm install
   ```

## Usage

### Downloading Race Data

Run the script with default settings:

```
node downloadRaceData.js
```

This will:
- Download all documents from the 'race-data' collection
- Save them to `./downloaded-data/race-data-export.json`
- Format the JSON with pretty-printing

#### Command Line Options

You can customize the behavior with these options:

- `--output=filename.json` - Specify the output filename
- `--pretty=true|false` - Enable/disable pretty-printing (default: true)
- `--collection=collection-name` - Specify a different collection (default: race-data)
- `--dir=directory-path` - Specify the output directory (default: ./downloaded-data)

Example:

```
node downloadRaceData.js --output=my-data.json --pretty=false --dir=./exports
```

### Analyzing Race Data

After downloading the race data, you can analyze it by running:

```
node analyzeRaceData.js
```

This will:
- Read the downloaded race data file
- Analyze the data to extract statistics
- Save the analysis results to `race-analysis-improved-results.txt`
- Display the results in the console

The analysis properly excludes invalid race times (times of 0 or times consisting only of 9's) and ensures accurate counting of cars that posted valid race times.

## Output Format

The downloaded race data file contains an array of objects, where each object represents a race event with the following structure:

```json
{
  "id": "unique-race-id",
  "TrackName": "track-name",
  "TrackConfig": "track-configuration",
  "Type": "RACE",
  "DurationSecs": 0,
  "RaceLaps": 2,
  "Cars": [
    {
      "CarId": 0,
      "Driver": {
        "Name": "Driver Name",
        "Team": "",
        "Nation": "PLA",
        "Guid": "driver-guid",
        "GuidsList": ["driver-guid"]
      },
      "Model": "car-model",
      "Skin": "car-skin",
      "BallastKG": 0,
      "Restrictor": 0
    },
    // More cars...
  ],
  "Result": [
    {
      "DriverName": "Driver Name",
      "DriverGuid": "driver-guid",
      "CarId": 0,
      "CarModel": "car-model",
      "BestLap": 68147,
      "TotalTime": 138649,
      "BallastKG": 0,
      "Restrictor": 0
    },
    // More results...
  ],
  "Laps": [
    {
      "DriverName": "Driver Name",
      "DriverGuid": "driver-guid",
      "CarId": 0,
      "CarModel": "car-model",
      "Timestamp": 253002833,
      "LapTime": 70500,
      "Sectors": [43864, 26636],
      "Cuts": 0,
      "BallastKG": 0,
      "Tyre": "SM",
      "Restrictor": 0
    },
    // More laps...
  ],
  "Events": null,
  "sourceFile": "race-file-name.json",
  "uploadedAt": {
    "_seconds": 1745598028,
    "_nanoseconds": 519000000
  }
}
