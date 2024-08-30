import OpenAI from "openai";
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { processAnalysis } from '../act/analyze';
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

dotenv.config();

async function processFile(openai: OpenAI, transcriptionFilePath: string) {
  try {
    const transcriptionText = fs.readFileSync(transcriptionFilePath, 'utf-8');
    await processAnalysis(openai, transcriptionText, transcriptionFilePath);

    const analysisFilePath = transcriptionFilePath.replace('_transcription.txt', '_analysis.json');
    const relativeAnalysisPath = path.relative(process.cwd(), analysisFilePath);

    console.log(chalk.green(`Analysis saved to: ${relativeAnalysisPath}`));
  } catch (error) {
    const relativeTranscriptionPath = path.relative(process.cwd(), transcriptionFilePath);
    console.error(chalk.red(`Error processing ${relativeTranscriptionPath}: ${(error as Error).message}`));
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('apiKey', {
      type: 'string',
      describe: 'Your OpenAI API key',
    })
    .option('transcription', {
      type: 'string',
      describe: 'Path to a transcription file or a glob pattern to match multiple transcription files',
    })
    .demandOption(['apiKey', 'transcription'], 'Please provide both apiKey and transcription arguments')
    .argv as any;

  const command = process.argv.slice(2).join(' ');
  console.log(chalk.blue(`Command: ${command}`));
  console.log(chalk.blue(`Arguments: ${JSON.stringify(argv, null, 2)}`));

  const apiKey = argv.apiKey || process.env.OPENAI_API_KEY;
  const transcription = argv.transcription;

  if (!apiKey) {
    console.error(chalk.red('Please provide the API key using --apiKey or set it in the .env file.'));
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  try {
    const files = await glob(transcription);
    if (files.length === 0) {
      console.error(chalk.yellow('No files matched the provided pattern.'));
      process.exit(1);
    }

    console.log(chalk.green(`Matching transcription files:`));
    files.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(chalk.green(`  - ${relativePath}`));
    });

    for (const file of files) {
      await processFile(openai, file);
    }

    console.log(chalk.blue('All transcription files processed successfully.'));
  } catch (err) {
    console.error(chalk.red(`Error matching files: ${(err as Error).message}`));
  } finally {
    process.exit(0);  // Ensure the process exits cleanly
  }
}

main();
