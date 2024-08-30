import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

async function collectFiles() {
  const argv = yargs(hideBin(process.argv))
    .option('files', {
      type: 'string',
      describe: 'Glob pattern to match files',
      demandOption: true,
    })
    .argv as any;

  const files = await glob(argv.files, { cwd: process.cwd(), absolute: true });

  if (files.length === 0) {
    console.error(chalk.red(`No files matched the pattern: ${argv.files}`));
    process.exit(1);
  }

  const collection:string[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();

    try {
      const content = fs.readFileSync(file, 'utf-8');

      if (ext === '.txt') {
        collection.push(content);
      } else if (ext === '.json') {
        const analysis = JSON.parse(content);
        delete analysis.transcript;
        collection.push(analysis);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      console.error(chalk.red(`Error processing file ${path.relative(process.cwd(), file)}: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  const outputFilePath = path.join(process.cwd(), 'collection.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(collection, null, 2), 'utf-8');

  console.log(chalk.green(`Collection saved to ${outputFilePath}`));
}

collectFiles();
