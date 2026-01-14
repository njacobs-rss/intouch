/**
 * =============================================================
 * FILE: BizInsights.gs
 * PURPOSE: Presentation Engine (Slides + Benchmarks + Templates)
 * ARCHITECTURE: Thick Client (Local Execution)
 * =============================================================
 */

/**
 * MAIN ENTRY POINT
 * Called by: Client-side Sidebar (via google.script.run)
 * Replaces: The old BI_createPresentation library call
 */
function createBizInsightsDeck(config) {
  const functionName = 'createBizInsightsDeck';
  const tz = Session.getScriptTimeZone();
  const timestamp = Utilities.formatDate(new Date(), tz, "MM/dd/yyyy hh:mm:ss a");

  // 🔍 DEBUG: Log incoming config to trace data flow
  console.log(`[${functionName}] Starting Deck Gen for ${config.accountName || 'Unknown'}`);
  console.log(`[${functionName}] Incoming config:`, JSON.stringify({
    accountName: config.accountName,
    rid: config.rid,
    metro: config.metro,
    macro: config.macro,
    neighborhood: config.neighborhood
  }));

  // Config Safeguards
  const cfg = Object.assign({}, config || {});
  cfg.readFromSetupIfMissing = cfg.readFromSetupIfMissing !== false;
  cfg.addLinkToStartHere = cfg.addLinkToStartHere !== false;
  cfg.sourceSpreadsheet = SpreadsheetApp.getActiveSpreadsheet(); // Force Local

  // 1. Resolve Template IDs
  let slidesTemplateId = cfg.slidesTemplateId ? String(cfg.slidesTemplateId).trim() : null;
  let sheetsTemplateId = cfg.sheetsTemplateId ? String(cfg.sheetsTemplateId).trim() : null;
  const logSheetId = cfg.logSheetId ? String(cfg.logSheetId).trim() : null;

  if (cfg.readFromSetupIfMissing) {
    const setupVals = _readSetup_(cfg.sourceSpreadsheet);
    slidesTemplateId = slidesTemplateId || setupVals.slidesTemplateId;
    sheetsTemplateId = sheetsTemplateId || setupVals.sheetsTemplateId;
  }

  // Validation
  if (!sheetsTemplateId) throw new Error("Sheets Template ID is required (check SETUP!H5).");
  if (!slidesTemplateId) throw new Error("Slides Template ID is required (check SETUP!H3).");

  const restaurantName = cfg.accountName || '[REST NAME]';
  const newSheetsName = `${restaurantName} BIZ INSIGHTS WORKSHEET_${timestamp}`;
  const newSlidesName = `${restaurantName} BIZ INSIGHTS DECK_${timestamp}`;

  try {
    // --- 2. Create New Sheet ---
    const sheetsTemplateFile = DriveApp.getFileById(sheetsTemplateId);
    const newSheetsFile = sheetsTemplateFile.makeCopy(newSheetsName);
    const newSheetsId = newSheetsFile.getId();
    const newSheets = SpreadsheetApp.open(newSheetsFile);
    
    // Cleanup Protections
    _removeProtections_(newSheets);

    // --- 3. Populate "Start Here" Info ---
    const startHereSheet = newSheets.getSheetByName('Start Here') || newSheets.getSheetByName('Start Here!');
    if (startHereSheet && cfg.rid) {
      console.log(`[${functionName}] Writing to Start Here - RID: ${cfg.rid}, Metro: ${cfg.metro}, Macro: ${cfg.macro}, Neighborhood: ${cfg.neighborhood}`);
      
      startHereSheet.getRange('D6').setValue(cfg.rid);
      
      // Write Metro (D7) - log if empty
      if (cfg.metro) {
        startHereSheet.getRange('D7').setValue(cfg.metro);
      } else {
        console.warn(`[${functionName}] WARNING: Metro is empty/null!`);
      }
      
      // Write Macro (D8) - log if empty
      if (cfg.macro) {
        startHereSheet.getRange('D8').setValue(cfg.macro);
      } else {
        console.warn(`[${functionName}] WARNING: Macro is empty/null!`);
      }
      
      // Write Neighborhood (D9) - fallback to macro if empty
      if (cfg.neighborhood) {
        startHereSheet.getRange('D9').setValue(cfg.neighborhood);
      } else if (cfg.macro) {
        console.log(`[${functionName}] Neighborhood empty, using Macro as fallback for D9`);
        startHereSheet.getRange('D9').setValue(cfg.macro);
      } else {
        console.warn(`[${functionName}] WARNING: Neighborhood is empty/null and no Macro fallback!`);
      }
    } else {
      console.warn(`[${functionName}] WARNING: Could not find 'Start Here' sheet or RID is missing!`);
    }

    // --- 4. Populate Benchmark Data (CRITICAL RESTORATION) ---
    _populateBenchmarks_(newSheets, cfg.metro);

    // --- 5. Create New Slides ---
    const slidesTemplateFile = DriveApp.getFileById(slidesTemplateId);
    const newSlidesFile = slidesTemplateFile.makeCopy(newSlidesName);
    const newSlidesId = newSlidesFile.getId();

    const newSheetsUrl = newSheetsFile.getUrl();
    const newSlidesUrl = newSlidesFile.getUrl();

    // Link Back
    if (cfg.addLinkToStartHere && startHereSheet) {
      startHereSheet.getRange('A2').setFormula(`=HYPERLINK("${newSlidesUrl}", "Open Slide Deck")`);
    }

    // --- 6. Batch Update Charts ---
    _replaceChartsInSlides_V2_Batch_(newSlidesId, newSheetsId);

    // Optional Logging
    if (logSheetId) {
      _logUsage_(logSheetId, timestamp, newSheetsName, newSlidesName, newSheetsUrl, newSlidesUrl, cfg.sourceSpreadsheet);
    }

    return { newSheetsUrl, newSlidesUrl };

  } catch (err) {
    console.error(`[${functionName}] Failed: ${err.message}`);
    throw err;
  }
}

/**
 * REPLICATED LOGIC: Connects to external benchmark sheet (1FhLSS...)
 * Filters 'metro', 'nbhd', and 'macro' tabs using the METRO NAME.
 */
function _populateBenchmarks_(targetSS, metroName) {
  const EXTERNAL_ID = '1FhLSSmCb4bEaiso8ZlUcDjPA6pD8l2eHKOkf0E1GJe4';

  if (!metroName) {
    console.warn("Skipping Benchmark Population: No Metro Name provided.");
    return;
  }

  console.log(`Starting Benchmark Population using Key: "${metroName}"`);

  try {
    const externalSS = SpreadsheetApp.openById(EXTERNAL_ID);

    const copyData = (sourceTabName, destTabName) => {
      const sourceSheet = externalSS.getSheetByName(sourceTabName);
      const destSheet = targetSS.getSheetByName(destTabName);

      if (!sourceSheet || !destSheet) return;

      const externalData = sourceSheet.getDataRange().getValues();
      const matchingRows = [];

      // 1. Add Header (Row 0)
      matchingRows.push(externalData[0]);

      // 2. Filter Logic (Column A Match)
      const filterKey = String(metroName).trim().toLowerCase();

      for (let i = 1; i < externalData.length; i++) {
        const rowKey = String(externalData[i][0]).trim().toLowerCase();
        if (rowKey === filterKey) {
          matchingRows.push(externalData[i]);
        }
      }

      // 3. Paste Data
      if (matchingRows.length > 1) {
        const maxRows = destSheet.getMaxRows();
        const maxCols = destSheet.getMaxColumns();

        // Clear from Column B (Index 2) to the end
        if (maxCols > 1) {
             destSheet.getRange(1, 2, maxRows, maxCols - 1).clearContent();
        }

        // Paste starting at B1
        destSheet.getRange(1, 2, matchingRows.length, matchingRows[0].length).setValues(matchingRows);
        console.log(`Populated ${destTabName} with ${matchingRows.length - 1} rows.`);
      }
    };

    // Execute copies
    copyData('metro', 'BMET');
    copyData('nbhd', 'BNHD');
    copyData('macro', 'BMAC');

  } catch (e) {
    console.error("CRITICAL ERROR in _populateBenchmarks_: " + e.message);
  }
}

/**
 * BATCH CHART REPLACEMENT
 * Swaps chart data sources from Old Sheet -> New Sheet
 */
function _replaceChartsInSlides_V2_Batch_(slidesId, newSheetsId) {
  console.log(`Batch replacing charts in Slides: ${slidesId}`);
  try {
    const presentation = Slides.Presentations.get(slidesId);
    const requests = [];

    presentation.slides.forEach(slide => {
      if (!slide.pageElements) return;
      slide.pageElements.forEach(element => {
        if (element.sheetsChart) {
          const oldObjectId = element.objectId;
          const oldChartId = element.sheetsChart.chartId;
          const { size, transform } = element;

          // 1. Delete Old
          requests.push({ deleteObject: { objectId: oldObjectId } });

          // 2. Create New Linked
          requests.push({
            createSheetsChart: {
              spreadsheetId: newSheetsId,
              chartId: oldChartId,
              linkingMode: 'LINKED',
              elementProperties: {
                pageObjectId: slide.objectId,
                size: size,
                transform: transform,
              }
            }
          });
        }
      });
    });

    if (requests.length > 0) {
      Slides.Presentations.batchUpdate({ requests: requests }, slidesId);
    }
  } catch (e) {
    console.error(`Slides API Batch Error: ${e.message}`);
    throw new Error(`Slides API failed: ${e.message}`);
  }
}

/**
 * HELPER: Read Template IDs from Setup
 */
function _readSetup_(ss) {
  const out = { slidesTemplateId: null, sheetsTemplateId: null };
  try {
    const setup = ss.getSheetByName("SETUP");
    if (!setup) return out;
    out.slidesTemplateId = String(setup.getRange("H3").getValue() || "").trim() || null;
    out.sheetsTemplateId = String(setup.getRange("H5").getValue() || "").trim() || null;
  } catch (e) { /* ignore */ }
  return out;
}

/**
 * HELPER: Remove protections from copy
 */
function _removeProtections_(ss) {
  ss.getSheets().forEach(sh => {
    try {
      sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
    } catch (e) { /* ignore */ }
  });
}

/**
 * HELPER: Usage Logger
 */
function _logUsage_(logSheetId, timestamp, sheetName, slideName, sheetUrl, slideUrl, sourceSS) {
  try {
    const email = Session.getActiveUser().getEmail();
    const sourceName = sourceSS ? sourceSS.getName() : "(unknown)";
    const logSS = SpreadsheetApp.openById(logSheetId);
    const logSheet = logSS.getSheetByName('BI Cloning Log');
    if (logSheet) {
      logSheet.appendRow([timestamp, email, sourceName, sheetName, slideName, sheetUrl, slideUrl]);
    }
  } catch (e) { /* ignore */ }
}