/**
 * =============================================================
 * FILE: Config.gs
 * PURPOSE: Configuration and Schema for InFocus AI
 * =============================================================
 */

const INFOCUS_CONFIG = {
  // Master Data Source
  MASTER_DATA: {
    sheetName: 'STATCORE',
    keyCol: 'A',           // RID column
    helperCol: 'BE',       // Where AI formula is injected (TRUE/FALSE filter result)
    managerCol1: 'N',      // Account Manager (Col N = index 13)
    managerCol2: 'AU',     // Secondary AM column (Col AU = index 46)
    headerRow: 2
  },
  
  // Sort Source (Original order)
  SORT_SOURCE: {
    sheetName: 'RID DISTRO',
    headerRow: 1           // Row 1 contains Manager Names as column headers
  },
  
  // Target (Active Dashboard)
  TARGET: {
    managerCell: 'B2',     // Cell containing Manager Name
    dataStartCell: 'C3',   // Where RID list begins
    dataCol: 'C'           // Column containing RIDs
  }
};

/**
 * DATA_KEY_SCHEMA - Hardcoded schema for AI prompt construction
 * Maps field names to their locations and definitions
 * CRITICAL: Includes explicit COLUMN letters to prevent AI hallucination
 */
const DATA_KEY_SCHEMA = `
SECTION, COLUMN, INTOUCH NAME, POSSIBLE VARIABLES, DEFINITION
STATCORE, A, RID, , Unique restaurant identifier
STATCORE, K, Current Term End Date, , Contract term end date
STATCORE, C, Account ID, , Salesforce Account ID
STATCORE, D, Parent Account ID, , Salesforce Parent Account ID
STATCORE, E, Account Name, , Restaurant Name
STATCORE, F, Parent Account, , Group/Brand Name
STATCORE, G, Metro, , Metro Area
STATCORE, H, Macroname, , Macro Area (City District)
STATCORE, I, Status, "Active, Pending Cancellation, Hibernated", Lifecycle status
STATCORE, J, Account_Status, "Active Customer, Termination Pending, Locked Out", SFDC Status
STATCORE, L, Restaurant Status, "Reserve Now, Closed Temporarily, Seasonal", Operational Posture
STATCORE, M, Target Zipcode, "FALSE, TRUE", Target ZIP flag
STATCORE, N, Account Manager, , Assigned AM
STATCORE, O, Inside Sales Representative, , Assigned ISR
STATCORE, P, Payment Method, "Non - Auto Pay, Auto Pay - Credit Card", Billing config
STATCORE, Q, Ordering Systems, , Third-party ordering systems
STATCORE, R, Total Due, , Outstanding Balance
STATCORE, S, Past Due, , Overdue Amount
STATCORE, T, Customer Since, , Partnership Start Date
STATCORE, U, Exclusive Pricing, "Freemium, Pro/Core, Basic/OTC, Flex 1.0", Pricing Model
STATCORE, V, Price, , Per-cover price
STATCORE, W, System Status, "Reserve Now, Decline Online, Hibernated", Aggregated Rule Status
STATCORE, X, System Type, "Core, Pro, Basic, Guest Center, Network Access", System Type
STATCORE, Y, Standard / Direct Cvrs, , Direct Source Covers
STATCORE, Z, Google / Direct Cvrs, , Google Covers (Split)
STATCORE, AA, Standard Exposure Cvrs, , Non-promoted Covers
STATCORE, AB, Instant Booking, Instant Booking, IB Live Flag
STATCORE, AC, Private Dining, "FALSE, TRUE", PD Eligibility
STATCORE, AD, System Of Record, "OpenTable, Resy, SevenRooms, Toast", Primary System
STATCORE, AE, Stripe Status, "Enabled, Restricted, Rejected", Stripe Status
STATCORE, AF, Rest. Quality, "Normal, Top [NOM], Elite[NOM], Icon⭐", Quality/Awards
STATCORE, AG, Contract Alerts, "EXPIRED MM-YY, EXP. IN - XXD", Contract expiration warning
STATCORE, AH, Zero Activity, "0-Fullbook, 0-Online, 0-Restref, 0-InHouse", Zero bookings flag (L30 Days)
DISTRO, A, RID, , RID in Distro
DISTRO, B, Shift w/MAX CAP, Yes, Capacity Enforced
DISTRO, C, Active XP, Yes, Active Experience
DISTRO, D, Active PI, "PR/CP, BP", PI Campaigns Active
DISTRO, E, CVR Last Month – RestRef, , RestRef Covers (LM)
DISTRO, F, CVR Last Month – Direct, , Direct Covers (LM)
DISTRO, G, CVR Last Month – Discovery, , Discovery Covers (LM)
DISTRO, H, CVR Last Month – Phone/Walkin, , Phone/Walkin Covers (LM)
DISTRO, I, CVR Last Month – Network, , Direct + Discovery Covers (LM)
DISTRO, J, CVR Last Month – Fullbook, , All Sources Covers (LM)
DISTRO, K, CVR Last Month – Google, , Google Covers (LM)
DISTRO, L, CVRs Last Month – Total PI, , Total PI Covers (LM)
DISTRO, M, CVRs 12m Avg. – FullBook, , 12m Avg Fullbook
DISTRO, N, Revenue – Total 12m Avg., , 12m Avg Total Revenue
DISTRO, O, Revenue – Subs Last Month, , Subscription Revenue (LM)
DISTRO, P, Revenue – Total Last Month, , Total Revenue (LM)
DISTRO, Q, CVR - Network YoY%, , Network Covers Year-Over-Year %
DISTRO, R, CVR - Fullbook YoY%, , Fullbook Covers Year-Over-Year %
DISTRO, S, PI Rev Share %, , % Revenue from PI
`;
