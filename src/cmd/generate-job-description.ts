import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { z } from 'zod';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { zodResponseFormat } from 'openai/helpers/zod';
import chalk from 'chalk';

const MeetingSchema = z.object({
  title: z.string(),
  short_summary: z.string(),
  tools: z.array(z.string()),
  topics: z.array(z.string()),
});

const CollectionSchema = z.array(MeetingSchema);

const JobDescriptionSchema = z.object({
  projects: z.array(z.string()),
  competencies: z.array(z.string()),
  titles: z.array(z.string()),
  description_long: z.string(),
  description_short: z.string(),
});

async function generateJobDescription() {
  const argv = yargs(hideBin(process.argv))
    .option('collection', {
      type: 'string',
      describe: 'Path to the JSON file containing the array of meetings',
      demandOption: true,
    })
    .option('apiKey', {
      type: 'string',
      describe: 'Your OpenAI API key',
      demandOption: true,
    })
    .argv as any;

  const collectionFilePath = path.resolve(argv.collection);
  const apiKey = argv.apiKey || process.env.OPENAI_API_KEY;

  if (!fs.existsSync(collectionFilePath)) {
    console.error(chalk.red(`File not found: ${collectionFilePath}`));
    process.exit(1);
  }

  if (!apiKey) {
    console.error(chalk.red('Please provide the API key using --apiKey or set it in the .env file.'));
    process.exit(1);
  }

  const fileContent = fs.readFileSync(collectionFilePath, 'utf-8');
  let meetings;

  try {
    meetings = CollectionSchema.parse(JSON.parse(fileContent));
  } catch (error) {
    console.error(chalk.red(`Error parsing the collection file: ${(error as Error).message}`));
    process.exit(1);
  }

  const tools = Array.from(new Set(meetings.flatMap(meeting => meeting.tools)));

  const prompt = `
    I have attended several important meetings related to various projects and initiatives within my company. 
    Below is a summary of the tools, topics, and short descriptions discussed in these meetings. 

    Your task is to generate the following:
    1. **projects**: A detailed list of company projects and initiatives based on the topics and tools discussed.
    2. **competencies**: A detailed list of company competencies.
    3. **titles**: A few alternative job titles for my role.
    4. **description_long**: A fully detailed job description, making sure to use many of the tools mentioned in the meetings and highlighting them by making them **bold** (use double stars as in markdown).
    5. **description_short**: A concise job description.

    Here are the tools and topics discussed in the meetings:

    ${meetings.map(meeting => `
    **Title**: ${meeting.title}
    **Short Summary**: ${meeting.short_summary}
    **Tools**: ${meeting.tools.join(', ')}
    **Topics**: ${meeting.topics.join(', ')}
    `).join('\n')}
  `;

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: "You are a career coach and job description expert." },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(JobDescriptionSchema, "job_description_response"),
    });

    if (!response || !response.choices[0].message.parsed) {
      console.error("API Response:", response);
      throw new Error('Failed to generate job description.');
    }

    const jobDescription = response.choices[0].message.parsed;
    const outputFilePath = path.join(process.cwd(), 'job_description.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(jobDescription, null, 2), 'utf-8');

    console.log(chalk.green(`Job description generated and saved to ${outputFilePath}`));
  } catch (error) {
    console.error(chalk.red(`Error generating job description: ${(error as Error).message}`));
    if ((error as any).response) {
      console.error("API Error Details:", (error as any).response.data);
    }
  }
}

generateJobDescription();
