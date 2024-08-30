import * as fs from 'fs'
import * as path from 'path'
import { notes, paths } from './concat.config'

const ROOT_ABS_PATH = path.resolve(__dirname, '../..')

const getFilesFromPaths = (paths: readonly string[]): string[] => {
  const result: string[] = []

  const traverseDirectory = (dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        traverseDirectory(fullPath)
      } else {
        result.push(fullPath)
      }
    })
  }

  paths.forEach(relPath => {
    const fullPath = path.join(ROOT_ABS_PATH, relPath)
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDirectory(fullPath)
    } else {
      result.push(fullPath)
    }
  })

  return result
}

const printNotes = (): string => 
  notes.reduce((notes, note) => notes + ' - ' + note + '\n', '')

const printFiles = (): string => 
  getFilesFromPaths(paths).reduce((acc, fullPath) => {
    const fileContent = fs.readFileSync(fullPath, 'utf-8')
    const relFilePath = path.relative(ROOT_ABS_PATH, fullPath)
    return acc + printFile(relFilePath, fileContent)
  }, '')

const printFile = (projectFilePath: string, fileContent: string) => `
-----------
## ${path.basename(projectFilePath)} (${projectFilePath})
-----------

${fileContent}
`
/** --- bin --- */

;(async () => { 

  const notes = printNotes()
  const files = printFiles() 

  const message = notes + "\n\n" + files

  let output = message
  console.log(output)

  const clipboard = (await import('clipboardy')).default
  await clipboard.write(output)
  console.log('**** output copied to clipboard  ****')

})()