/**
 * =============================================================
 * FILE: InFocus.js
 * PURPOSE: Debugging and Test Utilities for InFocus AI
 * NOTE: Core logic has been moved to:
 * - Config.gs (Configuration & Schema)
 * - Backend.gs (Sync & Restore Logic)
 * - AI.gs (Prompt Building & API Calls)
 * =============================================================
 */

/**
 * listMetroValues() - Show unique Metro values in STATCORE
 * Run from Script Editor to see exact Metro names
 */
function listMetroValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statcore = ss.getSheetByName('STATCORE');
  if (!statcore) return;
  
  const lastRow = getTrueLastRow_(statcore, 'A');
  const metroCol = 7; // Column G
  const metros = statcore.getRange(3, metroCol, lastRow - 2, 1).getValues().flat();
  
  const uniqueMetros = [...new Set(metros.filter(m => m && m !== ''))].sort();
  
  Logger.log('Unique Metro values (' + uniqueMetros.length + '):');
  uniqueMetros.forEach(m => Logger.log('  - "' + m + '"'));
  
  SpreadsheetApp.getUi().alert('Metro Values', 'Found ' + uniqueMetros.length + ' unique metros.\n\nFirst 20:\n' + uniqueMetros.slice(0, 20).join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
  
  return uniqueMetros;
}

/**
 * debugInFocusFilter() - Check what's in the helper column after a filter
 * Run from Script Editor to see formula results
 */
function debugInFocusFilter() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statcore = ss.getSheetByName('STATCORE');
  const activeSheet = ss.getActiveSheet();
  
  if (!statcore) {
    Logger.log('STATCORE not found');
    return;
  }
  
  const helperColNum = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.helperCol); // BE = 57
  const lastRow = getTrueLastRow_(statcore, 'A');
  
  // Get the formula in BE3
  const formulaCell = statcore.getRange(3, helperColNum);
  const formula = formulaCell.getFormula();
  Logger.log('Formula in BE3: ' + formula);
  
  // Get values in helper column
  const helperValues = statcore.getRange(3, helperColNum, Math.min(lastRow - 2, 100), 1).getValues().flat();
  
  // Count TRUE values
  let trueCount = 0;
  let falseCount = 0;
  let emptyCount = 0;
  let errorCount = 0;
  
  helperValues.forEach(v => {
    if (v === true || String(v).toUpperCase() === 'TRUE') trueCount++;
    else if (v === false || String(v).toUpperCase() === 'FALSE') falseCount++;
    else if (v === '' || v === null) emptyCount++;
    else if (String(v).startsWith('#')) errorCount++;
  });
  
  Logger.log(`Helper column (first 100 rows): TRUE=${trueCount}, FALSE=${falseCount}, Empty=${emptyCount}, Errors=${errorCount}`);
  
  // Get manager name from active sheet
  const managerName = activeSheet.getRange('B2').getValue();
  Logger.log('Active Sheet Manager: ' + managerName);
  
  // Check manager columns
  const amCol1 = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol1); // N = 14
  const amCol2 = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol2); // AU = 47
  
  // Count rows matching manager
  const allData = statcore.getRange(3, 1, Math.min(lastRow - 2, 100), Math.max(amCol2, helperColNum)).getValues();
  let managerMatchCount = 0;
  let managerAndTrueCount = 0;
  
  const normalizedManager = String(managerName).toLowerCase().trim();
  
  allData.forEach((row, i) => {
    const am1 = String(row[amCol1 - 1] || '').toLowerCase().trim();
    const am2 = String(row[amCol2 - 1] || '').toLowerCase().trim();
    const helperVal = row[helperColNum - 1];
    
    if (am1 === normalizedManager || am2 === normalizedManager) {
      managerMatchCount++;
      if (helperVal === true || String(helperVal).toUpperCase() === 'TRUE') {
        managerAndTrueCount++;
      }
    }
  });
  
  Logger.log(`Manager "${managerName}" matches (first 100): ${managerMatchCount} rows`);
  Logger.log(`Manager + Helper=TRUE: ${managerAndTrueCount} rows`);
  
  // Show sample of helper column values
  Logger.log('Sample helper values: ' + JSON.stringify(helperValues.slice(0, 10)));
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `TRUE: ${trueCount}, FALSE: ${falseCount}, Empty: ${emptyCount}, Errors: ${errorCount}\nManager matches: ${managerMatchCount}, With TRUE: ${managerAndTrueCount}`,
    'InFocus Debug',
    10
  );
  
  return {
    formula: formula,
    trueCount: trueCount,
    falseCount: falseCount,
    emptyCount: emptyCount,
    errorCount: errorCount,
    managerMatchCount: managerMatchCount,
    managerAndTrueCount: managerAndTrueCount
  };
}

/**
 * testGeminiConnection() - Run this from Script Editor to test API + force reauth
 * Menu: Run > testGeminiConnection
 */
function testGeminiConnection() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // This line forces the external_request permission prompt
    const testFetch = UrlFetchApp.fetch('https://www.google.com');
    Logger.log('UrlFetchApp permission: OK');
    
    // Check for API key
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      ui.alert('❌ Missing API Key', 'GEMINI_API_KEY not found in Script Properties.\n\nGo to Project Settings > Script Properties to add it.', ui.ButtonSet.OK);
      return;
    }
    Logger.log('API Key: Found');
    
    // Test Gemini API (Gemini 3 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: 'Say "InFocus Ready" in exactly 2 words.' }] }]
    };
    
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log('Gemini Response: ' + responseText);
    
    if (code === 200) {
      const parsed = JSON.parse(responseText);
      // Try to extract text from various possible locations
      let text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text && parsed.candidates?.[0]?.content?.parts) {
        for (const part of parsed.candidates[0].content.parts) {
          if (part.text) { text = part.text; break; }
        }
      }
      
      if (text) {
        ui.alert('✅ Success!', `Gemini 2.0 Flash working!\n\nResponse: "${text.substring(0, 100)}..."`, ui.ButtonSet.OK);
        Logger.log('Gemini API: OK - ' + text);
      } else {
        ui.alert('⚠️ Partial Success', `API responded but no text found.\n\nCheck Logs (View > Logs) for full response structure.`, ui.ButtonSet.OK);
        Logger.log('Response structure: ' + JSON.stringify(parsed, null, 2));
      }
    } else {
      const error = JSON.parse(responseText);
      ui.alert('❌ API Error', `Code: ${code}\n\n${error.error?.message || responseText}`, ui.ButtonSet.OK);
    }
    
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
    Logger.log('Error: ' + e.message);
  }
}
