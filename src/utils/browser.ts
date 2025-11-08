import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

import { Page, Browser } from 'puppeteer';

import { Delay } from './delay';
import { CF_CLEARANCE_VALUE, DOMAIN_NAME } from '../constants/environments'


// Returns Browser
export async function GenerateBrowser() {
    const a = puppeteer.use(AdblockerPlugin()).use(StealthPlugin());
    const browser = await puppeteer.launch({headless: false});
    return browser
}


// Returns Page
export async function OpenNewPage(browserContext: Browser) {
    const page = await browserContext.newPage()
    return page
}


// Returns the result of going to specified url page
export async function GoToPage(page: Page, url: string) {
    const response = await page.goto(url);
    await Delay(30000);
    return response
}
