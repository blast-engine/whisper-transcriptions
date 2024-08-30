import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

export const parseArgs = (options: Record<string, any>) => {
  return yargs(hideBin(process.argv))
    .options(options)
    .demandOption(
      Object.keys(options).filter(key => options[key].demandOption),
      'Please provide all required arguments'
    )
    .argv as any;
};