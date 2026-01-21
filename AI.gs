/**
 * =============================================================
 * FILE: AI.gs
 * PURPOSE: AI Prompt Construction and Gemini API Integration
 * =============================================================
 */

/**
 * buildInFocusPrompt() - Constructs the full AI prompt for Gemini
 * 
 * Components:
 * A. Role & Goal
 * B. Data Map (Schema)
 * C. Temporal Anchor (Today's Date)
 * D. Business Thesaurus (Ambiguity Solver)
 * E. Output Format (JSON)
 * 
 * @param {string} userQuery - Natural language query from user
 * @returns {string} Full prompt for AI
 */
function buildInFocusPrompt(userQuery) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  // A. Role & Goal
  const rolePrompt = `You are a Google Sheets Formula Expert. Your goal is to write a filtering ARRAYFORMULA for Row 3 of the 'STATCORE' sheet.
  
CRITICAL: You must use Boolean Arithmetic for logic. DO NOT use AND() or OR() functions inside ARRAYFORMULA, as they aggregate the entire range into a single result.`;

  // B. Data Map
  const dataMapPrompt = `## DATA SCHEMA
${DATA_KEY_SCHEMA}

**Important**: 
- STATCORE data starts at Row 3 (Row 2 is headers)
- Use ARRAYFORMULA to apply logic to all rows
- Return TRUE/FALSE for each row
- Reference columns as: G3:G (not G:G) to start from row 3`;

  // C. Temporal Anchor
  const datePrompt = `## DATE CONTEXT
Today's Date is: ${today}

Calculate 'Last Month', 'Recent', or 'Expired' relative to this date.`;

  // D. Business Thesaurus
  const thesaurusPrompt = `## BUSINESS LOGIC DEFAULTS

Apply these logic defaults:

* **'Active'**: Status = 'Active' (Ignore 'Pending').
* **'Best' / 'Top'**: Sort by 'Total Revenue (monthly)' Descending.
* **'Risk' / 'Expired'**: Check column 'Contract Alerts' (AG) for 'EXP' OR 'No Bookings' (AH) is not empty.
* **'Zero Activity' / 'Dead'**: 'No Bookings' (AH) is not empty.
* **Cross-Tab Data**: If the user asks for Revenue/Covers (DISTRO fields), use XLOOKUP(A3:A, 'RID DISTRO'!A:A, [Target Range]).`;

  // E. Output Format
  const outputPrompt = `## OUTPUT FORMAT

Return ONLY a JSON object:

{ "formula": "=...", "logic_summary": "Filtering for...", "confidence": "High" }

## FORMULA RULES (STRICT)
1. **NO AND() / OR()**: Use \`*\` for AND, \`+\` for OR.
   - BAD: \`=ARRAYFORMULA(AND(G3:G="Denver", I3:I="Active"))\`
   - GOOD: \`=ARRAYFORMULA((G3:G="Denver") * (I3:I="Active"))\`
2. **Handle Empty Rows**: Always wrap in \`IF(A3:A="", FALSE, ...)\`.
3. **Case Insensitive**: Use \`REGEXMATCH\` with \`(?i)\` flag or \`LOWER()\`.
   - Example: \`REGEXMATCH(G3:G, "(?i)wine country")\`
4. **Boolean Result**: The formula MUST return TRUE or FALSE for every row.

## EXAMPLES
User: "Show me active Pro accounts in Denver"
Formula: \`=ARRAYFORMULA(IF(A3:A="", FALSE, (G3:G="Denver") * (I3:I="Active") * (REGEXMATCH(U3:U, "(?i)Pro"))))\`

User: "Expired contracts in LA"
Formula: \`=ARRAYFORMULA(IF(A3:A="", FALSE, (REGEXMATCH(G3:G, "(?i)Los Angeles|LA")) * (REGEXMATCH(AG3:AG, "(?i)EXP"))))\`
`;

  // Full Prompt Assembly
  const fullPrompt = `${rolePrompt}

${dataMapPrompt}

${datePrompt}

${thesaurusPrompt}

${outputPrompt}

## USER REQUEST
"${userQuery}"`;

  return fullPrompt;
}

/**
 * callGeminiAPI() - Sends prompt to Gemini and returns parsed response
 * 
 * @param {string} userQuery - The natural language query from user
 * @returns {Object} { success: boolean, formula: string, logic_summary: string, confidence: string, error: string }
 */
function callGeminiAPI(userQuery) {
  const functionName = 'callGeminiAPI';
  Logger.log(`[${functionName}] Processing query: ${userQuery}`);
  
  try {
    // Get API key from Script Properties
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in Script Properties. Please add it in Project Settings.');
    }
    
    // Build the full prompt
    const fullPrompt = buildInFocusPrompt(userQuery);
    
    // Gemini API endpoint (using Gemini 2.0 Flash for speed/cost)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // Request payload
    const payload = {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.1, // Very low temp for strict syntax adherence
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096
      }
    };
    
    // Make API request
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log(`[${functionName}] Calling Gemini API...`);
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      const errorData = JSON.parse(responseText);
      throw new Error(`Gemini API error (${responseCode}): ${errorData.error?.message || responseText}`);
    }
    
    // Parse Gemini response
    const geminiResponse = JSON.parse(responseText);
    let generatedText = null;
    
    if (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
      generatedText = geminiResponse.candidates[0].content.parts[0].text;
    }
    
    if (!generatedText) {
      throw new Error('No text generated by Gemini.');
    }
    
    Logger.log(`[${functionName}] Raw Gemini response: ${generatedText}`);
    
    // Parse the JSON from Gemini's response
    const parsed = parseAIResponse(generatedText);
    
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
    return {
      success: true,
      formula: parsed.formula,
      logic_summary: parsed.logic_summary,
      confidence: parsed.confidence,
      error: null
    };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return {
      success: false,
      formula: "",
      logic_summary: "",
      confidence: "",
      error: error.message
    };
  }
}

/**
 * parseAIResponse() - Parses the AI response JSON
 * @param {string} responseText - Raw AI response
 * @returns {Object} { formula: string, logic_summary: string, confidence: string, error: string }
 */
function parseAIResponse(responseText) {
  try {
    // Try to extract JSON from response
    let jsonStr = responseText;
    
    // Handle markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      formula: parsed.formula || "",
      logic_summary: parsed.logic_summary || "No summary provided",
      confidence: parsed.confidence || "Unknown",
      error: null
    };
    
  } catch (error) {
    Logger.log("[parseAIResponse] Parse error: " + error.message);
    return {
      formula: "",
      logic_summary: "",
      confidence: "",
      error: "Failed to parse AI response: " + error.message
    };
  }
}

/**
 * runInFocusQuery() - Main entry point for sidebar
 * Orchestrates: AI call → Formula injection → Sync filtered accounts
 * 
 * @param {string} userQuery - Natural language query
 * @returns {Object} { success: boolean, count: number, logic_summary: string, confidence: string, message: string }
 */
function runInFocusQuery(userQuery) {
  const functionName = 'runInFocusQuery';
  const startTime = new Date();
  Logger.log(`[${functionName}] Starting with query: ${userQuery}`);
  
  try {
    // Step 1: Validate the active sheet
    const validation = validateInFocusSheet();
    if (!validation.isValid) {
      return {
        success: false,
        count: 0,
        logic_summary: "",
        confidence: "",
        message: validation.error
      };
    }
    
    // Step 2: Call Gemini API
    const aiResult = callGeminiAPI(userQuery);
    if (!aiResult.success) {
      return {
        success: false,
        count: 0,
        logic_summary: "",
        confidence: "",
        message: "AI Error: " + aiResult.error
      };
    }
    
    // Step 3: Inject formula into STATCORE Col BE
    const injectResult = injectAIFormula(aiResult.formula);
    if (!injectResult.success) {
      return {
        success: false,
        count: 0,
        logic_summary: aiResult.logic_summary,
        confidence: aiResult.confidence,
        message: injectResult.message
      };
    }
    
    // Step 4: Wait for formula to calculate
    SpreadsheetApp.flush();
    Utilities.sleep(500); // Brief pause for formula evaluation
    
    // Step 5: Sync filtered accounts to active sheet
    const syncResult = syncFilteredAccounts();
    
    // Log to Refresh sheet
    const duration = (new Date() - startTime) / 1000;
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const refreshSheet = ss.getSheetByName('Refresh');
      if (refreshSheet) {
        refreshSheet.appendRow([functionName, new Date(), syncResult.count, duration, syncResult.success ? "Success" : "Fail", userQuery]);
      }
    } catch (logError) {
      Logger.log(`[${functionName}] Logging error: ${logError.message}`);
    }
    
    return {
      success: syncResult.success,
      count: syncResult.count,
      logic_summary: aiResult.logic_summary,
      confidence: aiResult.confidence,
      message: syncResult.message,
      formula: aiResult.formula  // Include for debugging
    };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return {
      success: false,
      count: 0,
      logic_summary: "",
      confidence: "",
      message: "Error: " + error.message
    };
  }
}
