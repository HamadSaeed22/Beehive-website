function doPost(e) {
  const sheet = SpreadsheetApp.openById("1B7f-ZYfZhe0j43zrzThVFGSXWE_H5gbnvj9sZYW5K50").getSheetByName("Beehive Data");

  const timeSlot = e.parameter.timeSlot;
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Get headers and remove them from data

  let filteredData = data.map(row => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index];
    });
    return entry;
  });

  // Convert filtered data to tab-separated CSV format
  const csvData = [headers.join("\t")].concat(
    filteredData.map(row => headers.map(header => row[header] || "").join("\t"))
  ).join("\n");

  return ContentService
    .createTextOutput(csvData)
    .setMimeType(ContentService.MimeType.TEXT);
}
