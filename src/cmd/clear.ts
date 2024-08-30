import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

async function clearGeneratedFiles() {
  const argv = yargs(hideBin(process.argv))
    .option('path', {
      type: 'string',
      describe: 'The path to search for generated files',
      default: process.cwd(),
    })
    .argv as any;

  console.log({ argv })

  const targetPath = path.resolve(argv.path || '');
  console.log({ targetPath })

  try {
    // Define the patterns to match the generated files
    const patterns = [
      // '**/*_transcription.txt',
      // '**/*_analysis.json',
      '**/*_part_*.txt'
    ];

    for (const pattern of patterns) {
      // Find matching files recursively from the specified path
      const files = await glob(pattern, { cwd: targetPath, absolute: true });

      if (files.length === 0) {
        console.log(chalk.yellow(`No files matched the pattern: ${pattern}`));
        continue;
      }

      // Delete each file
      files.forEach(file => {
        const relativePath = path.relative(process.cwd(), file);
        try {
          fs.unlinkSync(file);
          console.log(chalk.green(`Deleted: ${relativePath}`));
        } catch (error) {
          console.error(chalk.red(`Failed to delete ${relativePath}: ${(error as Error).message}`));
        }
      });
    }

    console.log(chalk.blue('All generated files have been cleared.'));
  } catch (error) {
    console.error(chalk.red(`Error during cleanup: ${(error as Error).message}`));
  }
}

clearGeneratedFiles();
