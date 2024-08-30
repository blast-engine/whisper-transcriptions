// src/cmd/collect.ts
import { CommandBase } from '../lib/cmd.base';
import { readFileContent, writeFileContent } from '../lib/cmd.files';
import { glob } from 'glob';
import * as path from 'path';

class CollectCommand extends CommandBase<{ files: string }> {
  constructor() {
    super({
      files: { type: 'string', describe: 'Glob pattern to match files', demandOption: true },
    });
  }

  async run() {
    this.logCommand();

    try {
      const files = await glob(this.argv.files, { cwd: process.cwd(), absolute: true });

      if (files.length === 0) {
        this.logError(`No files matched the pattern: ${this.argv.files}`, new Error('No files matched'));
        process.exit(1);
      }

      this.logFilePaths(files);

      const collection: string[] = [];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();

        try {
          const content = readFileContent(file);

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
          this.logError(`Error processing file ${path.relative(process.cwd(), file)}`, error as Error);
          process.exit(1);
        }
      }

      const outputFilePath = path.join(process.cwd(), 'collection.json');
      writeFileContent(outputFilePath, JSON.stringify(collection, null, 2));

      this.logSuccess(`Collection saved to ${outputFilePath}`);
    } catch (error) {
      this.logError('Error during file collection', error as Error);
    }
  }
}

new CollectCommand().safeExecute();