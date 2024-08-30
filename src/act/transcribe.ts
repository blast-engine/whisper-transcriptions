import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { glob } from 'glob';

ffmpeg.setFfmpegPath(ffmpegPath);

export async function transcribeAudio(openai: OpenAI, filePath: string): Promise<{ text: string, path: string }> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.mp4' && ext !== '.m4a' && ext !== '.mp3') {
      throw new Error(`Unsupported file type: ${ext}. Only .mp4, .m4a, and .mp3 files are supported.`);
    }

    console.log(chalk.blue(`Starting transcription for ${path.relative(process.cwd(), filePath)}...`));

    let audioFilePath = filePath;

    // If the file is an .mp4, extract the audio first
    if (ext === '.mp4') {
      const audioFileName = path.basename(filePath, path.extname(filePath)) + '.mp3';
      audioFilePath = path.join(path.dirname(filePath), audioFileName);

      console.log(chalk.blue(`Extracting audio from ${path.relative(process.cwd(), filePath)}...`));

      await extractAudio(filePath, audioFilePath);
      console.log(chalk.green(`Audio extracted to ${path.relative(process.cwd(), audioFilePath)}`));
    }

    const fileSize = fs.statSync(audioFilePath).size;
    const maxSize = 25 * 1024 * 1024; // 25MB

    let combinedTranscription = '';

    if (fileSize > maxSize) {
      console.log(chalk.yellow(`File size exceeds 25MB. Splitting the file: ${path.relative(process.cwd(), audioFilePath)}`));
      const splitFiles = await splitAudioFile(audioFilePath);

      for (const splitFile of splitFiles) {
        const transcription = await transcribeSingleFileWithFeedback(openai, splitFile);
        combinedTranscription += transcription.text + '\n';
        fs.unlinkSync(splitFile); // Remove the split file after transcription
      }
    } else {
      const transcription = await transcribeSingleFileWithFeedback(openai, audioFilePath);
      combinedTranscription = transcription.text;
    }

    const resultFilePath = path.join(path.dirname(audioFilePath), `${path.basename(audioFilePath, ext)}_transcription.txt`);
    fs.writeFileSync(resultFilePath, combinedTranscription, 'utf-8');
    console.log(chalk.green(`Transcription completed and saved to ${path.relative(process.cwd(), resultFilePath)}`));

    // Clean up extracted audio file if it was created
    if (ext === '.mp4') {
      fs.unlinkSync(audioFilePath);
    }

    return { text: combinedTranscription, path: resultFilePath };
  } catch (error) {
    const relativeFilePath = path.relative(process.cwd(), filePath);
    console.error(chalk.red(`Error during transcription of ${relativeFilePath}: ${(error as Error).message}`));
    throw error;
  }
}

async function transcribeSingleFileWithFeedback(openai: OpenAI, filePath: string): Promise<{ text: string, path: string }> {
  try {
    console.log(chalk.blue(`Transcribing ${path.relative(process.cwd(), filePath)}...`));

    const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
    const resultFilePath = path.join(path.dirname(filePath), `${fileNameWithoutExt}_transcription.txt`);

    if (fs.existsSync(resultFilePath)) {
      console.log(chalk.yellow(`Skipping transcription. Output file already exists: ${path.relative(process.cwd(), resultFilePath)}`));
      return { text: fs.readFileSync(resultFilePath, 'utf-8'), path: resultFilePath };
    }

    const transcriptionPromise = openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "en",
    }).then(response => ({ timeout: false, response } as const));

    // const transcription = await Promise.race([transcriptionPromise, timeout]);
    const transcription = await transcriptionPromise;

    if (transcription.timeout) {
      throw new Error('Timed out.');
    }

    fs.writeFileSync(resultFilePath, transcription.response.text, 'utf-8');

    console.log(chalk.green(`Transcription for ${path.relative(process.cwd(), filePath)} saved to ${path.relative(process.cwd(), resultFilePath)}`));
    return { text: transcription.response.text, path: resultFilePath };
  } catch (error) {
    const relativeFilePath = path.relative(process.cwd(), filePath);
    console.error(chalk.red(`Error transcribing ${relativeFilePath}: ${(error as Error).message}`));
    throw error;
  }
}

async function extractAudio(inputFilePath: string, outputFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .output(outputFilePath)
      .audioCodec('libmp3lame') // Use MP3 codec for compressed files
      .format('mp3') // Ensure the output format is mp3
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function splitAudioFile(audioFilePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const outputPattern = path.join(path.dirname(audioFilePath), path.basename(audioFilePath, path.extname(audioFilePath)) + '_part_%03d.mp3');
    ffmpeg(audioFilePath)
      .outputOptions('-f', 'segment', '-segment_time', '300', '-c:a', 'libmp3lame', '-b:a', '128k') // Adjust segment time and bitrate
      .output(outputPattern)
      .on('end', () => {
        const splitFiles = fs.readdirSync(path.dirname(audioFilePath))
          .filter(file => file.startsWith(path.basename(audioFilePath, path.extname(audioFilePath)) + '_part_'))
          .sort() // Ensure files are processed in the correct order
          .map(file => path.join(path.dirname(audioFilePath), file));
        resolve(splitFiles);
      })
      .on('error', reject)
      .run();
  });
}

export async function transcribeMultipleFiles(openai: OpenAI, fileGlob: string) {
  try {
    const files = await glob(fileGlob);

    if (files.length === 0) {
      console.error(chalk.red(`No files matched the pattern: ${fileGlob}`));
      return;
    }

    console.log(chalk.green(`Found ${files.length} files. Starting transcription in parallel...`));

    await Promise.all(files.map(file => transcribeAudio(openai, file)));

    console.log(chalk.blue('All files transcribed successfully.'));
  } catch (error) {
    console.error(chalk.red(`Error during parallel transcription: ${(error as Error).message}`));
  }
}
