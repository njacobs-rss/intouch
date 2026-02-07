// =============================================================
// FILE: Admin.gs (Final Optimized)
// PURPOSE: Internal logic (AM Tabs, Focus20 Tagging, Data Refresh)
// =============================================================

// PROTECTED SHEETS: These sheets should NEVER be deleted by tab management functions
var PROTECTED_SHEET_NAMES = [
  'Setup', 'STATCORE', 'SYSCORE', 'DAGCORE', 'DISTRO', 
  'Launcher', 'Sets', 'Refresh', 'Config', 'Benchmarks', 'Focus20'
];

// =============================================================
// SECTION: ORCHESTRATION & AUTOMATION
// =============================================================

function runMasterPipeline() {
  const functionName = 'runMasterPipeline';
  const startTime = new Date();
  console.log(`[${functionName}] 🚀 Starting Nightly Master Pipeline...`);

  try {
    console.log(`[${functionName}] 1/2 Executing Data Pipeline (STATCORE)...`);
    updateSTATCORE(); 
    
    console.log(`[${functionName}] 2/2 Executing Notes Refresh...`);
    updateAccountNotes();

    // REMOVED: Step 3 Kicking Zombie Formulas (forcePortfolioRecalc)

    const duration = (new Date() - startTime) / 1000;
    console.log(`[${functionName}] ✅ Pipeline Complete in ${duration}s`);
    logRefreshStatus("MASTER_PIPELINE", duration, "Success");

  } catch (error) {
    console.error(`[${functionName}] 🔥 CRITICAL FAILURE:`, error);
    logRefreshStatus("MASTER_PIPELINE", 0, "Fail", error.message);
    throw error;
  }
}

function logRefreshStatus(processName, duration, result, errorMessage = "") {
  try {
    logRefreshToCentral(processName, 'ALL', duration, result, errorMessage);
  } catch (e) {
    console.error("Failed to write to Refresh log", e);
  }
}

function setupNightlyTrigger() {
  const functionName = 'runMasterPipeline';
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === functionName) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(functionName)
    .timeBased().everyDays(1).atHour(1).inTimezone(Session.getScriptTimeZone()).create();
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Nightly Trigger Set (1am-2am)", "System Admin");
}

// =============================================================
// SECTION: SHEET EVENT HANDLERS (OPTIMIZED - NO DEDUPE)
// =============================================================

function handleIntouchEdits(e) {
  if (!e || !e.range) return; // Fast fail

  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();
  
  // 1. BATCH TIMESTAMPING (Only updates Date, doesn't scan for duplicates)
  if (col === 2 && row > 1) {
    var lastUpdatedColumn = getColumnIndexByName(sheet, 'Last Updated');
    if (lastUpdatedColumn) {
      var values = range.getValues();
      var timestampUpdates = values.map(r => [r[0] !== '' ? new Date() : null]);
      sheet.getRange(row, lastUpdatedColumn, values.length, 1).setValues(timestampUpdates);
    }
  }

  // 2. "DEFAULT" SETS LOGIC
  if (range.getA1Notation() === 'F1' && range.getValue() === 'Default') {
    var setsSheet = e.source.getSheetByName('Sets');
    if (setsSheet) {
      var setsData = setsSheet.getDataRange().getValues();
      var defaultRow = setsData.findIndex(r => r[0] === 'Default');
      if (defaultRow > -1) {
        var sourceVals = setsSheet.getRange(defaultRow + 1, 8, 1, 20).getValues();
        sheet.getRange(2, 8, 1, 20).setValues(sourceVals);
      }
    }
  }

  // 3. "SMART SELECT" LOGIC (Focus 20)
  var smartSelectColumnIndex = getColumnIndexByName(sheet, 'Smart Select');
  if (smartSelectColumnIndex && col === smartSelectColumnIndex) {
     var values = range.getValues();
     // Only trigger if at least one 'TRUE' exists
     if (values.some(r => r[0] === true || String(r[0]).toUpperCase() === 'TRUE')) {
       moveTrueAccountsToFocus20();
     }
  }
}

// =============================================================
// SECTION: AM TAB MANAGEMENT
// =============================================================

function createSingleEmployeeTab() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSheet = ss.getSheetByName("Setup");
  var launcherSheet = ss.getSheetByName("Launcher");

  if (!setupSheet || !launcherSheet) throw new Error('Missing Setup or Launcher sheet');

  var employeeName = setupSheet.getRange("F2").getValue().trim();
  if (employeeName === "") return ui.alert('Error: No employee name found in SETUP!F2.');

  var firstName = employeeName.split(' ')[0];
  var uniqueName = getUniqueSheetName(ss, firstName);
  var sheetCopy = launcherSheet.copyTo(ss).setName(uniqueName);

  sheetCopy.getRange("B2").setValue(employeeName);
  ss.setActiveSheet(sheetCopy);
  ss.moveActiveSheet(1);

  var targetRange = setupSheet.getRange("B3:B22");
  var values = targetRange.getValues();
  var added = false;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === "") {
      targetRange.getCell(i + 1, 1).setValue(employeeName);
      added = true;
      break;
    }
  }

  if (!added) return ui.alert('Error: No available row in SETUP!B3:B22.');
  setupSheet.getRange("F2").clearContent();
  ss.toast("Tab created. Updating notes & running refresh pipeline...", "Success");
  
  manualUpdateNotesOnly();
  runMasterPipeline();
  // REMOVED: forcePortfolioRecalc();
}

/**
 * Creates employee tabs based on names in SETUP!B3:B
 * @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
 */
function createEmployeeTabs(targetSS) {
  var ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();
  var isActiveSpreadsheet = !targetSS; // Only do UI ops if running on active spreadsheet
  
  // GLOBAL MODE: First deploy fresh Launcher from master to target
  if (!isActiveSpreadsheet) {
    var masterSS = SpreadsheetApp.getActiveSpreadsheet();
    deploySheetToTarget_(masterSS, ss, "Launcher", false); // false = don't hide
  }
  
  var setupSheet = ss.getSheetByName("Setup");
  var launcherSheet = ss.getSheetByName("Launcher");
  if (!setupSheet || !launcherSheet) throw new Error('Missing Setup or Launcher sheet');

  var employeeNames = setupSheet.getRange("B3:B" + setupSheet.getLastRow()).getValues()
    .map(r => r[0].trim()).filter(name => name && name !== "Manager Lens"); 

  var firstNames = employeeNames.map(n => n.split(' ')[0]);
  ss.getSheets().forEach(s => { 
    var name = s.getName();
    if (PROTECTED_SHEET_NAMES.includes(name)) {
      Logger.log('WARNING: Skipping protected sheet: ' + name);
      return;
    }
    if (firstNames.includes(name)) ss.deleteSheet(s); 
  });

  firstNames.forEach((name, i) => {
    var copy = launcherSheet.copyTo(ss).setName(getUniqueSheetName(ss, name));
    copy.getRange("B2").setValue(employeeNames[i]);
    if (isActiveSpreadsheet) {
      ss.setActiveSheet(copy);
      ss.moveActiveSheet(1);
    }
  });

  if (isActiveSpreadsheet) {
    ss.setActiveSheet(setupSheet);
  }
  
  // Call updateAccountNotes with targetSS for fleet compatibility
  updateAccountNotes(ss);
  // REMOVED: forcePortfolioRecalc(); 
  
  return "Tabs created successfully.";
}

/**
 * HELPER: Deploys a sheet from source to target spreadsheet (safe update)
 * Uses rename-and-replace strategy to preserve formula references
 * @param {Spreadsheet} sourceSS - Source spreadsheet with the template
 * @param {Spreadsheet} targetSS - Target spreadsheet to update
 * @param {string} sheetName - Name of the sheet to deploy
 * @param {boolean} hideSheet - Whether to hide the sheet after deployment
 */
function deploySheetToTarget_(sourceSS, targetSS, sheetName, hideSheet) {
  var sourceTemplate = sourceSS.getSheetByName(sheetName);
  if (!sourceTemplate) {
    throw new Error("Source sheet '" + sheetName + "' not found in master spreadsheet.");
  }

  var sourceProtections = sourceTemplate.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  var oldSheet = targetSS.getSheetByName(sheetName);

  if (oldSheet) {
    // 1. Rename old sheet to preserve formula references temporarily
    var tempName = sheetName + "_OLD_" + new Date().getTime();
    oldSheet.setName(tempName);

    // 2. Copy new sheet in
    var newSheet = sourceTemplate.copyTo(targetSS).setName(sheetName);

    // 3. Handle Visibility
    if (hideSheet === true) {
      newSheet.hideSheet();
    } else {
      newSheet.showSheet();
    }

    // 4. Restore Protections
    for (var i = 0; i < sourceProtections.length; i++) {
      var p = sourceProtections[i];
      newSheet.getRange(p.getRange().getA1Notation()).protect().setDescription(p.getDescription());
    }

    // 5. Update formulas to point to the new sheet name
    targetSS.createTextFinder(tempName).matchFormulaText(true).replaceAllWith(sheetName);

    // 6. Delete the old sheet
    targetSS.deleteSheet(oldSheet);
  } else {
    // Sheet doesn't exist in target - just copy it fresh
    var newSheet = sourceTemplate.copyTo(targetSS).setName(sheetName);
    if (hideSheet === true) {
      newSheet.hideSheet();
    }
    for (var i = 0; i < sourceProtections.length; i++) {
      var p = sourceProtections[i];
      newSheet.getRange(p.getRange().getA1Notation()).protect().setDescription(p.getDescription());
    }
  }
}

function deleteEmployeeTabs() {
  assertAdminAccess(); // Requires admin - destructive operation
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = ss.getSheetByName("Setup").getRange("B3:B").getValues()
    .map(r => r[0].trim()).filter(name => name && name !== "Manager Lens"); 

  var firstNames = names.map(n => n.split(' ')[0]);
  ss.getSheets().forEach(s => { 
    var name = s.getName();
    if (PROTECTED_SHEET_NAMES.includes(name)) {
      Logger.log('WARNING: Skipping protected sheet: ' + name);
      return;
    }
    if (firstNames.includes(name)) ss.deleteSheet(s); 
  });
  return "Employee tabs deleted.";
}

// =============================================================
// SECTION: FOCUS 20 LOGIC (Focus20 Tab Management)
// =============================================================

// --- WRAPPER FUNCTIONS (Required for Menu & Triggers) ---
function moveTrueAccountsToFocus20() { tagFocus20Status(true); }
function removeTrueAccountsFromFocus20Optimized() { tagFocus20Status(false); }

/**
 * CORE ENGINE: Reads RIDs from Active Sheet (Smart Select), 
 * manages the Focus20 sheet tab (add/remove rows by RID).
 * Focus20 tab schema: RID (A) | AddedDate (B) | AddedBy (C)
 * The STATCORE AU formula VLOOKUPs from this tab by RID each night.
 * @param {boolean} isAdding - true = Append RID+Date+User; false = Delete matching rows
 */
function tagFocus20Status(isAdding) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getActiveSheet();

  // --- VALIDATION ---
  if (sourceSheet.getName() === "STATCORE" || sourceSheet.getName() === "Focus20") {
    ss.toast("Please select accounts from a working tab.", "Usage Error", 5);
    return;
  }

  const focus20Sheet = ss.getSheetByName("Focus20");
  if (!focus20Sheet) {
    ss.toast("CRITICAL: 'Focus20' sheet tab not found.", "System Error", 10);
    return;
  }

  // --- MAP SOURCE COLUMNS ---
  const srcHeaderRow = 2;
  const srcSmartIdx = getColumnIndexByName(sourceSheet, 'Smart Select');
  const srcRidIdx = getColumnIndexByName(sourceSheet, 'RID') || 3;

  if (!srcSmartIdx) {
    ss.toast("Column 'Smart Select' not found in Row 2.", "Config Error", 5);
    return;
  }

  // --- STEP 1: READ SOURCE (Smart Select checked RIDs) ---
  const srcLastRow = sourceSheet.getLastRow();
  if (srcLastRow <= srcHeaderRow) {
    ss.toast("Sheet is empty.", "System", 3);
    return;
  }

  const srcData = sourceSheet.getRange(srcHeaderRow + 1, 1, srcLastRow - srcHeaderRow, sourceSheet.getLastColumn()).getValues();
  const ridsToProcess = new Set();
  const rowsToUncheck = [];

  srcData.forEach((row, i) => {
    const isSelected = row[srcSmartIdx - 1];
    const rid = row[srcRidIdx - 1];
    // Check for boolean TRUE or string "TRUE"
    if ((isSelected === true || String(isSelected).toUpperCase() === 'TRUE') && rid) {
      ridsToProcess.add(String(rid));
      rowsToUncheck.push(srcHeaderRow + 1 + i);
    }
  });

  if (ridsToProcess.size === 0) {
    ss.toast("No accounts selected. Check the 'Smart Select' box.", "Focus 20", 3);
    return;
  }

  // --- STEP 2: UPDATE FOCUS20 TAB ---
  let actionCount = 0;

  if (isAdding) {
    // ADD FLOW: Append new RIDs to Focus20 tab (skip duplicates)
    const f20LastRow = focus20Sheet.getLastRow();
    const existingRids = new Set();
    if (f20LastRow >= 2) {
      focus20Sheet.getRange(2, 1, f20LastRow - 1, 1).getValues().flat().forEach(function(rid) {
        existingRids.add(String(rid));
      });
    }

    const now = new Date();
    var userEmail = 'unknown';
    try {
      userEmail = Session.getActiveUser().getEmail() || 'unknown';
    } catch (e) {}

    const rowsToAppend = [];
    ridsToProcess.forEach(function(rid) {
      if (!existingRids.has(rid)) {
        rowsToAppend.push([rid, now, userEmail]);
        actionCount++;
      }
    });

    if (rowsToAppend.length > 0) {
      focus20Sheet.getRange(f20LastRow + 1, 1, rowsToAppend.length, 3).setValues(rowsToAppend);
    }

  } else {
    // REMOVE FLOW: Delete matching RID rows from Focus20 tab (bottom-to-top)
    const f20LastRow = focus20Sheet.getLastRow();
    if (f20LastRow >= 2) {
      const f20Rids = focus20Sheet.getRange(2, 1, f20LastRow - 1, 1).getValues();
      const rowsToDelete = [];

      f20Rids.forEach(function(row, i) {
        if (ridsToProcess.has(String(row[0]))) {
          rowsToDelete.push(i + 2); // +2 because data starts at row 2
          actionCount++;
        }
      });

      // Delete bottom-to-top to preserve row indices
      for (var i = rowsToDelete.length - 1; i >= 0; i--) {
        focus20Sheet.deleteRow(rowsToDelete[i]);
      }
    }
  }

  // --- STEP 3: UNCHECK SMART SELECT & TOAST ---
  rowsToUncheck.forEach(function(r) { sourceSheet.getRange(r, srcSmartIdx).setValue(false); });

  var verb = isAdding ? "Added" : "Removed";
  if (actionCount > 0) {
    ss.toast(verb + " " + actionCount + " accounts in Focus20.", "Success", 4);
  } else if (isAdding) {
    ss.toast("Selected accounts are already in Focus20.", "Info", 4);
  } else {
    ss.toast("None of the selected RIDs were found in Focus20.", "Warning", 5);
  }
}

// =============================================================
// SECTION: MANUAL TRIGGERS & UTILS
// =============================================================

function confirmUpdateTotalChain() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('TOTAL SYSTEM REFRESH', 'Refresh Everything? (Data + Notes)', ui.ButtonSet.YES_NO) == ui.Button.YES) {
    SpreadsheetApp.getActiveSpreadsheet().toast("Initializing Pipeline...", "System");
    runMasterPipeline();
  }
}

function manualUpdateNotesOnly() {
  try { 
    SpreadsheetApp.getActiveSpreadsheet().toast("Updating Notes...", "Status"); 
    updateAccountNotes(); 
  } catch (e) { throw new Error("Error updating notes: " + e.message); }
}

function resetAndReapplyFilters() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dataRange = sheet.getDataRange();
  var lastRow = dataRange.getLastRow();
  if (dataRange.getFilter()) { dataRange.getFilter().remove(); }
  var filterRange = sheet.getRange(2, 1, lastRow - 1, dataRange.getLastColumn());
  filterRange.createFilter();
  // Clear Smart Select column (Column D) - data starts at row 3
  if (lastRow >= 3) {
    sheet.getRange(3, 4, lastRow - 2, 1).setValue(false);
  }
}

function getUniqueSheetName(ss, baseName) {
  var name = baseName, idx = 1;
  while (ss.getSheetByName(name)) { name = baseName + " (" + idx++ + ")"; }
  return name;
}

function getColumnIndexByName(sheet, columnName) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return null;
  var headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  var index = headers.indexOf(columnName);
  return index > -1 ? index + 1 : null;
}

// REMOVED: forcePortfolioRecalc() function completely per request

// =============================================================
// SECTION: EXTERNAL RESOURCE SCANNER
// =============================================================
// Scans codebase and spreadsheet for external data dependencies,
// uses Gemini to generate descriptions, outputs to EXT_RESOURCE_KEY
// =============================================================

/**
 * EXTERNAL_RESOURCE_REGISTRY
 * Central registry of all known external resources used by the InTouch system.
 * This is populated from static analysis of the codebase.
 */
var EXTERNAL_RESOURCE_REGISTRY = {
  spreadsheets: {
    'statcore_source': {
      id: '1Qa3S3USt-TOdVctormnunF4P8L010C3pSCx9zl5aTtM',
      sheet: 'StatcoreNA',
      source: 'STATCORE.js:31, FleetCommander.js:611',
      purpose: 'Base STATCORE account data - columns A-AG (33 columns) containing core account information'
    },
    'syscore_source': {
      id: '1V4C9mIL4ISP4rx2tJcpPhflM-RIi4eft_xDZWAgWmGU',
      sheet: 'SEND',
      source: 'STATCORE.js:147, FleetCommander.js:612',
      purpose: 'SYSCORE supplemental data - columns A-P (16 columns) with Salesforce/Stripe links'
    },
    'dagcore_source': {
      id: '1atxJQcNKTJyE17NhjbXmKIKUwr8uiuexRIgEcAceNcs',
      sheet: 'SEND',
      source: 'STATCORE.js:306, FleetCommander.js:613',
      purpose: 'DAGCORE distribution metrics - columns A-BB (54 columns) for DISTRO sheet'
    },
    'central_logging': {
      id: '1yiqY-5XJY2k86RXDib2zCveR9BNbG7FRdasLUFYYeWY',
      sheet: 'Log, Refresh, API_Usage, Prompt_Log, Fleet_Ops',
      source: 'Main.js:12, InTouchGuide.js:4140',
      purpose: 'Central logging master spreadsheet for fleet-wide operation logs and KH feedback'
    },
    'bi_cloning_log': {
      id: '174CADIuvvbFnTWgVHh-X5EC5pQZQc_9KRjFVdCeA7pk',
      sheet: 'Runtime logs',
      source: 'AiOpsFunctions.js:1143',
      purpose: 'BI presentation cloning runtime logs and error tracking'
    },
    'external_benchmarks': {
      id: '1FhLSSmCb4bEaiso8ZlUcDjPA6pD8l2eHKOkf0E1GJe4',
      sheet: 'metro, nbhd, macro',
      source: 'BizInsights.js:136',
      purpose: 'External benchmark data for metro/neighborhood/macro comparisons in BI presentations'
    }
  },
  folders: {
    'fleet_target': {
      id: '1oqbXf4CPouogLMvlB5rzZipOwiGZyRwE',
      source: 'FleetCommander.js:31',
      purpose: 'Target Drive folder containing all fleet InTouch spreadsheet files'
    },
    'template_folder': {
      id: '1lt4n-LZe8ufMqCkNSU-tGRs4DysEKySs',
      source: 'FleetCommander.js:253',
      purpose: 'Template folder containing BI_Prod_Sheet and BI_Prod_Slides masters'
    }
  },
  urls: {
    'salesforce_base': {
      url: 'https://opentable.my.salesforce.com/',
      source: 'STATCORE.js:128',
      purpose: 'Salesforce base URL for generating task/event hyperlinks in SYSCORE data'
    },
    'stripe_base': {
      url: 'https://guestcenter.opentable.com/restaurant/',
      source: 'STATCORE.js:129',
      purpose: 'Stripe/Guest Center base URL for restaurant integration links'
    },
    'preset_dashboard_170': {
      url: 'https://bce906ff.us1a.app.preset.io/superset/dashboard/170/',
      source: 'STATCORE.js:415',
      purpose: 'Preset/Superset dashboard #170 with native filters for data visualization'
    },
    'preset_dashboard_2083': {
      url: 'https://bce906ff.us1a.app.preset.io/superset/dashboard/2083/',
      source: 'STATCORE.js:423',
      purpose: 'Preset/Superset dashboard #2083 with native filters for data visualization'
    },
    'gemini_api': {
      url: 'https://generativelanguage.googleapis.com/v1beta/',
      source: 'InTouchGuide.js:2872, 3879, 6291',
      purpose: 'Google Gemini API endpoints for AI-powered InTouch Guide responses'
    }
  }
};

/**
 * Scans all sheets in the active spreadsheet for IMPORTRANGE formulas
 * Extracts spreadsheet IDs and range references from the formulas
 * @returns {Array} Array of objects with sheet, cell, formula, extractedId, and extractedRange
 * @private
 */
function _scanSheetsForImportRange_() {
  const functionName = '_scanSheetsForImportRange_';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const results = [];
  
  // Regex to extract IMPORTRANGE components
  // Matches: =IMPORTRANGE("spreadsheet_id", "range") or =IMPORTRANGE('spreadsheet_id', 'range')
  // Handles straight quotes AND curly/smart quotes (U+201C, U+201D, U+2018, U+2019)
  // UPDATED: Explicit unicode support for smart quotes
  const importRangeRegex = /IMPORTRANGE\s*\(\s*["'\u201C\u201D\u2018\u2019]([^"'\u201C\u201D\u2018\u2019]+)["'\u201C\u201D\u2018\u2019]\s*,\s*["'\u201C\u201D\u2018\u2019]([^"'\u201C\u201D\u2018\u2019]+)["'\u201C\u201D\u2018\u2019]\s*\)/gi;
  
  console.log('[' + functionName + '] Scanning ' + sheets.length + ' sheets for IMPORTRANGE formulas...');
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();
    
    // Debug: Log each sheet being scanned
    console.log('[' + functionName + '] Scanning sheet: ' + sheetName);
    
    try {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      
      if (lastRow === 0 || lastCol === 0) continue;
      
      var formulas = sheet.getRange(1, 1, lastRow, lastCol).getFormulas();
      
      var sheetImportCount = 0;
      for (var row = 0; row < formulas.length; row++) {
        for (var col = 0; col < formulas[row].length; col++) {
          var formula = formulas[row][col];
          if (formula && formula.toUpperCase().indexOf('IMPORTRANGE') > -1) {
            sheetImportCount++;
            var cellA1 = sheet.getRange(row + 1, col + 1).getA1Notation();
            
            // Debug: Log found IMPORTRANGE formula
            console.log('[' + functionName + '] Found IMPORTRANGE in ' + sheetName + '!' + cellA1);
            
            // Reset regex lastIndex for each formula
            importRangeRegex.lastIndex = 0;
            var match;
            var foundAny = false;
            
            // Loop to capture ALL IMPORTRANGE calls in the formula
            while ((match = importRangeRegex.exec(formula)) !== null) {
              foundAny = true;
              console.log('[' + functionName + '] Parsed: ID=' + match[1].substring(0, 20) + '..., Range=' + match[2]);
              results.push({
                sheet: sheetName,
                cell: cellA1,
                formula: formula,
                extractedId: match[1].trim(),
                extractedRange: match[2].trim()
              });
            }
            
            // Fallback: if regex didn't match but IMPORTRANGE exists, log for review
            // This usually means it's a dynamic reference (concatenation) or cell reference
            if (!foundAny) {
              console.warn('[' + functionName + '] Dynamic/Complex IMPORTRANGE in ' + sheetName + '!' + cellA1 + ': ' + formula.substring(0, 200));
              results.push({
                sheet: sheetName,
                cell: cellA1,
                formula: formula,
                extractedId: 'DYNAMIC_REFERENCE',
                extractedRange: 'Dynamic/Calculated Range'
              });
            }
          }
        }
      }
      if (sheetImportCount > 0) {
        console.log('[' + functionName + '] Sheet "' + sheetName + '" had ' + sheetImportCount + ' cells with IMPORTRANGE');
      }
    } catch (e) {
      console.log('[' + functionName + '] Error scanning sheet "' + sheetName + '": ' + e.message);
    }
    
    // Flush to prevent timeout on large spreadsheets
    if (s % 5 === 0) SpreadsheetApp.flush();
  }
  
  console.log('[' + functionName + '] Found ' + results.length + ' IMPORTRANGE formulas');
  return results;
}

/**
 * Generates a technical description for an external resource using Gemini Flash
 * @param {Object} resource - Resource object with type, id, context details
 * @returns {string} AI-generated description or fallback text
 * @private
 */
function _generateResourceDescription_(resource) {
  var functionName = '_generateResourceDescription_';
  
  try {
    var apiKey = getGeminiApiKey_();
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    
    var prompt = 'Generate a concise technical description (2-3 sentences max) for this external data resource used in a Google Apps Script system. ' +
      'Focus on what data it provides and how it integrates with the system.\n\n' +
      'Resource Type: ' + resource.type + '\n' +
      'Resource ID: ' + resource.id + '\n' +
      'Sheet/Path: ' + (resource.sheet || 'N/A') + '\n' +
      'Source Location: ' + resource.source + '\n' +
      'Context: ' + resource.context;
    
    var payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    };
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      var json = JSON.parse(response.getContentText());
      if (json.candidates && json.candidates[0] && json.candidates[0].content) {
        var text = json.candidates[0].content.parts[0].text;
        return text.trim();
      }
    } else {
      console.log('[' + functionName + '] API returned code ' + responseCode);
    }
  } catch (e) {
    console.log('[' + functionName + '] Error generating description: ' + e.message);
  }
  
  // Fallback: return the context/purpose if API fails
  return resource.context || 'External resource - description unavailable';
}

/**
 * Creates or updates the EXT_RESOURCE_KEY sheet with all external resources
 * @param {Array} resources - Array of resource objects to write
 * @private
 */
function _writeToResourceKeySheet_(resources) {
  var functionName = '_writeToResourceKeySheet_';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'EXT_RESOURCE_KEY';
  
  // Get or create sheet
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    console.log('[' + functionName + '] Created new sheet: ' + sheetName);
  } else {
    // Clear existing data but preserve sheet
    sheet.clear();
    console.log('[' + functionName + '] Cleared existing sheet: ' + sheetName);
  }
  
  // Define headers
  var headers = [
    'Resource Type',
    'Resource ID',
    'Resource Name',
    'Sheet/Tab Name',
    'Source Location',
    'Purpose Context',
    'AI Description',
    'IMPORTRANGE Usage',
    'Last Scanned',
    'Status'
  ];
  
  // Write headers with formatting
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a86e8');
  headerRange.setFontColor('#ffffff');
  
  // Write data rows
  if (resources.length > 0) {
    var dataRows = resources.map(function(r) {
      return [
        r.type || '',
        r.id || '',
        r.name || '',
        r.sheet || '',
        r.source || '',
        r.context || '',
        r.description || '',
        r.importrangeUsage || '',
        new Date(),
        r.status || 'Active'
      ];
    });
    
    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
    console.log('[' + functionName + '] Wrote ' + dataRows.length + ' resource rows');
  }
  
  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Set column widths for longer content
  sheet.setColumnWidth(6, 250); // Purpose Context
  sheet.setColumnWidth(7, 350); // AI Description
  sheet.setColumnWidth(8, 300); // IMPORTRANGE Usage
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * Attempts to get the name of an external spreadsheet by ID
 * @param {string} ssId - Spreadsheet ID
 * @returns {string} Spreadsheet name or 'Unknown'
 * @private
 */
function _getSpreadsheetName_(ssId) {
  try {
    var ss = SpreadsheetApp.openById(ssId);
    return ss.getName();
  } catch (e) {
    return 'Inaccessible';
  }
}

/**
 * Attempts to get the name of a Drive folder by ID
 * @param {string} folderId - Folder ID
 * @returns {string} Folder name or 'Unknown'
 * @private
 */
function _getFolderName_(folderId) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    return folder.getName();
  } catch (e) {
    return 'Inaccessible';
  }
}

/**
 * MAIN FUNCTION: Scans all external resources and outputs to EXT_RESOURCE_KEY
 * - Reads from EXTERNAL_RESOURCE_REGISTRY (static codebase analysis)
 * - Scans spreadsheet for IMPORTRANGE formulas
 * - Uses Gemini Flash to generate descriptions
 * - Outputs results to EXT_RESOURCE_KEY sheet
 */
function scanExternalResources() {
  assertAdminAccess(); // Requires admin - sensitive resource audit
  var functionName = 'scanExternalResources';
  var startTime = new Date();
  var result = 'Success';
  var errorMessage = '';
  var recordsAdded = 0;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Scanning external resources...', 'Resource Scanner', -1);
  
  console.log('[' + functionName + '] Starting external resource scan...');
  
  try {
    var allResources = [];
    
    // =========================================
    // STEP 1: Process registry spreadsheets
    // =========================================
    console.log('[' + functionName + '] Processing registered spreadsheets...');
    var spreadsheets = EXTERNAL_RESOURCE_REGISTRY.spreadsheets;
    for (var key in spreadsheets) {
      if (spreadsheets.hasOwnProperty(key)) {
        var s = spreadsheets[key];
        var ssName = _getSpreadsheetName_(s.id);
        var status = ssName === 'Inaccessible' ? 'Inaccessible' : 'Active';
        
        allResources.push({
          type: 'Spreadsheet',
          id: s.id,
          name: ssName,
          sheet: s.sheet,
          source: s.source,
          context: s.purpose,
          description: '', // Will be filled by AI
          status: status
        });
      }
    }
    
    // =========================================
    // STEP 2: Process registry folders
    // =========================================
    console.log('[' + functionName + '] Processing registered folders...');
    var folders = EXTERNAL_RESOURCE_REGISTRY.folders;
    for (var key in folders) {
      if (folders.hasOwnProperty(key)) {
        var f = folders[key];
        var folderName = _getFolderName_(f.id);
        var status = folderName === 'Inaccessible' ? 'Inaccessible' : 'Active';
        
        allResources.push({
          type: 'Folder',
          id: f.id,
          name: folderName,
          sheet: '',
          source: f.source,
          context: f.purpose,
          description: '',
          status: status
        });
      }
    }
    
    // =========================================
    // STEP 3: Process registry URLs
    // =========================================
    console.log('[' + functionName + '] Processing registered URLs...');
    var urls = EXTERNAL_RESOURCE_REGISTRY.urls;
    for (var key in urls) {
      if (urls.hasOwnProperty(key)) {
        var u = urls[key];
        allResources.push({
          type: 'URL',
          id: u.url,
          name: key.replace(/_/g, ' '),
          sheet: '',
          source: u.source,
          context: u.purpose,
          description: '',
          status: 'Active'
        });
      }
    }
    
    // =========================================
    // STEP 4: Scan for IMPORTRANGE formulas
    // =========================================
    console.log('[' + functionName + '] Scanning for IMPORTRANGE formulas...');
    var importRanges = _scanSheetsForImportRange_();
    
    // Build usage map: spreadsheet ID -> array of {sheet, cell, range}
    var usageMap = {};
    for (var i = 0; i < importRanges.length; i++) {
      var ir = importRanges[i];
      var irId = ir.extractedId;
      if (!irId || irId === '[PARSE_ERROR]') continue;
      
      if (!usageMap[irId]) {
        usageMap[irId] = [];
      }
      usageMap[irId].push({
        sheet: ir.sheet,
        cell: ir.cell,
        range: ir.extractedRange
      });
    }
    
    console.log('[' + functionName + '] Built usage map for ' + Object.keys(usageMap).length + ' unique spreadsheet IDs');
    
    // Track unique spreadsheet IDs from IMPORTRANGE (for new discoveries)
    var seenImportIds = {};
    
    for (var i = 0; i < importRanges.length; i++) {
      var ir = importRanges[i];
      var irId = ir.extractedId;
      
      // Skip parse errors
      if (!irId || irId === '[PARSE_ERROR]') continue;
      
      // Skip if this ID is already in the registry
      var isInRegistry = false;
      for (var rKey in spreadsheets) {
        if (spreadsheets.hasOwnProperty(rKey) && spreadsheets[rKey].id === irId) {
          isInRegistry = true;
          break;
        }
      }
      
      // Skip if we've already added this IMPORTRANGE ID
      if (seenImportIds[irId]) {
        continue;
      }
      
      if (!isInRegistry && irId) {
        seenImportIds[irId] = true;
        
        var irName, irStatus;
        if (irId === 'DYNAMIC_REFERENCE') {
          irName = 'Dynamic/Calculated Reference';
          irStatus = 'Manual Review';
        } else {
          irName = _getSpreadsheetName_(irId);
          irStatus = irName === 'Inaccessible' ? 'Inaccessible' : 'Active';
        }
        
        allResources.push({
          type: 'IMPORTRANGE',
          id: irId,
          name: irName,
          sheet: ir.extractedRange,
          source: ir.sheet + '!' + ir.cell,
          context: 'IMPORTRANGE formula: ' + ir.formula,
          description: '',
          status: irStatus
        });
      }
    }
    
    // =========================================
    // STEP 4b: Apply usage map to ALL resources
    // =========================================
    console.log('[' + functionName + '] Applying IMPORTRANGE usage to all resources...');
    for (var i = 0; i < allResources.length; i++) {
      var resource = allResources[i];
      var resourceId = resource.id;
      
      // Check if this resource ID has IMPORTRANGE usage
      if (usageMap[resourceId]) {
        var usages = usageMap[resourceId];
        var usageStrings = usages.map(function(u) {
          return u.sheet + '!' + u.cell + ' → ' + u.range;
        });
        resource.importrangeUsage = usageStrings.join('; ');
      } else {
        resource.importrangeUsage = '';
      }
    }
    
    // =========================================
    // STEP 5: Generate AI descriptions
    // =========================================
    console.log('[' + functionName + '] Generating AI descriptions for ' + allResources.length + ' resources...');
    ss.toast('Generating AI descriptions (' + allResources.length + ' resources)...', 'Resource Scanner', -1);
    
    for (var i = 0; i < allResources.length; i++) {
      var resource = allResources[i];
      
      // Generate description
      resource.description = _generateResourceDescription_(resource);
      
      // Rate limiting to avoid quota issues
      Utilities.sleep(500);
      
      // Progress update every 5 resources
      if ((i + 1) % 5 === 0) {
        console.log('[' + functionName + '] Processed ' + (i + 1) + '/' + allResources.length + ' resources');
        SpreadsheetApp.flush();
      }
    }
    
    // =========================================
    // STEP 6: Write to EXT_RESOURCE_KEY sheet
    // =========================================
    console.log('[' + functionName + '] Writing results to EXT_RESOURCE_KEY sheet...');
    _writeToResourceKeySheet_(allResources);
    
    recordsAdded = allResources.length;
    
    var duration = (new Date() - startTime) / 1000;
    console.log('[' + functionName + '] Scan complete. Found ' + recordsAdded + ' resources in ' + duration + 's');
    ss.toast('Scan complete! Found ' + recordsAdded + ' external resources.', 'Resource Scanner', 5);
    
  } catch (error) {
    errorMessage = error.message;
    result = 'Fail';
    console.error('[' + functionName + '] Error: ' + errorMessage);
    ss.toast('Error: ' + errorMessage, 'Resource Scanner', 10);
  }
  
  // Pattern 6 Logging
  var duration = (new Date() - startTime) / 1000;
  try {
    var refreshSheet = ss.getSheetByName('Refresh');
    if (refreshSheet) {
      refreshSheet.appendRow([functionName, new Date(), recordsAdded, duration, result, errorMessage]);
    }
  } catch (e) {
    console.log('[' + functionName + '] Failed to log to Refresh sheet: ' + e.message);
  }
  
  return result;
}