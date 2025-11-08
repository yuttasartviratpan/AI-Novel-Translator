import { Page } from 'puppeteer';

// TODOS: Study how puppeteer's locator works
export async function FindNextURL(page: Page) {
    const href = await page.$eval('.navbar-wrapper > div:nth-child(1) > a:nth-child(5)', val => val.href);
    return href;
}


export async function FindTheContent(page: Page) {
    const content = await page.$eval('#novel_content > div:nth-child(2)', val => val.innerText);
    return content;
}