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
    managerCol2: 'AU',     // Secondary AM column (Col AU = index 46) - Wait, schema says AU is "Last Updated"? 
                           // Let's check the schema provided by user.
                           // User Schema: "STATCORE, Account Manager, , Assigned AM, ACCOUNT_AM" (No col letter in schema, but usually N)
                           // User Schema: "STATCORE, Inside Sales Representative..."
                           // User Schema: "STATCORE, Last Updated" is NOT in the new schema provided in the prompt.
                           // However, the existing InFocus.js had managerCol2 as 'AU'. 
                           // The user prompt says: "Manager Columns: Col N & Col AU". 
                           // So I will stick to N and AU.
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
 */
const DATA_KEY_SCHEMA = `
SECTION, INTOUCH NAME, POSSIBLE VARIABLES, DEFINITION, COLUMN HEADER
STATCORE, RID, , Unique restaurant identifier, RID
STATCORE, Current Term End Date, , Contract term end date, CURRENT_TERM_END_DATE
STATCORE, Account ID, , Salesforce Account ID, ACCOUNT_SFDC_ID
STATCORE, Parent Account ID, , Salesforce Parent Account ID, PARENT_ID
STATCORE, Account Name, , Restaurant Name, RNAME
STATCORE, Parent Account, , Group/Brand Name, GROUPNAME
STATCORE, Metro, , Metro Area, METROAREANAME
STATCORE, Macroname, , Macro Area (City District), MACRONAME
STATCORE, Neighborhood, , Neighborhood, NBHOODNAME
STATCORE, Status, "Active, Pending Cancellation, Hibernated", Lifecycle status, STATUS
STATCORE, Account_Status, "Active Customer, Termination Pending, Locked Out", SFDC Status, ACCOUNT_STATUS
STATCORE, Restaurant Status, "Reserve Now, Closed Temporarily, Seasonal", Operational Posture, CHARM_STATUS
STATCORE, Target Zipcode, "FALSE, TRUE", Target ZIP flag, TARGET_ZIPCODE
STATCORE, Account Manager, , Assigned AM, ACCOUNT_AM
STATCORE, Inside Sales Representative, , Assigned ISR, ACCOUNT_ISR
STATCORE, Payment Method, "Non - Auto Pay, Auto Pay - Credit Card", Billing config, PAYMENT_METHOD
STATCORE, Ordering Systems, , Third-party ordering systems, ORDERING_SYSTEMS
STATCORE, Total Due, , Outstanding Balance, TOTAL_DUE
STATCORE, Past Due, , Overdue Amount, PAST_DUE
STATCORE, Customer Since, , Partnership Start Date, CUSTOMER_SINCE
STATCORE, Exclusive Pricing, "Freemium, Pro/Core, Basic/OTC, Flex 1.0", Pricing Model, EP_CURRENT
STATCORE, Price, , Per-cover price, Standard Cover Price
STATCORE, System Status, "Reserve Now, Decline Online, Hibernated", Aggregated Rule Status, Derived from CHARM/ACCOUNT/STATUS
STATCORE, System Type, "Core, Pro, Basic, Guest Center, Network Access", System Type, DR_SYS_TYPE
STATCORE, Standard / Direct Cvrs, , Direct Source Covers, DIRECT_SEATED_COVERS
STATCORE, Google / Direct Cvrs, , Google Covers (Split), GOOGLE_SEATED_COVERS
STATCORE, Standard Exposure Cvrs, , Non-promoted Covers, STANDARD_EXPERIENCE_SEATED_COVERS
STATCORE, Instant Booking, Instant Booking, IB Live Flag, ACTIVE_INSTANT_BOOKING_EXPERIENCES
STATCORE, Private Dining, "FALSE, TRUE", PD Eligibility, UNPUBLISH_DATE rule
STATCORE, System Of Record, "OpenTable, Resy, SevenRooms, Toast", Primary System, SYSTEM_OF_RECORD
STATCORE, Stripe Status, "Enabled, Restricted, Rejected", Stripe Status, STRIPE_STATUS
STATCORE, Rest. Quality, "Normal, Top [NOM], Elite[NOM], Icon⭐", Quality/Awards, RESTAURANT_QUALITY
STATCORE, Contract Alerts, "EXPIRED MM-YY, EXP. IN - XXD", Contract expiration warning, Contract Alerts
STATCORE, Zero Activity, "0-Fullbook, 0-Online, 0-Restref, 0-InHouse", Zero bookings flag (L30 Days), No Bookings
DISTRO, Shift w/MAX CAP, Yes, Capacity Enforced, Capacity flags
DISTRO, Active XP, Yes, Active Experience, ACTIVE_XP
DISTRO, Active PI, "PR/CP, BP", PI Campaigns Active, PI activity flags
DISTRO, CVR Last Month – RestRef, , RestRef Covers (LM), RESTREF_SEATED_COVERS
DISTRO, CVR Last Month – Direct, , Direct Covers (LM), DIRECT_SEATED_COVERS
DISTRO, CVR Last Month – Discovery, , Discovery Covers (LM), DISCOVERY_SEATED_COVERS
DISTRO, CVR Last Month – Phone/Walkin, , Phone/Walkin Covers (LM), PHONE / WALKIN_SEATED_COVERS
DISTRO, CVR Last Month – Network, , Direct + Discovery Covers (LM), NETWORK_SEATED_COVERS
DISTRO, CVR Last Month – Fullbook, , All Sources Covers (LM), FULLBOOK_COVERS
DISTRO, CVR Last Month – Google, , Google Covers (LM), GOOGLE_SEATED_COVERS
DISTRO, CVRs Last Month – Total PI, , Total PI Covers (LM), PI_SEATED_COVERS
DISTRO, CVRs 12m Avg. – FullBook, , 12m Avg Fullbook, FULLBOOK_COVERS (12m avg)
DISTRO, Revenue – Total 12m Avg., , 12m Avg Total Revenue, TOTAL_REVENUE (12m avg)
DISTRO, Revenue – Subs Last Month, , Subscription Revenue (LM), RECOGNIZED_SUBSCRIPTION_REVENUE
DISTRO, Revenue – Total Last Month, , Total Revenue (LM), TOTAL_REVENUE (monthly)
DISTRO, CVR - Network YoY%, , Network Covers Year-Over-Year %, Derived
DISTRO, CVR - Fullbook YoY%, , Fullbook Covers Year-Over-Year %, Derived
DISTRO, PI Rev Share %, , % Revenue from PI, Derived
`;
