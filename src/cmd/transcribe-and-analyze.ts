import OpenAI from "openai";
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { transcribeAudio } from '../act/transcribe';
import { processAnalysis } from '../act/analyze';
import { glob } from 'glob';
import * as path from 'path';
import chalk from 'chalk';

dotenv.config();

async function processFile(openai: OpenAI, audioFilePath: string) {
  try {
    const { text, path: transcriptionFilePath } = await transcribeAudio(openai, audioFilePath);
    await processAnalysis(openai, text, transcriptionFilePath);

    const analysisFilePath = transcriptionFilePath.replace('_transcription.txt', '_analysis.json');

    const relativeTranscriptionPath = path.relative(process.cwd(), transcriptionFilePath);
    const relativeAnalysisPath = path.relative(process.cwd(), analysisFilePath);

    console.log(chalk.green(`Transcription saved to: ${relativeTranscriptionPath}`));
    console.log(chalk.green(`Analysis saved to: ${relativeAnalysisPath}`));
  } catch (error) {
    const relativeAudioPath = path.relative(process.cwd(), audioFilePath);
    console.error(chalk.red(`Error processing ${relativeAudioPath}: ${(error as Error).message}`));
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('apiKey', {
      type: 'string',
      describe: 'Your OpenAI API key',
    })
    .option('audio', {
      type: 'string',
      describe: 'Path to an audio file or a glob pattern to match multiple audio files',
    })
    .demandOption(['apiKey', 'audio'], 'Please provide both apiKey and audio arguments')
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
    const files = await glob(audio);
    if (files.length === 0) {
      console.error(chalk.yellow('No files matched the provided pattern.'));
      process.exit(1);
    }

    console.log(chalk.green(`Matching files:`));
    files.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(chalk.green(`  - ${relativePath}`));
    });

    for (const file of files) {
      await processFile(openai, file);
    }

    console.log(chalk.blue('All files processed successfully.'));
  } catch (err) {
    console.error(chalk.red(`Error matching files: ${(err as Error).message}`));
  } finally {
    process.exit(0);  // Ensure the process exits cleanly
  }
}

main();
