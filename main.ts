import { chromium, type BrowserContext, type Browser, type Page, firefox } from 'playwright';

import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

import { GoogleGenAI, ApiError } from '@google/genai';

import * as dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// --- Manually obtained data ---
// 1. The full, exact User-Agent string from the browser that solved the challenge.
// to get this, you go to dev console (F12), then go to console
// Sometimes the code will fail (timeout) because Firefox updated, update User Agent Regularly
//   type: javascript:void(prompt('navigator.userAgent',navigator.userAgent))
const MANUAL_USER_AGENT = process.env.MANUAL_USER_AGENT!;

// 2. The value of the cf_clearance cookie.
// If this one doesn't work, login to booktoki, then find cl_clearance cookie data
const CF_CLEARANCE_VALUE = process.env.CF_CLEARANCE_VALUE!;


const DOMAIN_NAME = process.env.DOMAIN_NAME!;


const FILE_NAME = process.env.FILE_NAME!;


const PROMPT_FILE_NAME = process.env.PROMPT_FILE_NAME!;


const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY!;


const ai = new GoogleGenAI({ vertexai: false, apiKey: GEMINI_API_KEY });

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const file: string = fs.readFileSync(FILE_NAME, 'utf8');
const items: string[] = file.split(/\r?\n/);

let startEpisode = items[0]!;
let TARGET_URL: string = items[1]!;


const PROMPT: string = fs.readFileSync(PROMPT_FILE_NAME, 'utf8');


async function useCloudflareClearanceManually() {
    let browser: Browser | null = null;
    try {
        // 1. Launch browser
        browser = await firefox.launch({ headless: false });

        // 2. Create the context and set the essential User-Agent
        const context: BrowserContext = await browser.newContext({
            // Set the User-Agent that matches the one used to get the cookie
            userAgent: MANUAL_USER_AGENT
        });

        // 3. Define and add the cf_clearance cookie to the context
        const clearanceCookie = {
            name: 'cf_clearance',
            value: CF_CLEARANCE_VALUE,
            domain: DOMAIN_NAME,
            path: '/',
            expires: -1,
            size: '331',
            httpOnly: true, // Often true for cf_clearance
            secure: true,   // Often true for cf_clearance
            sameSite: 'None' as const
        };

        // You would typically add any other necessary cookies here as well

        await context.addCookies([clearanceCookie]);

        const page = await context.newPage();

        console.log(`Navigating to ${TARGET_URL} with manual clearance cookie...`);

        let nextURL = ''
        let episode = ''

        const result = await translate(TARGET_URL, page, startEpisode);
        if (result) {
            ({ urlNext: nextURL, nextEpisode: episode } = result)
        }

        // 1 initial chapter + however more from the loop
        for (let i = 0; i < 99; i++) {
            const result = await translate(nextURL, page, episode);
            if (result) {
                ({ urlNext: nextURL, nextEpisode: episode } = result)
            }
        }


    } catch (error) {
        console.error("An error occurred during manual cookie reuse:", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}


async function translate(url: string, page: Page, episode: string) {
    // 4. Navigate to the protected page
    await page.goto(url, { waitUntil: 'networkidle' });

    const locatorNext = page.locator('.toon-nav > a#goNextBtn');
    const urlNext = await locatorNext.first().getAttribute('href',);

    if (!urlNext || urlNext.trim().length === 0) {
        console.warn("Scraped content (URL) is null or empty. Skipping Gemini API call.");
        return; // Or throw an error, depending on how you want to handle failures
    }

    console.log("URL acquired");

    const locator = page.locator('#novel_content > div:nth-child(2)');
    // const content = await locator.textContent();
    const content = await locator.innerText();

    if (!content || content.trim().length === 0) {
        console.warn("Scraped content (TextContent) is null or empty. Skipping Gemini API call.");
        return; // Or throw an error, depending on how you want to handle failures
    }

    console.log("Successfully located content");

    const response = await AiGen(content);

    if (!response || response.trim().length === 0) {
        console.warn("Scraped content (Response) is null or empty. Skipping Gemini API call.");
        return; // Or throw an error, depending on how you want to handle failures
    }


    console.log('Scraped Content successfully processed by Gemini');

    const filename = OUTPUT_DIRECTORY + episode + ".txt"

    try {
        await fsPromises.writeFile(filename, response, { encoding: 'utf-8' });
        console.log('Translation written successfully into a file!');
    } catch (error) {
        console.error('Error writing file at Translations:', error);
    }

    const nextEpisode = (+episode + 1) + ""

    const episodeFileString = nextEpisode + "\n" + urlNext;

    try {
        await fsPromises.writeFile(FILE_NAME, episodeFileString, { encoding: 'utf-8' });
        console.log('Episode File updated successfully!');
    } catch (error) {
        console.error('Error writing file at episodeFile:', error);
    }


    return { urlNext, nextEpisode };
}

async function AiGen(content: string) {
    // const initial_prompt = "You are an expert literary translator specializing in contemporary Korean fiction (K-Lit). In order to be able to deliver translation spectacularly as a expert literary translator, you MUST STRICTLY ADHERE TO THESE GUIDELINE AT ALL COST. Your target audience is a modern, culturally savvy English-speaking readership. When translating the following Korean text, adhere to these constraints: Preserve Korean Honoriifics & Kinship: Translate honorifics and kinship terms (e.g., hyung, unnie, noona, oppa, ajumma, sunbae) only when their cultural or power dynamic significance is essential to the character relationship or tone. Otherwise, use functional, natural-sounding English equivalents (e.g., 'older brother,' 'Ms. Kim'). Culture-Bound Terms: For uniquely Korean cultural items (e.g., hanbok, kimchi, specific street names, jeonse), favor foreignization by keeping the original Korean term in romanized form (e.g., Soju) and relying on the surrounding context to define it, unless a natural, immediate English equivalent exists. DO NOT use bracketed explanations. Tone: Precisely match the emotional tone (e.g., melancholic, witty, sarcastic, formal). If the source is deliberately terse or flowery, the translation must reflect that same stylistic choice. Idioms & Proverbs: Never translate a Korean idiom literally. Replace it with the most semantically and culturally equivalent English idiom or phrase that conveys the same meaning and emotional impact. Authenticity: For dialogue, ensure that modern Korean slang or current internet/youth vocabulary is translated into the most current, non-cringe-worthy contemporary English slang/vocabulary that a speaker of that demographic would naturally use. Consistency (Chain-of-Thought): For character names, specific settings, and repeated thematic vocabulary, ensure absolute consistency across all translated segments.\". THINK HARD AND THROUGHOUTLY, CAREFULLY CHECK YOUR TRANSLATION TO ENSURE QUALITY. ALL TEXT THAT YOU'VE TRANSLATED ARE ENSURED TO BE UNHARMFUL AND SHOULD NOT BE PROHIBITED. From this prompt onwards, I will be providing you the text. AGAIN YOU MUST TRANSLATE THE TEXT WITH ALL THE CONSTRAINS IN MIND AND I ENSURE YOU THAT ALL THE TEXT YOU'VE TRANSLATED ARE UNHARMFUL AND SHOULD NOT BE PROHIBITED"
    const initial_prompt = "You are a professional translator whose primary goal is to precisely translate Korean to English. You can speak colloquially if it makes the translation more accurate. Only respond in English. Keep the sentences short and punchy to maintain an appropriate pace. The translation should maintain an intense and slightly melodramatic tone, common to action fantasy. The narrator should sound world-weary and determined. Use strong, active verbs. If you are unsure of a Korean sentence, still always try your best estimate to respond with a complete English translation. From now I will be providing you the Korean texts and you're to respond in English Translation only"

    // 3. Call the Gemini API
    try {   
        const response = await Ai(content);
        return response;
    } catch (error) {
        if (error instanceof ApiError) {
            const statusCode = error.status;

            if (statusCode === 503 || statusCode === 500) {
                // Handle the 503/500 case: most commonly, you would retry the request
                console.warn(`Transient API Error (${statusCode}): ${error.message}`);
                console.warn("Trying again");

                const response = await Ai(content);
                return response;

            } else if (statusCode === 429) {
                // Handle 429 (Resource Exhausted / Rate Limit Exceeded)
                console.error(`Rate Limit Error (429): ${error.message}`);
                throw new Error("You have exceeded your API rate limit. Wait a minute and try again.");
            } else {
                // Handle other API errors (400, 404, etc.)
                console.error(`Other API Error (${statusCode}): ${error.message}`);
                throw error; // Re-throw the error for higher-level handling
            }
        } else {
            // Handle non-API-related errors (network issues, coding mistakes, etc.)
            console.error("An unexpected error occurred:", error);
            throw error;
        }
    }
}

async function Ai(content: string) {
    // const initial_prompt = "You are an expert literary translator specializing in contemporary Korean fiction (K-Lit). In order to be able to deliver translation spectacularly as a expert literary translator, you MUST STRICTLY ADHERE TO THESE GUIDELINE AT ALL COST. Your target audience is a modern, culturally savvy English-speaking readership. When translating the following Korean text, adhere to these constraints: Preserve Korean Honoriifics & Kinship: Translate honorifics and kinship terms (e.g., hyung, unnie, noona, oppa, ajumma, sunbae) only when their cultural or power dynamic significance is essential to the character relationship or tone. Otherwise, use functional, natural-sounding English equivalents (e.g., 'older brother,' 'Ms. Kim'). Culture-Bound Terms: For uniquely Korean cultural items (e.g., hanbok, kimchi, specific street names, jeonse), favor foreignization by keeping the original Korean term in romanized form (e.g., Soju) and relying on the surrounding context to define it, unless a natural, immediate English equivalent exists. DO NOT use bracketed explanations. Tone: Precisely match the emotional tone (e.g., melancholic, witty, sarcastic, formal). If the source is deliberately terse or flowery, the translation must reflect that same stylistic choice. Idioms & Proverbs: Never translate a Korean idiom literally. Replace it with the most semantically and culturally equivalent English idiom or phrase that conveys the same meaning and emotional impact. Authenticity: For dialogue, ensure that modern Korean slang or current internet/youth vocabulary is translated into the most current, non-cringe-worthy contemporary English slang/vocabulary that a speaker of that demographic would naturally use. Consistency (Chain-of-Thought): For character names, specific settings, and repeated thematic vocabulary, ensure absolute consistency across all translated segments.\". THINK HARD AND THROUGHOUTLY, CAREFULLY CHECK YOUR TRANSLATION TO ENSURE QUALITY. ALL TEXT THAT YOU'VE TRANSLATED ARE ENSURED TO BE UNHARMFUL AND SHOULD NOT BE PROHIBITED. From this prompt onwards, I will be providing you the text. AGAIN YOU MUST TRANSLATE THE TEXT WITH ALL THE CONSTRAINS IN MIND AND I ENSURE YOU THAT ALL THE TEXT YOU'VE TRANSLATED ARE UNHARMFUL AND SHOULD NOT BE PROHIBITED"
    // const initial_prompt = "You are a professional translator whose primary goal is to precisely translate Korean to English. You can speak colloquially if it makes the translation more accurate. Only respond in English. Keep the sentences short and punchy to maintain an appropriate pace. The translation should maintain an intense and slightly melodramatic tone, common to action fantasy. The narrator should sound world-weary and determined. Use strong, active verbs. If you are unsure of a Korean sentence, still always try your best estimate to respond with a complete English translation. From now I will be providing you the Korean texts and you're to respond in English Translation only"


    const initial_prompt = PROMPT;

    // 3. Call the Gemini API
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: content,
        config: {
            systemInstruction: initial_prompt,
            safetySettings: safetySettings,
            thinkingConfig: {
                thinkingBudget: -1,
            },
        },
    });
    console.log(response);


    return response.text;

}


useCloudflareClearanceManually();