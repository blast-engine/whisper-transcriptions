import chalk from 'chalk';
import * as path from 'path';

export const logCommandInfo = (command: string, argv: any) => {
  console.log(chalk.blue(`Command: ${command}`));
  console.log(chalk.blue(`Arguments: ${JSON.stringify(argv, null, 2)}`));
};

export const logSuccess = (message: string) => {
  console.log(chalk.green(message));
};

export const logError = (message: string, error: Error) => {
  console.error(chalk.red(`${message}: ${error.message}`));
};

export const logFilePaths = (files: string[]) => {
  console.log(chalk.green(`Matching files:`));
  files.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(chalk.green(`  - ${relativePath}`));
  });
};