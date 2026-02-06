/**
 * =============================================================
 * FILE: Main.gs (Robust UI Launchers)
 * =============================================================
 */

// =============================================================
// CENTRAL LOGGING CONFIGURATION
// All logs go to this master spreadsheet for fleet-wide tracking
// =============================================================
const CENTRAL_LOG_CONFIG = {
  MASTER_SPREADSHEET_ID: '1yiqY-5XJY2k86RXDib2zCveR9BNbG7FRdasLUFYYeWY',
  SHEETS: {
    LOG: {
      name: 'Log',
      headers: ['User', 'Timestamp', 'Operation', 'Worksheet Name']
    },
    REFRESH: {
      name: 'Refresh',
      headers: ['Function', 'Timestamp', 'Worksheet Name', 'Records', 'Duration', 'Result', 'Error']
    },
    API_USAGE: {
      name: 'API_Usage',
      headers: ['User', 'Timestamp', 'Worksheet Name', 'Prompt Tokens', 'Response Tokens', 'Total Tokens', 'Query Type']
    },
    PROMPT_LOG: {
      name: 'Prompt_Log',
      headers: ['User', 'Timestamp', 'Worksheet Name', 'Prompt Text', 'Query Type']
    },
    FLEET_OPS: {
      name: 'Fleet_Ops',
      headers: ['User', 'Timestamp', 'Operation', 'Target', 'Success', 'Errors', 'Warnings', 'Details']
    }
  },
  MAX_ROWS: 50000
};

// --- TRIGGERS ---

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  // 1. InTouch AI Menu (User Facing)
  const mainMenu = ui.createMenu('InTouch✔ai')
    .addItem('🧠 Open Intouch AI Panel', 'BI_openSidebar');
  
  // 2. Admin Menu (Backend/Ops)
  const adminMenu = ui.createMenu('Admin Functions')
    .addItem('🚀 Open Fleet Commander', 'openAdminPanel')   
    .addSeparator();

  const amTabsSubMenu = ui.createMenu('AM Tabs')
    .addItem('Create All From Setup', 'createEmployeeTabs')
    .addItem('Delete All From Setup', 'deleteEmployeeTabs')
    .addItem('Create Single Tab (from F2)', 'createSingleEmployeeTab');
  
  const focus20SubMenu = ui.createMenu('Focus20')
    .addItem('Add RIDs from Smart Select', 'moveTrueAccountsToFocus20')
    .addItem('Remove RIDs from Smart Select', 'removeTrueAccountsFromFocus20Optimized');

  const globalFunctionsSubMenu = ui.createMenu('Global Functions')
    .addItem('🔌 Test Gemini API (Fleet)', 'testGeminiFleet');

  adminMenu.addSubMenu(amTabsSubMenu)
           .addSubMenu(focus20SubMenu)
           .addSubMenu(globalFunctionsSubMenu)
           .addSeparator()
           .addItem('Update Notes Only', 'manualUpdateNotesOnly')
           .addItem('Force Master Pipeline', 'runMasterPipeline')
           .addSeparator()
           .addItem('📋 Scan External Resources', 'scanExternalResources')
           .addItem('⚡ Reset Nightly Trigger', 'setupNightlyTrigger');

  // 3. Render Menus
  mainMenu.addToUi();
  adminMenu.addToUi();
}

function onEdit(e) {
  handleIntouchEdits(e); 
}

function installableOnOpen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  logInteraction('Session Launched');
  console.log("[installableOnOpen] ⚡ Preloading Sidebar Data...");
  refreshSidebarCache(); 
}

// --- UI LAUNCHERS (ROBUST SWITCHING) ---

function BI_openSidebar() {
  // Capture UI reference FIRST (before any other operation)
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Force any pending spreadsheet operations to complete
    SpreadsheetApp.flush();
    
    // Build HTML using template — BI_Sidebar.html uses <?!= include("BI_Script2") ?>
    // to split the JavaScript across two files (GAS has ~200KB single-file limit)
    const html = HtmlService.createTemplateFromFile('BI_Sidebar')
      .evaluate()
      .setTitle('InTouch AI')
      .setWidth(450);
    
    // Longer pause - gives browser time to fully close any existing sidebar
    Utilities.sleep(500); 
    
    // Use cached UI reference
    ui.showSidebar(html);
    
  } catch (e) {
    console.error("[BI_openSidebar] Error:", e.message, e.stack);
    ui.alert("❌ Failed to launch AI Sidebar:\n" + e.message);
  }
}

function openAdminPanel() {
  // Capture UI reference FIRST (before any other operation)
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Force any pending spreadsheet operations to complete
    SpreadsheetApp.flush();
    
    // Build HTML
    const html = HtmlService.createTemplateFromFile('AdminSidebar').evaluate()
      .setTitle('🚀 Fleet Commander')
      .setWidth(300);
    
    // Longer pause - gives browser time to fully close any existing sidebar
    Utilities.sleep(500); 
    
    // Use cached UI reference
    ui.showSidebar(html);

  } catch (e) {
    console.error("[openAdminPanel] Error:", e.message, e.stack);
    ui.alert("❌ Failed to launch Admin Sidebar:\n" + e.message);
  }
}

// --- CENTRAL LOGGING ENGINE ---

/**
 * Get or create a sheet in the central logging spreadsheet
 * @param {string} sheetKey - Key from CENTRAL_LOG_CONFIG.SHEETS (e.g., 'LOG', 'REFRESH')
 * @returns {Sheet} The logging sheet
 * @private
 */
function getCentralLogSheet_(sheetKey) {
  const config = CENTRAL_LOG_CONFIG.SHEETS[sheetKey];
  if (!config) throw new Error('Invalid sheet key: ' + sheetKey);
  
  const masterSs = SpreadsheetApp.openById(CENTRAL_LOG_CONFIG.MASTER_SPREADSHEET_ID);
  let sheet = masterSs.getSheetByName(config.name);
  
  if (!sheet) {
    sheet = masterSs.insertSheet(config.name);
    sheet.getRange(1, 1, 1, config.headers.length)
      .setValues([config.headers])
      .setFontWeight('bold')
      .setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * GLOBAL LOGGING FUNCTION
 * Logs user interactions to the central 'Log' sheet
 * @param {string} operation - The action being performed (e.g., "Session Launched", "Chat")
 * @param {Object} meta - Optional metadata
 */
function logInteraction(operation, meta = {}) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userEmail = meta.userEmail || Session.getActiveUser().getEmail();
    const fileName = ss.getName(); 
    
    const sheet = getCentralLogSheet_('LOG');
    // ['User', 'Timestamp', 'Operation', 'Worksheet Name']
    sheet.appendRow([userEmail, new Date(), operation, fileName]);
    
  } catch (err) {
    console.error(`[logInteraction] failed: ${err.message}`);
  }
}

/**
 * REFRESH LOGGING FUNCTION
 * Logs pipeline/refresh operations to the central 'Refresh' sheet
 * @param {string} functionName - Name of the function that ran
 * @param {number} recordsAdded - Number of records processed
 * @param {number} duration - Duration in seconds
 * @param {string} result - 'Success' or 'Fail'
 * @param {string} errorMessage - Error message if failed
 */
function logRefreshToCentral(functionName, recordsAdded, duration, result, errorMessage = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const fileName = ss.getName();
    
    const sheet = getCentralLogSheet_('REFRESH');
    // ['Function', 'Timestamp', 'Worksheet Name', 'Records', 'Duration', 'Result', 'Error']
    sheet.appendRow([functionName, new Date(), fileName, recordsAdded, duration, result, errorMessage]);
    
  } catch (err) {
    console.error(`[logRefreshToCentral] failed: ${err.message}`);
  }
}

/**
 * API USAGE LOGGING FUNCTION
 * Logs Gemini API token usage to the central 'API_Usage' sheet
 * @param {Object} usageData - Token usage data from Gemini response
 * @param {string} queryType - Type of query (e.g., 'chat', 'portfolio_analysis')
 */
function logApiUsage(usageData, queryType) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userEmail = Session.getActiveUser().getEmail();
    const fileName = ss.getName();
    
    const sheet = getCentralLogSheet_('API_USAGE');
    // ['User', 'Timestamp', 'Worksheet Name', 'Prompt Tokens', 'Response Tokens', 'Total Tokens', 'Query Type']
    sheet.appendRow([
      userEmail,
      new Date(),
      fileName,
      usageData.promptTokenCount || 0,
      usageData.candidatesTokenCount || 0,
      usageData.totalTokenCount || 0,
      queryType || 'chat'
    ]);
    
  } catch (err) {
    console.error(`[logApiUsage] failed: ${err.message}`);
  }
}

/**
 * PROMPT LOGGING FUNCTION
 * Logs user prompts to the central 'Prompt_Log' sheet
 * @param {string} promptText - The user's question/prompt
 * @param {string} queryType - Type of query (e.g., 'chat', 'scripted')
 * @param {string} routingSource - How the query was handled: 'scripted', 'glossary', 'cached', 'gemini', 'data-template'
 */
function logUserPrompt(promptText, queryType, routingSource) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userEmail = Session.getActiveUser().getEmail();
    const fileName = ss.getName();
    
    const sheet = getCentralLogSheet_('PROMPT_LOG');
    // ['User', 'Timestamp', 'Worksheet Name', 'Prompt Text', 'Query Type', 'Routing Source']
    sheet.appendRow([
      userEmail,
      new Date(),
      fileName,
      promptText,
      queryType || 'chat',
      routingSource || 'unknown'
    ]);
    
  } catch (err) {
    console.error(`[logUserPrompt] failed: ${err.message}`);
  }
}

/**
 * FLEET OPERATIONS LOGGING FUNCTION
 * Logs global fleet command executions to the central 'Fleet_Ops' sheet
 * @param {string} operation - Operation name (e.g., 'Deploy Update', 'Copy Sheet')
 * @param {string} target - Target of the operation (e.g., sheet name)
 * @param {Array} logs - Array of log objects with status, file, msg
 */
function logFleetOperation(operation, target, logs) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    
    // Count results
    const success = logs.filter(l => l.status === 'Success').length;
    const errors = logs.filter(l => l.status === 'Error').length;
    const warnings = logs.filter(l => l.status === 'Warning' || l.status === 'Skipped').length;
    
    // Build details summary (first few errors/warnings)
    const issues = logs.filter(l => l.status !== 'Success').slice(0, 5);
    const details = issues.map(l => `${l.file}: ${l.msg}`).join(' | ') || 'All successful';
    
    const sheet = getCentralLogSheet_('FLEET_OPS');
    // ['User', 'Timestamp', 'Operation', 'Target', 'Success', 'Errors', 'Warnings', 'Details']
    sheet.appendRow([
      userEmail,
      new Date(),
      operation,
      target || '',
      success,
      errors,
      warnings,
      details.substring(0, 500) // Truncate long details
    ]);
    
  } catch (err) {
    console.error(`[logFleetOperation] failed: ${err.message}`);
  }
}