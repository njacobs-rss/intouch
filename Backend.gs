/**
 * =============================================================
 * FILE: Backend.gs
 * PURPOSE: Core Logic for InFocus (Filter & Restore)
 * =============================================================
 */

/**
 * syncFilteredAccounts() - The Filter Action
 * 
 * Goal: Apply the AI filter and paste static values to Active Sheet
 * 
 * Steps:
 * 1. Get Manager Name from Active Sheet Cell B2
 * 2. Read STATCORE and filter rows where:
 *    - Col BE (Helper) is TRUE AND
 *    - (Col N == Manager OR Col AU == Manager)
 * 3. Preserve Notes from Active Sheet C3:C
 * 4. Clear Active Sheet C3:C and paste Filtered RIDs
 * 5. Re-apply Notes to matching RIDs
 * 
 * @returns {Object} { success: boolean, count: number, message: string }
 */
function syncFilteredAccounts() {
  const startTime = new Date();
  const functionName = 'syncFilteredAccounts';
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);
  
  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  
  try {
    // --- STEP 1: CONTEXT ---
    const managerName = activeSheet.getRange(INFOCUS_CONFIG.TARGET.managerCell).getValue();
    if (!managerName || String(managerName).trim() === "") {
      throw new Error("Manager name not found in cell " + INFOCUS_CONFIG.TARGET.managerCell);
    }
    Logger.log(`[${functionName}] Manager: ${managerName}`);
    
    // --- STEP 2: READ STATCORE ---
    const statcoreSheet = ss.getSheetByName(INFOCUS_CONFIG.MASTER_DATA.sheetName);
    if (!statcoreSheet) {
      throw new Error("Sheet '" + INFOCUS_CONFIG.MASTER_DATA.sheetName + "' not found.");
    }
    
    const statcoreLastRow = getTrueLastRow_(statcoreSheet, 'A');
    if (statcoreLastRow <= INFOCUS_CONFIG.MASTER_DATA.headerRow) {
      throw new Error("STATCORE has no data.");
    }
    
    // Read headers to find column indices
    const headers = statcoreSheet.getRange(INFOCUS_CONFIG.MASTER_DATA.headerRow, 1, 1, statcoreSheet.getLastColumn()).getValues()[0];
    const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Find column indices
    const ridIdx = 0; // Col A (Index 0)
    
    // Helper Column (BE)
    const helperColLetter = INFOCUS_CONFIG.MASTER_DATA.helperCol;
    const helperColIdx = letterToColumn_(helperColLetter) - 1; 
    
    // Manager Columns (N and AU)
    const amCol1Idx = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol1) - 1;
    const amCol2Idx = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol2) - 1;
    
    Logger.log(`[${functionName}] Column indices - RID: ${ridIdx}, Helper: ${helperColIdx}, AM1: ${amCol1Idx}, AM2: ${amCol2Idx}`);
    
    // Read all data (optimize by reading necessary columns only if sheet is wide)
    // We need up to the max column index involved
    const maxColIdx = Math.max(helperColIdx, amCol1Idx, amCol2Idx);
    const dataRowCount = statcoreLastRow - INFOCUS_CONFIG.MASTER_DATA.headerRow;
    
    // Read from Row 3 (Header + 1)
    const allData = statcoreSheet.getRange(INFOCUS_CONFIG.MASTER_DATA.headerRow + 1, 1, dataRowCount, maxColIdx + 1).getValues();
    
    // Filter rows where Helper = TRUE AND (AM1 or AM2 matches)
    const normalizedManager = normalize(managerName);
    const filteredRids = [];
    
    allData.forEach(row => {
      const helperVal = row[helperColIdx];
      const am1Val = normalize(String(row[amCol1Idx] || ""));
      const am2Val = normalize(String(row[amCol2Idx] || ""));
      
      // Check if helper column is TRUE (boolean or string)
      const isHelperTrue = (helperVal === true || String(helperVal).toUpperCase() === 'TRUE');
      const isManagerMatch = (am1Val === normalizedManager || am2Val === normalizedManager);
      
      if (isHelperTrue && isManagerMatch) {
        filteredRids.push(String(row[ridIdx]));
      }
    });
    
    Logger.log(`[${functionName}] Filtered RIDs count: ${filteredRids.length}`);
    
    if (filteredRids.length === 0) {
      return { 
        success: false, 
        count: 0, 
        message: "No accounts matched the filter criteria. Check that Col BE has TRUE values for matching accounts." 
      };
    }
    
    // --- STEP 3: PRESERVE NOTES ---
    const targetColLetter = INFOCUS_CONFIG.TARGET.dataCol;
    const targetStartRow = 3; // C3
    const activeLastRow = Math.max(activeSheet.getLastRow(), targetStartRow);
    const targetRowCount = activeLastRow - targetStartRow + 1;
    
    // Read existing RIDs and Notes
    const existingDataRange = activeSheet.getRange(targetStartRow, 3, targetRowCount, 1); // Col C
    const existingRids = existingDataRange.getValues().flat().map(String);
    const existingNotes = existingDataRange.getNotes().flat();
    
    // Build Note Map: RID -> Note
    const noteMap = new Map();
    existingRids.forEach((rid, i) => {
      if (rid && existingNotes[i]) {
        noteMap.set(rid, existingNotes[i]);
      }
    });
    Logger.log(`[${functionName}] Preserved ${noteMap.size} notes.`);
    
    // --- STEP 4: CLEAR AND WRITE ---
    // Clear existing values and notes
    if (targetRowCount > 0) {
      activeSheet.getRange(targetStartRow, 3, targetRowCount, 1).clearContent().clearNote();
    }
    SpreadsheetApp.flush();
    
    // Prepare data to write
    const ridOutput = filteredRids.map(rid => [rid]);
    
    // Write filtered RIDs
    // Use batching if list is huge (though unlikely for a filtered view)
    if (ridOutput.length > 0) {
      const batchSize = 4000;
      for (let i = 0; i < ridOutput.length; i += batchSize) {
        const batch = ridOutput.slice(i, i + batchSize);
        activeSheet.getRange(targetStartRow + i, 3, batch.length, 1).setValues(batch);
        SpreadsheetApp.flush();
      }
    }
    
    // --- STEP 5: RE-APPLY NOTES ---
    const noteOutput = filteredRids.map(rid => {
      return noteMap.has(rid) ? noteMap.get(rid) : "";
    });
    
    // Set notes as 2D array
    const noteArray = noteOutput.map(n => [n]);
    if (noteArray.length > 0) {
      const batchSize = 4000;
      for (let i = 0; i < noteArray.length; i += batchSize) {
        const batch = noteArray.slice(i, i + batchSize);
        activeSheet.getRange(targetStartRow + i, 3, batch.length, 1).setNotes(batch);
        SpreadsheetApp.flush();
      }
    }
    
    recordsAdded = filteredRids.length;
    Logger.log(`[${functionName}] Successfully synced ${recordsAdded} accounts.`);
    
  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }
  
  // Log to Refresh sheet
  const duration = (new Date() - startTime) / 1000;
  try {
    const refreshSheet = ss.getSheetByName('Refresh');
    if (refreshSheet) {
      refreshSheet.appendRow([functionName, new Date(), recordsAdded, duration, result, errorMessage]);
    }
  } catch (logError) {
    Logger.log(`[${functionName}] Logging error: ${logError.message}`);
  }
  
  return {
    success: result === "Success",
    count: recordsAdded,
    message: result === "Success" 
      ? `Filter applied. Showing ${recordsAdded} accounts.`
      : `Filter failed: ${errorMessage}`
  };
}

/**
 * resetToDefault() - The Restore Action
 * 
 * Goal: Restore the original formulas and sort order from RID DISTRO
 * 
 * Steps:
 * 1. Get Manager Name from Active Sheet Cell B2
 * 2. Find Manager's column in RID DISTRO (Row 1 headers)
 * 3. Read the default sorted RIDs from that column
 * 4. Preserve Notes from Active Sheet C3:C
 * 5. Rebuild formulas and set them (or paste the sorted RIDs)
 * 6. Re-apply Notes to matching RIDs
 * 
 * @returns {Object} { success: boolean, count: number, message: string }
 */
function resetToDefault() {
  const startTime = new Date();
  const functionName = 'resetToDefault';
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);
  
  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  
  try {
    // --- STEP 1: CONTEXT ---
    const managerName = activeSheet.getRange(INFOCUS_CONFIG.TARGET.managerCell).getValue();
    if (!managerName || String(managerName).trim() === "") {
      throw new Error("Manager name not found in cell " + INFOCUS_CONFIG.TARGET.managerCell);
    }
    Logger.log(`[${functionName}] Manager: ${managerName}`);
    
    // --- STEP 2: FIND SOURCE COLUMN ---
    const distroSheet = ss.getSheetByName(INFOCUS_CONFIG.SORT_SOURCE.sheetName);
    if (!distroSheet) {
      throw new Error("Sheet '" + INFOCUS_CONFIG.SORT_SOURCE.sheetName + "' not found.");
    }
    
    const distroLastCol = distroSheet.getLastColumn();
    const distroHeaders = distroSheet.getRange(1, 1, 1, distroLastCol).getValues()[0];
    
    // Find manager's column (case-insensitive match)
    const normalizedManager = String(managerName).toLowerCase().trim();
    let managerColIdx = -1;
    
    for (let i = 0; i < distroHeaders.length; i++) {
      if (String(distroHeaders[i]).toLowerCase().trim() === normalizedManager) {
        managerColIdx = i;
        break;
      }
    }
    
    if (managerColIdx === -1) {
      throw new Error(`Manager "${managerName}" not found in RID DISTRO header row.`);
    }
    
    Logger.log(`[${functionName}] Found manager column at index ${managerColIdx} (${distroHeaders[managerColIdx]})`);
    
    // --- STEP 3: GET DEFAULT ORDER ---
    const distroLastRow = getTrueLastRow_(distroSheet, columnToLetter_(managerColIdx + 1));
    if (distroLastRow <= 1) {
      throw new Error("No data found in RID DISTRO for this manager.");
    }
    
    const defaultRids = distroSheet.getRange(2, managerColIdx + 1, distroLastRow - 1, 1)
      .getValues()
      .flat()
      .filter(v => v !== "" && v != null)
      .map(String);
    
    Logger.log(`[${functionName}] Default RID count: ${defaultRids.length}`);
    
    // --- STEP 4: PRESERVE NOTES ---
    const targetStartRow = 3;
    const activeLastRow = Math.max(activeSheet.getLastRow(), targetStartRow);
    const targetRowCount = activeLastRow - targetStartRow + 1;
    
    // Read existing RIDs and Notes
    const existingDataRange = activeSheet.getRange(targetStartRow, 3, targetRowCount, 1);
    const existingRids = existingDataRange.getValues().flat().map(String);
    const existingNotes = existingDataRange.getNotes().flat();
    
    // Build Note Map: RID -> Note
    const noteMap = new Map();
    existingRids.forEach((rid, i) => {
      if (rid && existingNotes[i]) {
        noteMap.set(rid, existingNotes[i]);
      }
    });
    Logger.log(`[${functionName}] Preserved ${noteMap.size} notes.`);
    
    // --- STEP 5: REBUILD FORMULAS ---
    // Clear existing content and notes
    if (targetRowCount > 0) {
      activeSheet.getRange(targetStartRow, 3, targetRowCount, 1).clearContent().clearNote();
    }
    SpreadsheetApp.flush();
    
    // Build formulas array
    // Formula: =INDEX(FILTER('RID DISTRO'!Row:Row, 'RID DISTRO'!$1:$1=$B$2))
    const formulas = [];
    
    for (let i = 0; i < defaultRids.length; i++) {
      const distroRow = i + 2; // Row 2 is first data row in RID DISTRO (Row 1 is headers)
      const formula = `=INDEX(FILTER('RID DISTRO'!${distroRow}:${distroRow}, 'RID DISTRO'!$1:$1=$B$2))`;
      formulas.push([formula]);
    }
    
    // Write formulas in batches
    if (formulas.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < formulas.length; i += batchSize) {
        const batch = formulas.slice(i, i + batchSize);
        activeSheet.getRange(targetStartRow + i, 3, batch.length, 1).setFormulas(batch);
        SpreadsheetApp.flush();
      }
    }
    
    // --- STEP 6: SYNC NOTES ---
    // Re-apply notes based on the default order
    const noteArray = defaultRids.map(rid => {
      return noteMap.has(rid) ? [noteMap.get(rid)] : [""];
    });
    
    if (noteArray.length > 0) {
      const batchSize = 4000;
      for (let i = 0; i < noteArray.length; i += batchSize) {
        const batch = noteArray.slice(i, i + batchSize);
        activeSheet.getRange(targetStartRow + i, 3, batch.length, 1).setNotes(batch);
        SpreadsheetApp.flush();
      }
    }
    
    recordsAdded = defaultRids.length;
    Logger.log(`[${functionName}] Successfully restored ${recordsAdded} formulas.`);
    
  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }
  
  // Log to Refresh sheet
  const duration = (new Date() - startTime) / 1000;
  try {
    const refreshSheet = ss.getSheetByName('Refresh');
    if (refreshSheet) {
      refreshSheet.appendRow([functionName, new Date(), recordsAdded, duration, result, errorMessage]);
    }
  } catch (logError) {
    Logger.log(`[${functionName}] Logging error: ${logError.message}`);
  }
  
  return {
    success: result === "Success",
    count: recordsAdded,
    message: result === "Success"
      ? `Reset complete. Restored ${recordsAdded} accounts to default order.`
      : `Reset failed: ${errorMessage}`
  };
}

/**
 * injectAIFormula() - Injects the AI-generated formula into STATCORE Col BE
 * 
 * @param {string} formula - The formula generated by AI (without leading =)
 * @returns {Object} { success: boolean, message: string }
 */
function injectAIFormula(formula) {
  const functionName = 'injectAIFormula';
  Logger.log(`[${functionName}] Injecting formula: ${formula}`);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const statcoreSheet = ss.getSheetByName(INFOCUS_CONFIG.MASTER_DATA.sheetName);
    if (!statcoreSheet) {
      throw new Error("STATCORE sheet not found.");
    }
    
    // Ensure formula starts with =
    const cleanFormula = formula.startsWith('=') ? formula : '=' + formula;
    
    // Inject into BE3 (first data row, helper column)
    const helperColNum = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.helperCol);
    const targetCell = statcoreSheet.getRange(3, helperColNum);
    
    // Clear the helper column first
    const lastRow = getTrueLastRow_(statcoreSheet, 'A');
    if (lastRow > 2) {
      statcoreSheet.getRange(3, helperColNum, lastRow - 2, 1).clearContent();
    }
    SpreadsheetApp.flush();
    
    // Set the ArrayFormula
    targetCell.setFormula(cleanFormula);
    SpreadsheetApp.flush();
    
    Logger.log(`[${functionName}] Formula injected successfully.`);
    
    return {
      success: true,
      message: "Formula injected into STATCORE column " + INFOCUS_CONFIG.MASTER_DATA.helperCol
    };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return {
      success: false,
      message: "Failed to inject formula: " + error.message
    };
  }
}

/**
 * clearAIFilter() - Clears the helper column in STATCORE
 * @returns {Object} { success: boolean, message: string }
 */
function clearAIFilter() {
  const functionName = 'clearAIFilter';
  Logger.log(`[${functionName}] Clearing helper column.`);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const statcoreSheet = ss.getSheetByName(INFOCUS_CONFIG.MASTER_DATA.sheetName);
    if (!statcoreSheet) {
      throw new Error("STATCORE sheet not found.");
    }
    
    const helperColNum = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.helperCol);
    const lastRow = getTrueLastRow_(statcoreSheet, 'A');
    
    if (lastRow > 2) {
      statcoreSheet.getRange(3, helperColNum, lastRow - 2, 1).clearContent();
      SpreadsheetApp.flush();
    }
    
    return { success: true, message: "Filter cleared." };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return { success: false, message: "Failed to clear filter: " + error.message };
  }
}

/**
 * getInFocusStatus() - Returns current filter status for sidebar
 * @returns {Object} { isFiltered: boolean, managerName: string, accountCount: number }
 */
function getInFocusStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  
  try {
    const managerName = activeSheet.getRange(INFOCUS_CONFIG.TARGET.managerCell).getValue();
    
    // Check if C3 contains a formula (default) or static value (filtered)
    const c3Cell = activeSheet.getRange('C3');
    const c3Formula = c3Cell.getFormula();
    const isFiltered = !c3Formula || c3Formula === "";
    
    // Count non-empty cells in Column C starting from C3
    const lastRow = activeSheet.getLastRow();
    let accountCount = 0;
    if (lastRow >= 3) {
      const values = activeSheet.getRange(3, 3, lastRow - 2, 1).getValues().flat();
      accountCount = values.filter(v => v !== "" && v != null).length;
    }
    
    return {
      isFiltered: isFiltered,
      managerName: String(managerName || ""),
      accountCount: accountCount,
      sheetName: activeSheet.getName()
    };
    
  } catch (error) {
    Logger.log("[getInFocusStatus] Error: " + error.message);
    return {
      isFiltered: false,
      managerName: "",
      accountCount: 0,
      sheetName: ""
    };
  }
}

/**
 * Validates that the active sheet is a valid AM dashboard
 * @returns {Object} { isValid: boolean, error: string }
 */
function validateInFocusSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();
  
  // Exclude system sheets
  const systemSheets = ['STATCORE', 'DISTRO', 'SETUP', 'RID DISTRO', 'Focus20', 'Refresh', 'NOTE_CONFIG', 'Log', 'Sets', 'Launcher'];
  
  if (systemSheets.includes(sheetName)) {
    return {
      isValid: false,
      error: `Cannot use InFocus on system sheet "${sheetName}". Please select an AM dashboard tab.`
    };
  }
  
  // Check for manager name in B2
  const managerName = activeSheet.getRange('B2').getValue();
  if (!managerName || String(managerName).trim() === "") {
    return {
      isValid: false,
      error: "No manager name found in cell B2. Please select a valid AM dashboard."
    };
  }
  
  return {
    isValid: true,
    error: null
  };
}

// =============================================================
// HELPER UTILITIES
// =============================================================

/**
 * Converts column letter to number (A=1, B=2, etc.)
 */
function letterToColumn_(letter) {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

/**
 * Converts column number to letter (1=A, 2=B, etc.)
 */
function columnToLetter_(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

/**
 * Gets the true last row of a sheet based on a specific column
 */
function getTrueLastRow_(sheet, columnA1 = "A") {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return 0;
  const data = sheet.getRange(`${columnA1}1:${columnA1}${lastRow}`).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== "" && data[i][0] != null) return i + 1;
  }
  return 0;
}
