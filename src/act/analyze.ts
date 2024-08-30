import OpenAI from "openai";
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import { zodResponseFormat } from "openai/helpers/zod";
import chalk from 'chalk';

export async function processAnalysis(openai: OpenAI, transcriptionText: string, transcriptionFilePath: string): Promise<void> {
  try {
    console.log(chalk.blue(`Starting analysis for ${path.relative(process.cwd(), transcriptionFilePath)}...`));

    const fileNameWithoutExt = path.basename(transcriptionFilePath, '_transcription.txt');
    const resultFilePath = path.join(path.dirname(transcriptionFilePath), `${fileNameWithoutExt}_analysis.json`);

    if (fs.existsSync(resultFilePath)) {
      console.log(chalk.yellow(`Skipping analysis. Output file already exists: ${path.relative(process.cwd(), resultFilePath)}`));
      return;
    }

    const AnalysisResponse = z.object({
      tools: z.array(z.string()),
      topics: z.array(z.string()),
      actionables: z.array(z.string()),
      long_summary: z.string(),
      short_summary: z.string(),
      title: z.string()
    });

    const analysisPrompt = 
      `Given the following transcription, provide the following as a structured response:
        {
          tools: An array of all the names of tools, frameworks, or concepts mentioned.
          topics: An array of all the topics discussed.
          actionables: An array of all the actionables mentioned.
          short_summary: A short summary of the transcription.
          long_summary: A longer summary of the transcription.
          title: A suitable title for the transcription.
        }
        
      Text: "${transcriptionText}"`;

    const completionPromise = openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: "You are an AI that extracts technical details from text." },
        { role: "user", content: analysisPrompt },
      ],
      response_format: zodResponseFormat(AnalysisResponse, "analysis_response"),
    }).then(response => ({ timeout: false, response } as const));

    const timeout = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true } as const), 60 * 1000) // 60 seconds timeout
    );

    const completion = await Promise.race([completionPromise, timeout]);

    if (completion.timeout) {
      throw new Error('Timed out.');
    }

    if (!completion || !completion.response.choices[0].message.parsed) {
      console.error("API Response:", completion);
      throw new Error('Analysis result is null or undefined.');
    }

    const analysisResult = completion.response.choices[0].message.parsed;

    const result = {
      title: analysisResult.title,
      tools: analysisResult.tools,
      topics: analysisResult.topics,
      actionables: analysisResult.actionables,
      short_summary: analysisResult.short_summary,
      long_summary: analysisResult.long_summary,
      transcript: transcriptionText,
    };

    fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(chalk.green(`Analysis completed and saved to ${path.relative(process.cwd(), resultFilePath)}`));
  } catch (error) {
    const relativeTranscriptionPath = path.relative(process.cwd(), transcriptionFilePath);
    console.error(chalk.red(`Error processing analysis for ${relativeTranscriptionPath}: ${(error as Error).message}`));
    if ((error as any).response) {
      console.error("API Error Details:", (error as any).response.data);
    }
  }
}
