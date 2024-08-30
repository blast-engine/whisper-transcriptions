import OpenAI from "openai";
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { transcribeMultipleFiles } from '../act/transcribe';
import chalk from 'chalk';

dotenv.config();

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('apiKey', {
      type: 'string',
      describe: 'Your OpenAI API key',
      demandOption: true,
    })
    .option('audio', {
      type: 'string',
      describe: 'Path to an audio file or a glob pattern to match multiple audio files',
      demandOption: true,
    })
    .argv as any;

  const command = process.argv.slice(2).join(' ');
  console.log(chalk.blue(`Command: ${command}`));
  console.log(chalk.blue(`Arguments: ${JSON.stringify(argv, null, 2)}`));

  const apiKey = argv.apiKey || process.env.OPENAI_API_KEY;
  const audio = argv.audio;

  if (!apiKey) {
    console.error(chalk.red('Please provide the API key using --apiKey or set it in the .env file.'));
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  try {
    await transcribeMultipleFiles(openai, audio);
    console.log(chalk.blue('All files transcribed successfully.'));
  } catch (error) {
    console.error(chalk.red(`Error transcribing files: ${(error as Error).message}`));
  } finally {
    process.exit(0);  // Ensure the process exits cleanly
  }
}

main();
