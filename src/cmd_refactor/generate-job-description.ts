// src/cmd/generate-job-description.ts
import OpenAI from 'openai'
import { CommandBase } from '../lib/cmd.base'
import { readFileContent, writeFileContent } from '../lib/cmd.files'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'

const MeetingSchema = z.object({
  title: z.string(),
  short_summary: z.string(),
  tools: z.array(z.string()),
  topics: z.array(z.string()),
})

const CollectionSchema = z.array(MeetingSchema)

const JobDescriptionSchema = z.object({
  projects: z.array(z.string()),
  competencies: z.array(z.string()),
  titles: z.array(z.string()),
  description_long: z.string(),
  description_short: z.string(),
})

class GenerateJobDescriptionCommand extends CommandBase<{ collection: string, apiKey: string }> {
  constructor() {
    super({
      collection: { type: 'string', describe: 'Path to the JSON file containing the array of meetings', demandOption: true },
      apiKey: { type: 'string', describe: 'Your OpenAI API key', demandOption: true },
    })
  }

  async run() {
    this.logCommand()

    const collectionFilePath = this.argv.collection
    const apiKey = this.argv.apiKey || this.getEnvVariable('OPENAI_API_KEY')

    if (!fs.existsSync(collectionFilePath)) {
      this.logError(`File not found: ${collectionFilePath}`, new Error('File not found'))
      process.exit(1)
    }

    if (!apiKey) {
      this.logError('Please provide the API key using --apiKey or set it in the .env file.', new Error('API key missing'))
      process.exit(1)
    }

    const fileContent = readFileContent(collectionFilePath)
    let meetings

    try {
      meetings = CollectionSchema.parse(JSON.parse(fileContent))
    } catch (error) {
      this.logError('Error parsing the collection file', error as Error)
      process.exit(1)
    }

    const tools = Array.from(new Set(meetings.flatMap(meeting => meeting.tools)))

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
    `

    const openai = new OpenAI({ apiKey })

    try {
      const response = await openai.beta.chat.completions.parse({
        model: "gpt-4o-2024-08-06",
        messages: [
          { role: "system", content: "You are a career coach and job description expert." },
          { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(JobDescriptionSchema, "job_description_response"),
      })

      if (!response || !response.choices[0].message.parsed) {
        this.logError('Failed to generate job description.', new Error('API response error'))
        console.error("API Response:", response)
        process.exit(1)
      }

      const jobDescription = response.choices[0].message.parsed
      const outputFilePath = path.join(process.cwd(), 'job_description.json')
      writeFileContent(outputFilePath, JSON.stringify(jobDescription, null, 2))

      this.logSuccess(`Job description generated and saved to ${outputFilePath}`)
    } catch (error) {
      this.logError('Error generating job description', error as Error)
      if ((error as any).response) {
        console.error("API Error Details:", (error as any).response.data)
      }
      process.exit(1)
    }
  }
}

new GenerateJobDescriptionCommand().safeExecute()