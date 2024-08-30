// src/cmd/analyze.ts
import OpenAI from 'openai'
import { CommandBase } from '../lib/cmd.base'
import { readFileContent, writeFileContent } from '../lib/cmd.files'
import { processAnalysis } from '../act/analyze'
import { glob } from 'glob'
import chalk from 'chalk'

class AnalyzeCommand extends CommandBase<{ apiKey: string, transcription: string }> {
  constructor() {
    super({
      apiKey: { type: 'string', describe: 'Your OpenAI API key', demandOption: true },
      transcription: { type: 'string', describe: 'Path to a transcription file or a glob pattern', demandOption: true },
    })
  }

  async processFile(openai: OpenAI, transcriptionFilePath: string) {
    try {
      const transcriptionText = readFileContent(transcriptionFilePath)
      await processAnalysis(openai, transcriptionText, transcriptionFilePath)

      const analysisFilePath = transcriptionFilePath.replace('_transcription.txt', '_analysis.json')
      writeFileContent(analysisFilePath, JSON.stringify({ result: 'success' }))  // Example output
    } catch (error) {
      this.logError(`Error processing ${transcriptionFilePath}`, error as Error)
    }
  }

  async run() {
    this.logCommand()

    const apiKey = this.argv.apiKey || this.getEnvVariable('OPENAI_API_KEY')
    const transcription = this.argv.transcription

    const openai = new OpenAI({ apiKey })

    try {
      const files = await glob(transcription)
      if (files.length === 0) {
        console.error(chalk.yellow('No files matched the provided pattern.'))
        process.exit(1)
      }

      this.logFilePaths(files)

      for (const file of files) {
        await this.processFile(openai, file)
      }

      this.logSuccess('All transcription files processed successfully.')
    } catch (err) {
      this.logError('Error matching files', err as Error)
    }
  }
}

new AnalyzeCommand().safeExecute()