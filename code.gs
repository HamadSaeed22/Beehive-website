function doGet(e) {
  // Ensure 'e' is defined and safely handle the 'parameter' property
  var params = (e && e.parameter) ? e.parameter : {};

  var fileId = "10jUQT8kt75wlMDz7iFIoBWz85T35Y9Je";
  var spreadsheetId = "1B7f-ZYfZhe0j43zrzThVFGSXWE_H5gbnvj9sZYW5K50";
  var sheetName = "Beehive Data";

  try {
    // Access the file and read its content
    var file = DriveApp.getFileById(fileId);
    var fileContent = file.getBlob().getDataAsString();
    var lines = fileContent.split('\n');

    // Open the spreadsheet and get the sheet
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName(sheetName);

    // Create the sheet if it doesn't exist and add headers
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.appendRow([
        'Timestamp', 'Ambient Temp (°C)', 'DHT Temperature 1 (°C)', 'DHT Humidity 1 (%)',
        'DHT Temperature 2 (°C)', 'DHT Humidity 2 (%)', 'DS18B20 Sensor 1 (°C)',
        'DS18B20 Sensor 2 (°C)', 'DS18B20 Sensor 3 (°C)', 'DS18B20 Sensor 4 (°C)',
        'DS18B20 Sensor 5 (°C)', 'DS18B20 Sensor 6 (°C)', 'Final Average Temperature (°C)',
        'Final Average Humidity (%)', 'Relay Pump', 'Relay Fan 1', 'Relay Fan 2', 'Servo Position'
      ]);
    }

    // Collect existing timestamps to avoid duplicates
    var existingTimestamps = new Set();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      values.forEach(function(row) {
        existingTimestamps.add(row[0].toString().trim());
      });
    }

    // Process the file content and add new rows
    var seenTimestamps = new Set();
    var currentTimestamp = new Date();
    var timeIncrement = 1000; // 1 second increment per row

    lines.forEach(function(line, index) {
      var data = line.split(',');
      if (data.length > 1) { // Ignore empty lines
        var timestamp = data[0].trim();
        if (!existingTimestamps.has(timestamp) && !seenTimestamps.has(timestamp)) {
          var newTimestamp = new Date(currentTimestamp.getTime() + (index * timeIncrement));
          var formattedTimestamp = Utilities.formatDate(newTimestamp, "GMT+4", "yyyy-MM-dd HH:mm:ss");
          data.unshift(formattedTimestamp); // Prepend new timestamp
          sheet.appendRow(data); // Add row to sheet
          seenTimestamps.add(timestamp);
          existingTimestamps.add(timestamp);
        }
      } else {
        // Log malformed or empty lines for debugging
        console.warn("Skipped malformed or empty line: " + line);
      }
    });

    // Clear the file content to avoid duplicate processing
    // Note: If you want to retain the data for future reference, remove this line.
    file.setContent("");

    return ContentService.createTextOutput("Data processed successfully.");
  } catch (error) {
    // Log the error for debugging
    console.error("Error processing data: " + error.message);
    return ContentService.createTextOutput("Error: " + error.message);
  }
}
