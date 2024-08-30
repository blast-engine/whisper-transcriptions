// src/cmd/transcribe.ts
import OpenAI from 'openai';
import { CommandBase } from '../lib/cmd.base';
import { transcribeMultipleFiles } from '../act/transcribe';

class TranscribeCommand extends CommandBase<{ apiKey: string, audio: string }> {
  constructor() {
    super({
      apiKey: { type: 'string', describe: 'Your OpenAI API key', demandOption: true },
      audio: { type: 'string', describe: 'Path to an audio file or a glob pattern to match multiple audio files', demandOption: true },
    });
  }

  async run() {
    this.logCommand();

    const apiKey = this.argv.apiKey || this.getEnvVariable('OPENAI_API_KEY');
    const audio = this.argv.audio;

    const openai = new OpenAI({ apiKey });

    try {
      await transcribeMultipleFiles(openai, audio);
      this.logSuccess('All files transcribed successfully.');
    } catch (error) {
      this.logError('Error transcribing files', error as Error);
    }
  }
}

new TranscribeCommand().safeExecute();