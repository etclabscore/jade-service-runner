import {extractAsset} from './util'
import fs from 'fs-extra';

let testBuffer: Buffer;
const TEST_DATA_DIR = './test-data'
describe("extract asset ", ()=>{
  let extractDir: string;

  const testExtraction = (path: string) => {

    let bufs = []
    bufs = [
      fs.readFileSync(`${path}/package/test0.txt`),
      fs.readFileSync(`${path}/package/folder/test1.txt`)
    ]
    bufs.forEach((buf, idx) => {
      expect(buf.toString('utf-8') === `hello${idx}`).toBe(true);
    });
  }

  beforeEach(async () => {
    await fs.ensureDir(`${TEST_DATA_DIR}`)
    extractDir = await fs.mkdtemp(`${TEST_DATA_DIR}/test-extract`);
  })

  afterEach(() => {
    fs.removeSync(`./test-data`)
  })
  it("should extract zip file", async () => {
    const result = await extractAsset('fixtures/test-package.zip', extractDir)
    expect(result).toBe(true)
    testExtraction(extractDir)
  })

  it("should extract tar file", async () => {
    const result = await extractAsset('fixtures/test-package.tar', extractDir)
    expect(result).toBe(true)
    testExtraction(extractDir)
  })

  it("should extract tar.gz file", async () => {
    const result = await extractAsset('fixtures/test-package.tar.gz', extractDir)
    expect(result).toBe(true)
    testExtraction(extractDir)
  })

  it("should throw on unknown type", async () => {

  })
})