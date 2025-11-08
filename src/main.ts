import { FILE_NAME, OUTPUT_DIRECTORY } from "./constants/environments";
import { AIResponse } from "./interfaces/ai-response";
import { GenerateBrowser, OpenNewPage, GoToPage } from "./utils/browser";
import { Delay } from "./utils/delay";
import { InitializeAI, SendAIRequest } from "./utils/gemini-ai";
import { FindNextURL, FindTheContent } from "./utils/scrapper";
import { START_EPISODE, TARGET_URL } from "./constants/tracker";


import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

async function main() {
    let episode = START_EPISODE;
    let url: string = TARGET_URL;

    const browser = await GenerateBrowser();
    const page = await OpenNewPage(browser);


    const ai = await InitializeAI();

    let breaker = false;

    while (!breaker) {
        const httpResponse = await GoToPage(page, url);

        const filename = OUTPUT_DIRECTORY + episode + ".txt"

        // If an unexpected of the unexpected error has occurred, you can try to log this value if you have no further lead.
        // const httpResponse = await GoToPage(page, url);

        const nextURL = await FindNextURL(page);
        const content = await FindTheContent(page);


        const response: AIResponse = await SendAIRequest(ai, content);

        switch (response.status) {
            case 200:
                await fsPromises.writeFile(filename, response.response, { encoding: 'utf-8' });
                url = nextURL;
                const prevEp = episode + "";
                episode = (+episode + 1) + ""
                const episodeFileString = episode + "\n" + url;
                await fsPromises.writeFile(FILE_NAME, episodeFileString, { encoding: 'utf-8' });

                console.log(`Episode ${prevEp} has been successfully saved`)
                // Delay 2 min just in case quota per min is being strict
                await Delay(120000);
                break;
            case 500:
            case 503:
                // Try again in 3 mins
                console.log(`Model is currently overloaded, taking 3 mins break`)
                await Delay(180000);
                break;
            case 429:
                console.log(`In main(): Quota has been reached: \n${response.response}`);
                breaker = true;
                break;
            default:
                breaker = true;
                break;
        }
    }

    browser.close();
}

main();