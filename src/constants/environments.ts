import * as dotenv from 'dotenv';
dotenv.config();

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// --- Manually obtained data ---
// 1. The full, exact User-Agent string from the browser that solved the challenge.
// to get this, you go to dev console (F12), then go to console
// Sometimes the code will fail (timeout) because Firefox updated, update User Agent Regularly
//   type: javascript:void(prompt('navigator.userAgent',navigator.userAgent))
export const MANUAL_USER_AGENT = process.env.MANUAL_USER_AGENT!;

// 2. The value of the cf_clearance cookie.
// If this one doesn't work, login to booktoki, then find cl_clearance cookie data
export const CF_CLEARANCE_VALUE = process.env.CF_CLEARANCE_VALUE!;


export const DOMAIN_NAME = process.env.DOMAIN_NAME!;


export const FILE_NAME = process.env.FILE_NAME!;


export const PROMPT_FILE_NAME = process.env.PROMPT_FILE_NAME!;


export const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY!;