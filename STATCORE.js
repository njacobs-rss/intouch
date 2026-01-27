/**
 * ==========================================
 * PROJECT: STATCORE DATA PIPELINE (FULL PRODUCTION)
 * ==========================================
 * FLOW:
 * 1. updateSTATCORE()      -> Fetches base records, filters, populates A-AG. Triggers step 2.
 * 2. runSYSCOREUpdates()   -> Fetches SYSCORE, aligns to ID, populates AH-AT. Triggers step 3.
 * 3. runDAGCOREUpdates()   -> Fetches data from DAGCORE, filters, populates DISTRO sheet.
 * 4. ensureSTATCORE_Formulas -> Repairs ArrayFormulas in Cols AU-AW.
 */

// === STEP 1: UPDATE BASE DATA (STATCORE) ===
// @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
// @param {boolean} skipChain - If true, does NOT chain to SYSCORE/formulas (for fleet ops)
function updateSTATCORE(targetSS, skipChain) {
  const startTime = new Date();
  const functionName = "updateSTATCORE";
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);

  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  const ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = 'Statcore'; 

  try {
    const targetSheet = ss.getSheetByName('STATCORE');
    if (!targetSheet) throw new Error("Sheet 'STATCORE' not found.");

    // Connect to Source Data
    const dataSheetId = '1Qa3S3USt-TOdVctormnunF4P8L010C3pSCx9zl5aTtM';
    const dataSS = SpreadsheetApp.openById(dataSheetId);
    const dataSheet = dataSS.getSheetByName(sourceSheetName);
    if (!dataSheet) {
      // DEBUG: Log available sheets to help diagnose
      const availableSheets = dataSS.getSheets().map(s => s.getName());
      Logger.log(`[${functionName}] DEBUG: Available sheets in source: ${JSON.stringify(availableSheets)}`);
      throw new Error(`Source sheet '${sourceSheetName}' not found. Available: ${availableSheets.join(', ')}`);
    }

    // OPTIMIZATION: Scan Source A:A to determine actual data depth
    const sourceLastRow = getTrueLastRow_(dataSheet, 'A');
    if (sourceLastRow < 2) throw new Error("Source data is empty.");

    Logger.log(`[${functionName}] Source Data Depth: ${sourceLastRow} rows.`);

    // CRITICAL FIX: Read Data then Flush Buffer
    const data = dataSheet.getRange(1, 1, sourceLastRow, 33).getValues(); // A1:AG
    SpreadsheetApp.flush(); 

    const nameList = ss.getSheetByName('SETUP').getRange('B3:B16').getValues().flat();

    // Filter Logic
    const header = data[0];
    const filteredData = data.filter((row, index) => {
      if (index === 0) return false; // skip header
      return row[13] && nameList.includes(row[13]);
    });

    // Write Headers
    targetSheet.getRange('A2:AG2').setValues([header]);

    // Clear Old Content (Cleanly)
    Logger.log(`[${functionName}] Clearing 'STATCORE!A3:AG'.`);
    const targetLastRow = Math.max(targetSheet.getLastRow(), 3);
    targetSheet.getRange(3, 1, targetLastRow, 33).clearContent(); 

    // === BATCHED DATA INSERTION (OPTIMIZED) ===
    if (filteredData.length > 0) {
      Logger.log(`[${functionName}] Found ${filteredData.length} records. Starting batch insert...`);
      
      const batchSize = 4000; 
      
      for (let i = 0; i < filteredData.length; i += batchSize) {
        const batch = filteredData.slice(i, i + batchSize);
        const startRow = 3 + i;
        
        targetSheet.getRange(startRow, 1, batch.length, batch[0].length).setValues(batch);
        SpreadsheetApp.flush(); // Critical for 30k rows
      }
      recordsAdded = filteredData.length;
      Logger.log("Batch insert complete.");
    } else {
      Logger.log("No data matched the criteria.");
    }

  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }

  const duration = (new Date() - startTime) / 1000;
  
  // Log Results to central sheet
  try {
    logRefreshToCentral('STATCORE', recordsAdded, duration, result, errorMessage);

    if (result === "Success" && skipChain !== true) {
      Utilities.sleep(1000); // Breathe
      runSYSCOREUpdates(false, ss);
      ensureSTATCORE_Formulas(ss);
    }
  } catch (logError) {
    Logger.log("Logging error: " + logError.message);
  }
  
  return { result: result, records: recordsAdded, error: errorMessage };
}

// === STEP 2: UPDATE SUPPLEMENTAL DATA (SYSCORE) ===
// @param {boolean} skipDagcore - If true, does NOT chain to runDAGCOREUpdates()
// @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
function runSYSCOREUpdates(skipDagcore, targetSS) {
  const startTime = new Date();
  const functionName = "runSYSCOREUpdates";
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);

  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  const ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();

  try {
    const sourceSpreadsheet = SpreadsheetApp.openById('1V4C9mIL4ISP4rx2tJcpPhflM-RIi4eft_xDZWAgWmGU');
    const sourceSheet = sourceSpreadsheet.getSheetByName('SEND');
    if (!sourceSheet) throw new Error("Source sheet 'SEND' not found in SYSCORE Spreadsheet");

    const currentSheet = ss.getSheetByName('STATCORE');
    if (!currentSheet) throw new Error("STATCORE sheet not found");

    // 1. READ SOURCE DATA (OPTIMIZED SCAN)
    const sourceLastRow = getTrueLastRow_(sourceSheet, 'A');
    if (sourceLastRow < 1) throw new Error("SYSCORE Source is empty");

    Logger.log(`[${functionName}] Scanning Source: Found ${sourceLastRow} rows.`);

    // Read IDs (Col A)
    const sourceIds = sourceSheet.getRange(1, 1, sourceLastRow, 1).getValues().flat();
    
    // Read Data (Cols B:N)
    const sourceDataRange = sourceSheet.getRange(1, 2, sourceLastRow, 13);
    const sourceValues = sourceDataRange.getValues();
    const sourceRichTexts = sourceDataRange.getRichTextValues();
    // OPTIMIZATION: Removed unnecessary flush here

    const sourceMap = new Map();

    sourceIds.forEach((id, i) => {
      if (id) {
        // Process row immediately to handle hyperlinks
        const processedRow = sourceValues[i].map((cellValue, j) => {
          const richText = sourceRichTexts[i][j];
          const linkUrl = richText ? richText.getLinkUrl() : null;
          return linkUrl ? `=HYPERLINK("${linkUrl}", "${cellValue}")` : cellValue;
        });
        sourceMap.set(String(id), processedRow);
      }
    });

    // 2. IDENTIFY TARGET ROWS
    const targetLastRow = getTrueLastRow_(currentSheet, 'A');
    if (targetLastRow < 3) return; // Exit if no data in STATCORE

    const targetIds = currentSheet.getRange(3, 1, targetLastRow - 2, 1).getValues().flat();
    
    // 3. BUILD OUTPUT ARRAY
    let matchCount = 0;
    const alignedData = targetIds.map(targetId => {
      const lookupId = String(targetId);
      if (sourceMap.has(lookupId)) {
        matchCount++; // Correct counting logic
        return sourceMap.get(lookupId);
      } else {
        return new Array(13).fill("");
      }
    });

    recordsAdded = matchCount;

    // 4. WRITE HEADERS
    const syscoreHeader = sourceSheet.getRange('B1:N1').getValues();
    currentSheet.getRange('AH2:AT2').setValues(syscoreHeader);

    // 5. WRITE DATA
    const colIndexStart = 34; // AH
    const colIndexEnd = 46;   // AT
    const numCols = 13;       // AH to AT is 13 columns

    // Clear Content Only in AH:AT for the active area
    const clearRowDepth = Math.max(targetLastRow, currentSheet.getLastRow());
    if (clearRowDepth >= 3) {
      currentSheet.getRange(3, colIndexStart, clearRowDepth - 2, numCols).clearContent();
    }

    if (alignedData.length > 0) {
      // Batch Write to prevent timeouts
      const batchSize = 3000;
      for (let i = 0; i < alignedData.length; i += batchSize) {
        const batch = alignedData.slice(i, i + batchSize);
        currentSheet.getRange(3 + i, colIndexStart, batch.length, numCols).setValues(batch);
        SpreadsheetApp.flush();
      }
    }
    
    Logger.log("SYSCORE Data aligned and written. Rows matched: " + recordsAdded);

  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }

  const duration = (new Date() - startTime) / 1000;
  Logger.log(`[${functionName}] Duration: ${duration}s`);

  // Log to central sheet
  logRefreshToCentral('SYSCORE', recordsAdded, duration, result, errorMessage);

  // Continue pipeline (unless skipDagcore is true)
  if (skipDagcore !== true) {
    runDAGCOREUpdates(ss);
  }
  
  return { result: result, records: recordsAdded, error: errorMessage };
}

// === STEP 3: UPDATE DISTRO (DAGCORE) ===
// @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
function runDAGCOREUpdates(targetSS) {
  const startTime = new Date();
  const functionName = "runDAGCOREUpdates";
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);

  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  const ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'SEND';
  const batchSize = 4000; // Optimized for 30k rows

  try {
    const sourceSpreadsheet = SpreadsheetApp.openById('1Rp42PivUzqnm3VzV15g_R9KcairXX9dWGOfIjeotzTQ');
    const sourceSheet = sourceSpreadsheet.getSheetByName(sheetName);
    if (!sourceSheet) throw new Error("Source sheet 'SEND' not found in DAGCORE Spreadsheet");

    const statCoreSheet = ss.getSheetByName('STATCORE');
    // Optimization: Scan A:A only
    const statLastRow = getTrueLastRow_(statCoreSheet, 'A');
    let statCoreValuesSet = new Set();
    if (statLastRow >= 3) {
       statCoreValuesSet = new Set(statCoreSheet.getRange(3, 1, statLastRow - 2, 1).getValues().flat());
    }

    let dataToWrite = [];
    const sourceLastRow = getTrueLastRow_(sourceSheet, 'A'); // Scan Source A:A

    // Copy headers
    const headerRow = sourceSheet.getRange('A2:BB2').getValues();
    const distroSheet = ss.getSheetByName('DISTRO');
    distroSheet.getRange('A1:BB1').setValues(headerRow);

    // Batch Process
    for (let startBatchRow = 3; startBatchRow <= sourceLastRow; startBatchRow += batchSize) {
      const endRow = Math.min(sourceLastRow, startBatchRow + batchSize - 1);
      
      const numRows = endRow - startBatchRow + 1;
      if (numRows < 1) continue;

      const batchData = sourceSheet.getRange(startBatchRow, 1, numRows, 54).getValues(); // A to BB
      batchData.forEach((row) => {
        if (row[0] && statCoreValuesSet.has(row[0])) dataToWrite.push(row);
      });
      // OPTIMIZATION: Removed flush from read loop to improve speed
    }

    recordsAdded = dataToWrite.length;

    const distroLastRow = Math.max(distroSheet.getLastRow(), 2);
    distroSheet.getRange(2, 1, distroLastRow, 54).clearContent(); // Clear safely

    if (dataToWrite.length > 0) {
      // OPTIMIZATION: Batch Write
      Logger.log(`[${functionName}] Writing ${dataToWrite.length} rows to DISTRO in batches...`);
      for (let i = 0; i < dataToWrite.length; i += batchSize) {
        const batch = dataToWrite.slice(i, i + batchSize);
        distroSheet.getRange(2 + i, 1, batch.length, 54).setValues(batch);
        SpreadsheetApp.flush(); // Flush only during writes
      }
    }

  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }

  const duration = (new Date() - startTime) / 1000;
  Logger.log(`[${functionName}] Duration: ${duration}s`);

  // Log to central sheet
  logRefreshToCentral('DAGCORE', recordsAdded, duration, result, errorMessage);
  
  // REMOVED: Duplicate trigger for updateAccountNotes();
  
  return { result: result, records: recordsAdded, error: errorMessage };
}

// === HELPER: FORMULA REPAIR ===
// @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
function ensureSTATCORE_Formulas(targetSS) {
  const startTime = new Date();
  Logger.log("Starting ensureSTATCORE_Formulas at " + startTime.toLocaleTimeString());

  let result = "Success";
  let errorMessage = "";
  let recordsAdded = 1; 

  const ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();

  try {
    const sh = ss.getSheetByName('STATCORE');
    if (!sh) throw new Error('STATCORE sheet not found');

    const lastRow = Math.max(3, sh.getLastRow());

    // Clear potential spill blockers
    if (lastRow > 3) {
      sh.getRange(4, 47, lastRow - 3, 1).clearContent(); // AU
      sh.getRange(4, 48, lastRow - 3, 1).clearContent(); // AV
      sh.getRange(4, 49, lastRow - 3, 1).clearContent(); // AW
    }

    // --- AU: "Last Updated" lookup by RID ---
    const expectedAU =
      `=ARRAYFORMULA(` +
      `IF(LEN(A3:A)=0,"",` +
        `IFNA(` +
          `VLOOKUP(` +
            `TO_TEXT(A3:A),` +
            `{TO_TEXT(Focus20!$B$2:$B), INDEX(Focus20!$A$2:$G,, MATCH("Last Updated", Focus20!$A$1:$G$1,0))},` +
            `2, FALSE` +
          `)` +
        `)` +
      `))`;

    // --- AV: Standard ArrayFormula HYPERLINK ---
    const expectedAV =
      `=ARRAYFORMULA(` +
      `IF(A3:A="","",` +
      `HYPERLINK(` +
      `"https://bce906ff.us1a.app.preset.io/superset/dashboard/170/?native_filters=(NATIVE_FILTER-nUKTxUs5F:(__cache:(label:'"&G3:G&"',validateStatus:!f,value:!('"&G3:G&"')),extraFormData:(filters:!((col:Metro,op:IN,val:!('"&G3:G&"')))),filterState:(label:'"&G3:G&"',validateStatus:!f,value:!('"&G3:G&"')),id:NATIVE_FILTER-nUKTxUs5F,ownState:()),NATIVE_FILTER-v3LU2jFGU:(__cache:(label:'"&A3:A&"',validateStatus:!f,value:!('"&A3:A&"')),extraFormData:(filters:!((col:RID,op:IN,val:!('"&A3:A&"')))),filterState:(label:'"&A3:A&"',validateStatus:!f,value:!('"&A3:A&"')),id:NATIVE_FILTER-v3LU2jFGU,ownState:()))",` +
      `A3:A)))`;

    // --- AW: New Dashboard 2083 Link ---
    const expectedAW = 
      `=ARRAYFORMULA(` + 
      `IF(A3:A="","",` +
      `HYPERLINK(` +
      `"https://bce906ff.us1a.app.preset.io/superset/dashboard/2083/?native_filters=(NATIVE_FILTER-R_YADZzAirYaVfywCNnZO:(__cache:(label:'"&A3:A&"',validateStatus:!f,value:!('"&A3:A&"')),extraFormData:(filters:!((col:rid,op:IN,val:!('"&A3:A&"')))),filterState:(label:'"&A3:A&"',validateStatus:!f,value:!('"&A3:A&"')),id:NATIVE_FILTER-R_YADZzAirYaVfywCNnZO,ownState:()))"` +
      `,A3:A)))`;

    // Apply Formulas
    const auCell = sh.getRange('AU3');
    const avCell = sh.getRange('AV3');
    const awCell = sh.getRange('AW3');

    const currentAU = auCell.getFormula();
    const currentAV = avCell.getFormula();
    const currentAW = awCell.getFormula();

    if (!currentAU || normalizeFormula(currentAU) !== normalizeFormula(expectedAU)) {
      auCell.setFormula(expectedAU);
    }
    if (!currentAV || normalizeFormula(currentAV) !== normalizeFormula(expectedAV)) {
      avCell.setFormula(expectedAV);
    }
    if (!currentAW || normalizeFormula(currentAW) !== normalizeFormula(expectedAW)) {
      awCell.setFormula(expectedAW);
    }

  } catch (error) {
    errorMessage = error.message;
    Logger.log("An error occurred in ensureSTATCORE_Formulas: " + errorMessage);
    result = "Fail";
    recordsAdded = 0;
  }

  // Log Results to central sheet
  const duration = (new Date() - startTime) / 1000;
  try {
    logRefreshToCentral('STATCORE_FORMULAS', recordsAdded, duration, result, errorMessage);
  } catch (logError) {
    Logger.log("Logging error in ensureSTATCORE_Formulas: " + logError.message);
  }
}

// === UTILITIES ===

function normalizeFormula(f) {
  return (f || '').replace(/\s+/g, ' ').trim();
}

/**
 * OPTIMIZED A:A SCAN
 * Finds the last row with data in the specified column.
 * Much faster than getDataRange() on large sheets with empty formatted rows.
 * @param {Sheet} sheet - The sheet to scan
 * @param {String} columnA1 - Column letter (default "A")
 */
function getTrueLastRow_(sheet, columnA1 = "A") {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return 0;
  
  // Read just the single column to memory
  const data = sheet.getRange(`${columnA1}1:${columnA1}${lastRow}`).getValues();
  
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== "" && data[i][0] != null) {
      return i + 1; // +1 because array index is 0-based
    }
  }
  return 0;
}