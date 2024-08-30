// src/lib/cmd.base.ts
import { parseArgs } from './cmd.args';
import { logCommandInfo, logSuccess, logError, logFilePaths } from './cmd.logger';
import { loadEnv, getEnvVariable } from './cmd.env';

export abstract class CommandBase<TArgs extends Record<string, any>> {
  protected argv: TArgs;

  constructor(private options: Record<string, any>) {
    loadEnv()
    this.argv = parseArgs(options)
  }

  protected logCommand() {
    const command = process.argv.slice(2).join(' ')
    logCommandInfo(command, this.argv)
  }

  protected getEnvVariable(key: string, fallback?: string) {
    return getEnvVariable(key, fallback)
  }

  protected logSuccess(message: string) {
    logSuccess(message)
  }

  protected logError(message: string, error: Error) {
    logError(message, error)
  }

  protected logFilePaths(files: string[]) {
    logFilePaths(files)
  }

  abstract run(): Promise<void>

  async safeExecute() {
    try {
      await this.run()
      process.exit(0)
    } catch (error) {
      this.logError('Error occurred during execution', error as Error)
      process.exit(1)
    }
  }
}