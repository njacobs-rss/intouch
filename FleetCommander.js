// =============================================================
// FILE: FleetCommander.gs
// PURPOSE: External file management (Copy, Update, Delete)
// ARCHITECTURE: Thick Client (Local Execution)
// =============================================================

// --- SECURITY GUARDRAIL ---
function assertAdminAccess() {
  // List authorized emails here (lowercase)
  var AUTHORIZED_USERS = [
    'njacobs@opentable.com' 
    // 'backup.admin@opentable.com' // Add others here if needed
  ];
  
  var currentUser = Session.getActiveUser().getEmail().toLowerCase();
  
  if (!AUTHORIZED_USERS.includes(currentUser)) {
    throw new Error("⛔ ACCESS DENIED: User '" + currentUser + "' is not authorized to run Fleet Commands.");
  }
}

// CONFIGURATION
var TARGET_FOLDER_ID = '1oqbXf4CPouogLMvlB5rzZipOwiGZyRwE'; 
var TARGET_PHRASE = 'iQ'; 

/**
 * UI TRIGGER: Open the Admin Sidebar
 */
function showSidebar() {
  var html = HtmlService.createTemplateFromFile('AdminSidebar')
    .evaluate()
    .setTitle('Fleet Commander')
    .setWidth(400); 
  SpreadsheetApp.getUi().showSidebar(html);
}

// --- HELPER FOR SIDEBAR ---
function getFilteredSheetNames() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets().map(s => s.getName());
  var setupSheet = ss.getSheetByName('Setup');
  
  // Default exclusions (Safety Net)
  var excludedNames = ['Setup', 'STATCORE', 'DISTRO', 'AdminSidebar', 'BI_Sidebar'];
  
  // Whitelist: These sheets should ALWAYS appear in dropdown, even if found in Setup columns
  var whitelistedNames = ['Manager Lens'];

  if (setupSheet && setupSheet.getLastRow() > 2) {
    // Reads Columns A (1), B (2), and C (3) to catch ALL exclusion lists
    // This covers System Lists (often Col A) and Employee Lists (Col B)
    var data = setupSheet.getRange(3, 1, setupSheet.getLastRow() - 2, 3).getValues();
    
    var sheetExclusions = data.flat()
      .map(n => n ? n.toString().trim() : '')
      .filter(n => n !== ''); // Remove empty cells
      
    excludedNames = excludedNames.concat(sheetExclusions);
  }

  // Return sheets that are NOT in the exclusion list, OR are whitelisted
  return allSheets.filter(function(sheetName) {
    var trimmedName = sheetName.trim();
    return whitelistedNames.includes(trimmedName) || !excludedNames.includes(trimmedName);
  });
}

// --- BATCH OPERATIONS ---

/**
 * SAFE UPDATE: Replaces a specific sheet in all fleet files
 * Preserves formulas by using a rename-and-replace strategy
 */
function runUpdateSheetSafe(sheetName, hideSheet) {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Scanning fleet files for '" + sheetName + "'...", "🚀 Safe Update Started", -1);

  var sourceTemplate = ss.getSheetByName(sheetName);
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];

  if (!sourceTemplate) {
    throw new Error("Source sheet '" + sheetName + "' not found in this spreadsheet.");
  }

  var sourceProtections = sourceTemplate.getProtections(SpreadsheetApp.ProtectionType.RANGE);

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
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

          // 5. Update formulas in the whole spreadsheet to point to the new sheet name 
          // (Redundant but safe if any formulas latched onto the _OLD name)
          targetSS.createTextFinder(tempName).matchFormulaText(true).replaceAllWith(sheetName);
          
          // 6. Delete the old sheet
          targetSS.deleteSheet(oldSheet);
          
          logs.push({ status: 'Success', file: file.getName(), msg: 'Updated & Reconnected' });
        } else {
           logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet not found in target' });
        }
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  ss.toast("Update Complete. check logs.", "✅ Done", 5);
  return logs;
}

/**
 * COPY NEW: Pushes a new sheet to all fleet files
 */
function runCopySheet(sourceSheetName, newSheetName, hideSheet) {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(sourceSheetName);
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];
  var protections = sourceSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        if (targetSS.getSheetByName(newSheetName)) {
           logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet already exists' });
           continue;
        }
        var newSheet = sourceSheet.copyTo(targetSS).setName(newSheetName);

        if (hideSheet === true) {
          newSheet.hideSheet();
        } else {
          newSheet.showSheet();
        }

        for (var i = 0; i < protections.length; i++) {
            var p = protections[i];
            newSheet.getRange(p.getRange().getA1Notation()).protect().setDescription(p.getDescription());
        }
        logs.push({ status: 'Success', file: file.getName(), msg: 'Sheet Copied' });
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  return logs;
}

/**
 * DELETE: Removes a sheet from all fleet files
 */
function runDeleteSheet(sheetToDelete) {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        var sheet = targetSS.getSheetByName(sheetToDelete);
        if (sheet) {
          targetSS.deleteSheet(sheet);
          logs.push({ status: 'Success', file: file.getName(), msg: 'Deleted ' + sheetToDelete });
        } else {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet not found' });
        }
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  return logs;
}

/**
 * CONFIG UPDATE: Updates Template IDs in SETUP tab
 */
function runUpdateSheet() {
  assertAdminAccess(); // Global function - requires admin
  var TEMPLATE_FOLDER_ID = '1lt4n-LZe8ufMqCkNSU-tGRs4DysEKySs'; 
  var logs = [];
  try {
    const TEMPLATE_FOLDER = DriveApp.getFolderById(TEMPLATE_FOLDER_ID);
    const TARGET_FOLDER = DriveApp.getFolderById(TARGET_FOLDER_ID);
    let SHEETS_TEMPLATE_ID, SLIDES_TEMPLATE_ID;
    
    const templateFiles = TEMPLATE_FOLDER.getFiles();
    while (templateFiles.hasNext()) {
      const file = templateFiles.next();
      if (file.getName() === "BI_Prod_Sheet") SHEETS_TEMPLATE_ID = file.getId();
      if (file.getName() === "BI_Prod_Slides") SLIDES_TEMPLATE_ID = file.getId();
    }
    
    const targetFiles = TARGET_FOLDER.getFiles();
    while (targetFiles.hasNext()) {
      const file = targetFiles.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
          file.getName().includes(TARGET_PHRASE)) {
        try {
          const spreadsheet = SpreadsheetApp.openById(file.getId());
          const sheet = spreadsheet.getSheetByName('SETUP');
          if (sheet) {
            if (SLIDES_TEMPLATE_ID) sheet.getRange('G10').setValue(SLIDES_TEMPLATE_ID);
            if (SHEETS_TEMPLATE_ID) sheet.getRange('G11').setValue(SHEETS_TEMPLATE_ID);
            logs.push({ status: 'Success', file: file.getName(), msg: 'IDs Updated' });
          } else {
            logs.push({ status: 'Skipped', file: file.getName(), msg: 'SETUP sheet not found' });
          }
        } catch (e) {
          logs.push({ status: 'Error', file: file.getName(), msg: e.message });
        }
      }
    }
  } catch (e) {
    logs.push({ status: 'Error', file: 'Config Process', msg: e.message });
  }
  return logs;
}

/**
 * FLEET DATA REFRESH: Full Pipeline - STATCORE → SYSCORE → DAGCORE
 * Iterates through all fleet files and runs the complete data pipeline
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateSTATCORE(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    // Check for timeout risk (5 min safety margin from 6 min limit)
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run full pipeline with skipChain=false (let it chain naturally)
        var result = updateSTATCORE(targetSS, false);
        
        // Optionally update notes
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'Full Pipeline: ' + result.records + ' records' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500); // Breathing room between files
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * FLEET DATA REFRESH: SYSCORE + DAGCORE (skips base STATCORE)
 * Iterates through all fleet files
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateSYSCOREWithDAGCORE(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run SYSCORE (will chain to DAGCORE)
        var result = runSYSCOREUpdates(false, targetSS);
        
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'SYSCORE+DAGCORE: ' + result.records + ' matched' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500);
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * FLEET DATA REFRESH: SYSCORE Only (skips DAGCORE)
 * Iterates through all fleet files
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateSYSCOREOnly(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run SYSCORE with skipDagcore=true
        var result = runSYSCOREUpdates(true, targetSS);
        
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'SYSCORE Only: ' + result.records + ' matched' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500);
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * FLEET DATA REFRESH: DAGCORE Only - Refreshes DISTRO sheet
 * Iterates through all fleet files (fastest option)
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateDAGCOREOnly(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run DAGCORE only
        var result = runDAGCOREUpdates(targetSS);
        
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'DAGCORE: ' + result.records + ' records' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500);
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * REFRESH EMPLOYEE TABS: Recreates AM tabs in all fleet files
 * Reads employee names from Setup sheet, deletes old tabs, creates fresh ones from Launcher
 */
function runCreateEmployeeTabs() {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        var setupSheet = targetSS.getSheetByName("Setup");
        var launcherSheet = targetSS.getSheetByName("Launcher");
        
        if (!setupSheet || !launcherSheet) {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'Missing Setup or Launcher sheet' });
          continue;
        }

        // 1. Get employee names from Setup B3:B
        var employeeNames = setupSheet.getRange("B3:B" + setupSheet.getLastRow()).getValues()
          .map(function(r) { return r[0] ? r[0].toString().trim() : ''; })
          .filter(function(name) { return name && name !== "Manager Lens"; });

        if (employeeNames.length === 0) {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'No employees in Setup' });
          continue;
        }

        // 2. Get first names for tab naming
        var firstNames = employeeNames.map(function(n) { return n.split(' ')[0]; });

        // 3. Delete existing employee tabs
        var sheetsToDelete = targetSS.getSheets().filter(function(s) { 
          return firstNames.includes(s.getName()); 
        });
        sheetsToDelete.forEach(function(s) { targetSS.deleteSheet(s); });

        // 4. Create new tabs from Launcher template
        firstNames.forEach(function(name, i) {
          var uniqueName = getUniqueSheetName_(targetSS, name);
          var copy = launcherSheet.copyTo(targetSS).setName(uniqueName);
          copy.getRange("B2").setValue(employeeNames[i]);
          targetSS.setActiveSheet(copy);
          targetSS.moveActiveSheet(1);
        });

        // 5. Set Setup as active sheet
        targetSS.setActiveSheet(setupSheet);
        
        logs.push({ status: 'Success', file: file.getName(), msg: 'Created ' + employeeNames.length + ' tabs' });
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  return logs;
}

// =============================================================
// SECTION: RANGE REPLICATOR
// PURPOSE: Push specific cell ranges across fleet files
// =============================================================

/**
 * HELPER: Get ALL sheet names (for Range Replicator target dropdown)
 * Unlike getFilteredSheetNames(), this returns everything for targeting
 */
function getAllSheetNamesForTarget() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(function(s) { return s.getName(); });
}

/**
 * HELPER: Get list of fleet files for single-file testing
 * Returns array of {name, id} objects for files matching fleet criteria
 */
function getFleetFileList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var fleetFiles = [];
  
  while (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      fleetFiles.push({
        name: file.getName(),
        id: file.getId()
      });
    }
  }
  
  // Sort alphabetically by name
  fleetFiles.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });
  
  return fleetFiles;
}

/**
 * CAPTURE: Get the currently selected range with all data
 * Returns values, formulas (where present), and rich text info
 */
function captureSelectedRange() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var range = sheet.getActiveRange();
  
  if (!range) {
    throw new Error("No range selected. Please select a range first.");
  }
  
  var a1Notation = range.getA1Notation();
  var numRows = range.getNumRows();
  var numCols = range.getNumColumns();
  
  // Get values and formulas
  var values = range.getValues();
  var formulas = range.getFormulas();
  
  // Build hybrid data: use formula if present, otherwise use value
  var data = [];
  var hasFormulas = false;
  for (var r = 0; r < numRows; r++) {
    var row = [];
    for (var c = 0; c < numCols; c++) {
      if (formulas[r][c] && formulas[r][c] !== '') {
        row.push({ type: 'formula', value: formulas[r][c] });
        hasFormulas = true;
      } else {
        row.push({ type: 'value', value: values[r][c] });
      }
    }
    data.push(row);
  }
  
  // Get first row as potential headers (for display)
  var firstRowHeaders = values[0].map(function(v) { 
    return v !== null && v !== undefined ? String(v) : ''; 
  });
  
  // Check for rich text
  var hasRichText = false;
  try {
    var richTextValues = range.getRichTextValues();
    for (var r = 0; r < numRows && !hasRichText; r++) {
      for (var c = 0; c < numCols && !hasRichText; c++) {
        var rt = richTextValues[r][c];
        if (rt) {
          var runs = rt.getRuns();
          if (runs.length > 1) {
            hasRichText = true;
          }
        }
      }
    }
  } catch (e) {
    // Rich text not supported or error - continue without it
  }
  
  return {
    sheetName: sheet.getName(),
    rangeA1: a1Notation,
    startRow: range.getRow(),
    startCol: range.getColumn(),
    numRows: numRows,
    numCols: numCols,
    data: data,
    firstRowHeaders: firstRowHeaders,
    hasFormulas: hasFormulas,
    hasRichText: hasRichText
  };
}

/**
 * VERIFY: Check headers across all fleet files
 * @param {Object} config - Configuration object with range and header info
 * @returns {Array} logs - Array of verification results per file
 */
function verifyRangeHeaders(config) {
  assertAdminAccess();
  
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var targetSheetName = config.targetSheetName || config.sheetName;
  var headerRow = parseInt(config.headerRow);
  var targetRangeA1 = config.targetRangeA1 || config.rangeA1;
  var sourceHeaders = config.firstRowHeaders;
  
  // If no header row specified, skip verification
  if (!headerRow || isNaN(headerRow)) {
    return [{ status: 'Warning', file: 'SYSTEM', msg: 'No header row specified - verification skipped' }];
  }
  
  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        var targetSheet = targetSS.getSheetByName(targetSheetName);
        
        if (!targetSheet) {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet "' + targetSheetName + '" not found' });
          continue;
        }
        
        // Parse target range to get column positions
        var rangeRef = parseA1Notation_(targetRangeA1);
        var headerRange = targetSheet.getRange(headerRow, rangeRef.startCol, 1, rangeRef.numCols);
        var targetHeaders = headerRange.getValues()[0].map(function(v) {
          return v !== null && v !== undefined ? String(v).trim() : '';
        });
        
        // Compare headers
        var matches = true;
        var mismatches = [];
        for (var i = 0; i < sourceHeaders.length; i++) {
          var srcHeader = String(sourceHeaders[i] || '').trim();
          var tgtHeader = String(targetHeaders[i] || '').trim();
          if (srcHeader !== tgtHeader) {
            matches = false;
            mismatches.push('Col ' + (i + 1) + ': "' + srcHeader + '" vs "' + tgtHeader + '"');
          }
        }
        
        if (matches) {
          logs.push({ status: 'Success', file: file.getName(), msg: 'Headers match' });
        } else {
          logs.push({ status: 'Warning', file: file.getName(), msg: 'Mismatch: ' + mismatches.slice(0, 3).join(', ') + (mismatches.length > 3 ? '...' : '') });
        }
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * PUSH: Replicate range data to all fleet files
 * @param {Object} config - Configuration with captured range data
 * @param {boolean} forceOverwrite - If true, push even if headers don't match
 * @returns {Array} logs - Array of results per file
 */
function pushRangeToFleet(config, forceOverwrite) {
  assertAdminAccess();
  
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(config.sheetName);
  var startTime = new Date();
  var processedCount = 0;
  
  var targetSheetName = config.targetSheetName || config.sheetName;
  var targetRangeA1 = config.targetRangeA1 || config.rangeA1;
  var headerRow = parseInt(config.headerRow);
  var hasHeaderRow = headerRow && !isNaN(headerRow);
  
  // Get fresh data from source range (including rich text)
  var sourceRange = sourceSheet.getRange(config.rangeA1);
  var richTextValues = null;
  try {
    richTextValues = sourceRange.getRichTextValues();
  } catch (e) {
    // Rich text not available - continue without it
  }
  
  ss.toast("Pushing range to fleet files...", "Range Replicator", -1);
  
  while (files.hasNext()) {
    var file = files.next();
    
    // Timeout protection (5 min safety margin)
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        var targetSheet = targetSS.getSheetByName(targetSheetName);
        
        if (!targetSheet) {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet "' + targetSheetName + '" not found' });
          continue;
        }
        
        // Parse target range
        var rangeRef = parseA1Notation_(targetRangeA1);
        var targetRange = targetSheet.getRange(rangeRef.startRow, rangeRef.startCol, config.numRows, config.numCols);
        
        // Verify headers if specified and not forcing
        if (hasHeaderRow && !forceOverwrite) {
          var headerRange = targetSheet.getRange(headerRow, rangeRef.startCol, 1, config.numCols);
          var targetHeaders = headerRange.getValues()[0];
          var headersMatch = true;
          for (var i = 0; i < config.firstRowHeaders.length; i++) {
            if (String(config.firstRowHeaders[i] || '').trim() !== String(targetHeaders[i] || '').trim()) {
              headersMatch = false;
              break;
            }
          }
          if (!headersMatch) {
            logs.push({ status: 'Skipped', file: file.getName(), msg: 'Header mismatch - use Force to override' });
            continue;
          }
        }
        
        // Build output arrays
        var valuesToWrite = [];
        var formulasToWrite = [];
        var hasAnyFormulas = false;
        
        for (var r = 0; r < config.data.length; r++) {
          var valueRow = [];
          var formulaRow = [];
          for (var c = 0; c < config.data[r].length; c++) {
            var cell = config.data[r][c];
            if (cell.type === 'formula') {
              valueRow.push(''); // Placeholder
              formulaRow.push(cell.value);
              hasAnyFormulas = true;
            } else {
              valueRow.push(cell.value);
              formulaRow.push('');
            }
          }
          valuesToWrite.push(valueRow);
          formulasToWrite.push(formulaRow);
        }
        
        // Write values first
        targetRange.setValues(valuesToWrite);
        
        // Write formulas where needed
        if (hasAnyFormulas) {
          for (var r = 0; r < formulasToWrite.length; r++) {
            for (var c = 0; c < formulasToWrite[r].length; c++) {
              if (formulasToWrite[r][c] !== '') {
                targetRange.getCell(r + 1, c + 1).setFormula(formulasToWrite[r][c]);
              }
            }
          }
        }
        
        // Apply rich text if available
        if (richTextValues) {
          try {
            targetRange.setRichTextValues(richTextValues);
          } catch (e) {
            // Rich text application failed - continue without it
          }
        }
        
        logs.push({ status: 'Success', file: file.getName(), msg: 'Range pushed (' + config.numRows + 'x' + config.numCols + ')' });
        processedCount++;
        
        Utilities.sleep(200); // Rate limiting
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  ss.toast("Range push complete.", "Range Replicator", 5);
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * VERIFY SINGLE FILE: Check headers for one specific fleet file (for testing)
 * @param {Object} config - Configuration object with range and header info
 * @param {string} fileId - The ID of the specific file to verify
 * @returns {Array} logs - Array with single verification result
 */
function verifyRangeHeadersSingleFile(config, fileId) {
  assertAdminAccess();
  
  var logs = [];
  var targetSheetName = config.targetSheetName || config.sheetName;
  var headerRow = parseInt(config.headerRow);
  var targetRangeA1 = config.targetRangeA1 || config.rangeA1;
  var sourceHeaders = config.firstRowHeaders;
  
  // If no header row specified, skip verification
  if (!headerRow || isNaN(headerRow)) {
    return [{ status: 'Warning', file: 'SYSTEM', msg: 'No header row specified - verification skipped' }];
  }
  
  try {
    var targetSS = SpreadsheetApp.openById(fileId);
    var fileName = targetSS.getName();
    var targetSheet = targetSS.getSheetByName(targetSheetName);
    
    if (!targetSheet) {
      logs.push({ status: 'Skipped', file: fileName, msg: 'Sheet "' + targetSheetName + '" not found' });
      return logs;
    }
    
    // Parse target range to get column positions
    var rangeRef = parseA1Notation_(targetRangeA1);
    var headerRange = targetSheet.getRange(headerRow, rangeRef.startCol, 1, rangeRef.numCols);
    var targetHeaders = headerRange.getValues()[0].map(function(v) {
      return v !== null && v !== undefined ? String(v).trim() : '';
    });
    
    // Compare headers
    var matches = true;
    var mismatches = [];
    for (var i = 0; i < sourceHeaders.length; i++) {
      var srcHeader = String(sourceHeaders[i] || '').trim();
      var tgtHeader = String(targetHeaders[i] || '').trim();
      if (srcHeader !== tgtHeader) {
        matches = false;
        mismatches.push('Col ' + (i + 1) + ': "' + srcHeader + '" vs "' + tgtHeader + '"');
      }
    }
    
    if (matches) {
      logs.push({ status: 'Success', file: fileName, msg: 'Headers match' });
    } else {
      logs.push({ status: 'Warning', file: fileName, msg: 'Mismatch: ' + mismatches.slice(0, 3).join(', ') + (mismatches.length > 3 ? '...' : '') });
    }
    
  } catch (e) {
    logs.push({ status: 'Error', file: fileId, msg: e.toString() });
  }
  
  return logs;
}

/**
 * PUSH SINGLE FILE: Replicate range data to one specific fleet file (for testing)
 * @param {Object} config - Configuration with captured range data
 * @param {string} fileId - The ID of the specific file to push to
 * @param {boolean} forceOverwrite - If true, push even if headers don't match
 * @returns {Array} logs - Array with single result
 */
function pushRangeToSingleFile(config, fileId, forceOverwrite) {
  assertAdminAccess();
  
  var logs = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(config.sheetName);
  
  var targetSheetName = config.targetSheetName || config.sheetName;
  var targetRangeA1 = config.targetRangeA1 || config.rangeA1;
  var headerRow = parseInt(config.headerRow);
  var hasHeaderRow = headerRow && !isNaN(headerRow);
  
  // Get fresh data from source range (including rich text)
  var sourceRange = sourceSheet.getRange(config.rangeA1);
  var richTextValues = null;
  try {
    richTextValues = sourceRange.getRichTextValues();
  } catch (e) {
    // Rich text not available - continue without it
  }
  
  try {
    var targetSS = SpreadsheetApp.openById(fileId);
    var fileName = targetSS.getName();
    var targetSheet = targetSS.getSheetByName(targetSheetName);
    
    ss.toast("Pushing range to " + fileName + "...", "Range Replicator (Test)", -1);
    
    if (!targetSheet) {
      logs.push({ status: 'Skipped', file: fileName, msg: 'Sheet "' + targetSheetName + '" not found' });
      return logs;
    }
    
    // Parse target range
    var rangeRef = parseA1Notation_(targetRangeA1);
    var targetRange = targetSheet.getRange(rangeRef.startRow, rangeRef.startCol, config.numRows, config.numCols);
    
    // Verify headers if specified and not forcing
    if (hasHeaderRow && !forceOverwrite) {
      var headerRange = targetSheet.getRange(headerRow, rangeRef.startCol, 1, config.numCols);
      var targetHeaders = headerRange.getValues()[0];
      var headersMatch = true;
      for (var i = 0; i < config.firstRowHeaders.length; i++) {
        if (String(config.firstRowHeaders[i] || '').trim() !== String(targetHeaders[i] || '').trim()) {
          headersMatch = false;
          break;
        }
      }
      if (!headersMatch) {
        logs.push({ status: 'Skipped', file: fileName, msg: 'Header mismatch - use Force to override' });
        return logs;
      }
    }
    
    // Build output arrays
    var valuesToWrite = [];
    var formulasToWrite = [];
    var hasAnyFormulas = false;
    
    for (var r = 0; r < config.data.length; r++) {
      var valueRow = [];
      var formulaRow = [];
      for (var c = 0; c < config.data[r].length; c++) {
        var cell = config.data[r][c];
        if (cell.type === 'formula') {
          valueRow.push(''); // Placeholder
          formulaRow.push(cell.value);
          hasAnyFormulas = true;
        } else {
          valueRow.push(cell.value);
          formulaRow.push('');
        }
      }
      valuesToWrite.push(valueRow);
      formulasToWrite.push(formulaRow);
    }
    
    // Write values first
    targetRange.setValues(valuesToWrite);
    
    // Write formulas where needed
    if (hasAnyFormulas) {
      for (var r = 0; r < formulasToWrite.length; r++) {
        for (var c = 0; c < formulasToWrite[r].length; c++) {
          if (formulasToWrite[r][c] !== '') {
            targetRange.getCell(r + 1, c + 1).setFormula(formulasToWrite[r][c]);
          }
        }
      }
    }
    
    // Apply rich text if available
    if (richTextValues) {
      try {
        targetRange.setRichTextValues(richTextValues);
      } catch (e) {
        // Rich text application failed - continue without it
      }
    }
    
    logs.push({ status: 'Success', file: fileName, msg: 'Range pushed (' + config.numRows + 'x' + config.numCols + ')' });
    ss.toast("Test push complete.", "Range Replicator", 5);
    
  } catch (e) {
    logs.push({ status: 'Error', file: fileId, msg: e.toString() });
  }
  
  return logs;
}

/**
 * HELPER: Parse A1 notation to get row/col info
 * @param {string} a1 - A1 notation like "B5:F10"
 * @returns {Object} - {startRow, startCol, numRows, numCols}
 */
function parseA1Notation_(a1) {
  // Handle single cell or range
  var parts = a1.toUpperCase().split(':');
  var startCell = parts[0];
  var endCell = parts[1] || parts[0];
  
  // Parse start cell
  var startMatch = startCell.match(/([A-Z]+)(\d+)/);
  if (!startMatch) throw new Error("Invalid A1 notation: " + a1);
  var startCol = columnLetterToNumber_(startMatch[1]);
  var startRow = parseInt(startMatch[2]);
  
  // Parse end cell
  var endMatch = endCell.match(/([A-Z]+)(\d+)/);
  if (!endMatch) throw new Error("Invalid A1 notation: " + a1);
  var endCol = columnLetterToNumber_(endMatch[1]);
  var endRow = parseInt(endMatch[2]);
  
  return {
    startRow: startRow,
    startCol: startCol,
    numRows: endRow - startRow + 1,
    numCols: endCol - startCol + 1
  };
}

/**
 * HELPER: Convert column letter(s) to number
 * @param {string} letters - Column letters like "A", "AB", "ZZ"
 * @returns {number} - Column number (1-based)
 */
function columnLetterToNumber_(letters) {
  var result = 0;
  for (var i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * Helper: Get unique sheet name for a target spreadsheet
 * (Mirrors getUniqueSheetName from Admin.gs but works on any SS)
 */
function getUniqueSheetName_(ss, baseName) {
  var name = baseName, idx = 1;
  while (ss.getSheetByName(name)) { name = baseName + " (" + idx++ + ")"; }
  return name;
}