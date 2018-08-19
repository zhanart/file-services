import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { IBaseFileSystemAsync } from '@file-services/types'

chai.use(chaiAsPromised)

const sampleContent = 'content'
const differentContent = 'another content'

/**
 * Represents everything required to run a single
 * contract test.
 */
export interface IFileSystemTestbed {
    /**
     * SYNC file system to be tested
     */
    fs: IBaseFileSystemAsync

    /**
     * Absolute path to an empty directory
     */
    tempDirectoryPath: string

    /**
     * Post-test cleanup
     */
    dispose(): Promise<void>
}

export function asyncFsContract(testProvider: () => Promise<IFileSystemTestbed>): void {
    describe('sync file system contract', () => {
        let testbed: IFileSystemTestbed

        beforeEach(async () => testbed = await testProvider())
        afterEach(async () => await testbed.dispose())

        describe('writing files', () => {
            it('can write a new file into an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(sampleContent)
            })

            it('can overwrite an existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                await fs.writeFile(filePath, sampleContent)
                await fs.writeFile(filePath, differentContent)

                expect((await fs.stat(filePath)).isFile()).to.equal(true)
                expect(await fs.readFile(filePath)).to.eql(differentContent)
            })

            it('fails if writing a file to a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-dir', 'file')

                const expectedToFail = () => fs.writeFileSync(filePath, sampleContent)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if writing a file to a path already pointing to a directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                const expectedToFail = () => fs.writeFileSync(directoryPath, sampleContent)

                expect(expectedToFail).to.throw('EISDIR')
            })
        })

        describe('reading files', async () => {
            it('can read the contents of a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const firstFilePath = join(tempDirectoryPath, 'first-file')
                const secondFilePath = join(tempDirectoryPath, 'second-file')

                fs.writeFileSync(firstFilePath, sampleContent)
                fs.writeFileSync(secondFilePath, differentContent)

                expect(fs.readFileSync(firstFilePath), 'contents of first-file').to.eql(sampleContent)
                expect(fs.readFileSync(secondFilePath), 'contents of second-file').to.eql(differentContent)
            })

            it('fails if reading a non-existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                const expectedToFail = () => fs.readFileSync(filePath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if reading a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const expectedToFail = () => fs.readFileSync(tempDirectoryPath)

                expect(expectedToFail).to.throw('EISDIR')
            })

        })

        describe('removing files', async () => {
            it('can remove files', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, sampleContent)
                fs.unlinkSync(filePath)

                expect(() => fs.statSync(filePath)).to.throw('ENOENT')
            })

            it('fails if trying to remove a non-existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                const expectedToFail = () => fs.unlinkSync(filePath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if trying to remove a directory as a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                const expectedToFail = () => fs.unlinkSync(directoryPath)

                expect(expectedToFail).to.throw('EISDIR')
            })
        })

        describe('creating directories', async () => {
            it('can create an empty directory inside an existing one', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'new-dir')

                fs.mkdirSync(directoryPath)

                expect(fs.statSync(directoryPath).isDirectory()).to.equal(true)
                expect(fs.readdirSync(directoryPath)).to.eql([])
            })

            it('fails if creating in a path pointing to an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                const expectedToFail = () => fs.mkdirSync(directoryPath)

                expect(expectedToFail).to.throw('EEXIST')
            })

            it('fails if creating in a path pointing to an existing file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, sampleContent)
                const expectedToFail = () => fs.mkdirSync(filePath)

                expect(expectedToFail).to.throw('EEXIST')
            })

            it('fails if creating a directory inside a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'outer', 'inner')

                const expectedToFail = () => fs.mkdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOENT')
            })
        })

        describe('listing directories', async () => {
            it('can list an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.writeFileSync(join(directoryPath, 'file1'), sampleContent)
                fs.writeFileSync(join(directoryPath, 'camelCasedName'), sampleContent)

                expect(fs.readdirSync(tempDirectoryPath)).to.eql(['dir'])
                const directoryContents = fs.readdirSync(directoryPath)
                expect(directoryContents).to.have.lengthOf(2)
                expect(directoryContents).to.contain('file1')
                expect(directoryContents).to.contain('camelCasedName')
            })

            it('fails if listing a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                const expectedToFail = () => fs.readdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if listing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, sampleContent)
                const expectedToFail = () => fs.readdirSync(filePath)

                expect(expectedToFail).to.throw('ENOTDIR')
            })
        })

        describe('removing directories', async () => {
            it('can remove an existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.rmdirSync(directoryPath)

                expect(() => fs.statSync(directoryPath).isDirectory()).to.throw('ENOENT')
            })

            it('fails if removing a non-empty directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.writeFileSync(join(directoryPath, 'file'), sampleContent)
                const expectedToFail = () => fs.rmdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOTEMPTY')
            })

            it('fails if removing a non-existing directory', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                const expectedToFail = () => fs.rmdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if removing a path pointing to a file', async () => {
                const { fs, tempDirectoryPath } = testbed
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, sampleContent)
                const expectedToFail = () => fs.rmdirSync(filePath)

                expect(expectedToFail).to.throw('ENOTDIR')
            })
        })

        it('correctly exposes whether it is case sensitive', async () => {
            const { fs, tempDirectoryPath } = testbed
            const { join } = fs.path
            const filePath = join(tempDirectoryPath, 'file')
            const upperCaseFilePath = filePath.toUpperCase()

            fs.writeFileSync(filePath, sampleContent)

            if (fs.isCaseSensitive) {
                expect(() => fs.statSync(upperCaseFilePath).isFile()).to.throw('ENOENT')
            } else {
                expect(fs.statSync(upperCaseFilePath).isFile()).to.equal(true)
            }
        })
    })
}
