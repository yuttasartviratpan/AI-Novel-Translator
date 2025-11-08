import * as fs from 'fs';
import {FILE_NAME} from './environments'

const file: string = fs.readFileSync(FILE_NAME, 'utf8');
const items: string[] = file.split(/\r?\n/);

export const START_EPISODE = items[0]!;
export const TARGET_URL: string = items[1]!;