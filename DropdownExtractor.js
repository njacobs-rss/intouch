/**
 * =============================================================
 * FILE: DropdownExtractor.gs
 * PURPOSE: Extract data validation options from Launcher!2:2
 * =============================================================
 */

function generateDropdownKey() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Launcher");
  if (!sheet) {
    console.error("Launcher sheet not found!");
    return;
  }

  // Get the range for Row 2
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(2, 1, 1, lastCol);
  const validations = range.getDataValidations()[0]; // Row 2 validations
  const values = range.getValues()[0]; // Row 2 values
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]; // Row 1 headers (context)

  const results = [];

  for (let i = 0; i < lastCol; i++) {
    const colLetter = getColumnLetter(i + 1);
    const validation = validations[i];
    const value = values[i];
    const header = headers[i];
    
    let info = {
      column: colLetter,
      headerRow1: header,
      valueRow2: value,
      hasValidation: false,
      criteriaType: null,
      options: []
    };

    if (validation) {
      info.hasValidation = true;
      const criteriaType = validation.getCriteriaType();
      info.criteriaType = String(criteriaType);

      if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        info.options = validation.getCriteriaValues()[0];
      } else if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
        // Handle range-based validation
        const range = validation.getCriteriaValues()[0];
        if (range) {
          info.options = `Range: ${range.getA1Notation()} (Sheet: ${range.getSheet().getName()})`;
          // Optionally try to fetch values if accessible
          try {
             const rangeValues = range.getValues().flat().filter(String);
             info.options = rangeValues;
          } catch (e) {
             info.options = ["Error fetching range values: " + e.message];
          }
        }
      } else if (criteriaType === SpreadsheetApp.DataValidationCriteria.CHECKBOX) {
         info.options = ["TRUE", "FALSE"];
      } else {
        info.options = ["Custom Validation or other type: " + criteriaType];
      }
    } else {
      // No validation, just use the static value/header
      info.options = [value || "(Empty)"];
    }

    results.push(info);
  }

  // Output results to a new sheet or log
  outputResults(ss, results);
}

function outputResults(ss, results) {
  const sheetName = "Dropdown Key";
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  const headers = ["Column", "Row 1 Header", "Row 2 Value", "Has Validation", "Criteria Type", "Options/Content"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  const rows = results.map(r => [
    r.column,
    r.headerRow1,
    r.valueRow2,
    r.hasValidation,
    r.criteriaType || "N/A",
    Array.isArray(r.options) ? r.options.join(", ") : r.options
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Formatting
  sheet.autoResizeColumns(1, headers.length);
  console.log(`Dropdown key updated in sheet: ${sheetName}`);
}

function getColumnLetter(colIndex) {
  let temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}
