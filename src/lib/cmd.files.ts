import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

export const readFileContent = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file at ${path.relative(process.cwd(), filePath)}: ${(error as Error).message}`);
  }
};

export const writeFileContent = (filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(chalk.green(`File saved to: ${path.relative(process.cwd(), filePath)}`));
  } catch (error) {
    throw new Error(`Failed to write file at ${path.relative(process.cwd(), filePath)}: ${(error as Error).message}`);
  }
};

export const deleteFiles = async (patterns: string[], cwd: string) => {
  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd, absolute: true });
    files.forEach(file => {
      try {
        fs.unlinkSync(file);
        console.log(chalk.green(`Deleted: ${path.relative(process.cwd(), file)}`));
      } catch (error) {
        console.error(chalk.red(`Failed to delete ${path.relative(process.cwd(), file)}: ${(error as Error).message}`));
      }
    });
  }
};