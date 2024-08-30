import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import OpenAI from 'openai';


const API_KEY = '' // Add your OpenAI API key here
const openai = new OpenAI({ apiKey: API_KEY });

const meetings = require('./collection.json')
let tools = []

async function writeSections() {

  for (const meeting of meetings) {

    try {
      console.log('.')
      console.log('.')
      console.log('.')
      console.log('------- ' + meeting.title + ' -------')

      tools = tools.concat(meeting.tools)
     
    } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  fs.writeFileSync('tools.json', JSON.stringify(tools, null, 2)); 
  console.log(chalk.green(`done`));
}

writeSections();
