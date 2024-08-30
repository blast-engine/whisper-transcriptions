// src/cmd/transcribe-and-analyze.ts
import OpenAI from 'openai'
import { CommandBase } from '../lib/cmd.base'
import { transcribeAudio } from '../act/transcribe'
import { processAnalysis } from '../act/analyze'
import { glob } from 'glob'
import * as path from 'path'
import chalk from 'chalk'

class TranscribeAndAnalyzeCommand extends CommandBase<{ apiKey: string, audio: string }> {
  constructor() {
    super({
      apiKey: { type: 'string', describe: 'Your OpenAI API key', demandOption: true },
      audio: { type: 'string', describe: 'Path to an audio file or a glob pattern to match multiple audio files', demandOption: true },
    })
  }

  async processFile(openai: OpenAI, audioFilePath: string) {
    try {
      const { text, path: transcriptionFilePath } = await transcribeAudio(openai, audioFilePath)
      await processAnalysis(openai, text, transcriptionFilePath)

      const analysisFilePath = transcriptionFilePath.replace('_transcription.txt', '_analysis.json')

      const relativeTranscriptionPath = path.relative(process.cwd(), transcriptionFilePath)
      const relativeAnalysisPath = path.relative(process.cwd(), analysisFilePath)

      this.logSuccess(`Transcription saved to: ${relativeTranscriptionPath}`)
      this.logSuccess(`Analysis saved to: ${relativeAnalysisPath}`)
    } catch (error) {
      const relativeAudioPath = path.relative(process.cwd(), audioFilePath)
      this.logError(`Error processing ${relativeAudioPath}`, error as Error)
    }
  }

  async run() {
    this.logCommand()

    const apiKey = this.argv.apiKey || this.getEnvVariable('OPENAI_API_KEY')
    const audio = this.argv.audio

    const openai = new OpenAI({ apiKey })

    try {
      const files = await glob(audio)
      if (files.length === 0) {
        console.error(chalk.yellow('No files matched the provided pattern.'))
        process.exit(1)
      }

      this.logFilePaths(files)

      for (const file of files) {
        await this.processFile(openai, file)
      }

      this.logSuccess('All files processed successfully.')
    } catch (err) {
      this.logError('Error matching files', err as Error)
    }
  }
}

new TranscribeAndAnalyzeCommand().safeExecute()