// src/cmd/clear.ts
import { CommandBase } from '../lib/cmd.base';
import { deleteFiles } from '../lib/cmd.files';

class ClearCommand extends CommandBase<{ path: string }> {
  constructor() {
    super({
      path: { type: 'string', describe: 'The path to search for generated files', default: process.cwd() },
    });
  }

  async run() {
    this.logCommand();

    const targetPath = this.argv.path;

    try {
      await deleteFiles(['**/*_transcription.txt', '**/*_analysis.json', '**/*_part_*.txt'], targetPath);
      this.logSuccess('All generated files have been cleared.');
    } catch (error) {
      this.logError('Error during cleanup', error as Error);
    }
  }
}

new ClearCommand().safeExecute();