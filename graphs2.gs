function dopost(e) {
  const spreadsheetId = "1B7f-ZYfZhe0j43zrzThVFGSXWE_H5gbnvj9sZYW5K50";
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("Beehive Data");

  if (!sheet) {
    throw new Error("Sheet 'Beehive Data' not found. Please ensure the sheet exists.");
  }

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();
  const headers = data.shift(); // Remove headers from data
  const startTime = e.parameter.startTime ? new Date(e.parameter.startTime) : null;

  Logger.log("Received startTime: " + startTime); // Debugging log

  // Ensure timestamps are valid and filter based on startTime
  const filteredData = data.filter(row => {
    const rowTime = new Date(row[0]); // Assuming the timestamp is in the first column
    return startTime && !isNaN(rowTime) ? rowTime >= startTime : true; // Filter rows based on startTime
  });

  Logger.log("Filtered Data: " + JSON.stringify(filteredData)); // Debugging log

  // Format the filtered data
  const formattedData = filteredData.map(row => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index];
    });
    return entry;
  });

  return ContentService.createTextOutput(JSON.stringify(formattedData)).setMimeType(ContentService.MimeType.JSON);
}
