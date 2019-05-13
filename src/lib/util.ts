import path from 'path';
import { ensureDirSync, createReadStream, createWriteStream } from 'fs-extra';
import { Readable, Writable, Transform } from 'stream';
import {promisify} from 'util';
import yauzl, { ZipFile } from 'yauzl';
import tar from 'tar-fs';
import zlib from 'zlib';
const openZip = promisify(yauzl.open) as (path: string, options: yauzl.Options) => Promise<ZipFile | undefined>;

export enum OSTypes {
  OSX = "osx",
  WINDOWS = "windows",
  LINUX = "linux"
}

export const getOS = ():OSTypes =>{
  switch (process.platform){
    case "darwin": return OSTypes.OSX;
    case "freebsd": return OSTypes.LINUX;
    case "linux": return OSTypes.LINUX;
    case "win32":return OSTypes.WINDOWS;
    default: throw new Error("unsupported platform")

  }    
}

export const extractAsset = async (srcPath: string, srcDest: string): Promise<boolean> => {

  const ext = path.extname(srcPath)
  switch (ext) {
    case '.zip': return extractZipFile(srcPath, srcDest)
    case '.gz': return extractTar(srcPath, srcDest, true)
    case '.tgz': return extractTar(srcPath, srcDest, true)
    case '.tar': return extractTar(srcPath, srcDest)

    default:
      const err = `Unknown extension(${ext})`;
      console.error(err)
      throw new Error(err)
  }
  return false
}

const extractTar = async (srcPath: string, destPath: string, gz: boolean = false): Promise<boolean> => {
  await ensureDirSync(destPath)
  return new Promise((resolve: (val: boolean) => void) => {
    const rs = createReadStream(srcPath)
    let stream: Readable | Writable = rs;
    if (gz) stream = rs.pipe(zlib.createGunzip())
    stream.pipe(tar.extract(destPath)
      .on("error", (err) => {
        throw err;
      }).on("finish", () => {
        resolve(true);
      }))
      .on("error", (err) => {
        throw err;
      })
  });
}

const extractZipFile = async (srcPath: string, destPath: string): Promise<boolean> => {
  const zipFile = await openZip(srcPath, { lazyEntries: true })
  if (zipFile === undefined) {
    const errMsg = `Cannot find ${srcPath}`
    console.error(errMsg)
    throw Error(errMsg)
  }
  const extractionComplete = new Promise((resolve: (value: boolean) => void) => {
    zipFile.on("close", function () {
      resolve(true);
    });
  });
  zipFile.on("entry", async function (entry) {
    await ensureDirSync(path.dirname(`${destPath}/${entry.fileName}`))
    if (/\/$/.test(entry.fileName)) {
      // directory file names end with '/'
      zipFile.readEntry();
    } else {
      zipFile.openReadStream(entry, (err, readStream) => {
        if (err) throw err;
        const filter = new Transform();
        filter._transform = function (chunk, encoding, cb) {
          cb(null, chunk);
        };
        filter._flush = function (cb) {
          cb();
          zipFile.readEntry();
        };
        const writeStream = createWriteStream(`${destPath}/${entry.fileName}`);
        if (writeStream === undefined || readStream === undefined) {
          const errMsg = `Could not write file to disk ${entry.fileName}`
          console.error(errMsg);
          throw new Error(errMsg);
        }
        readStream.pipe(filter).pipe(writeStream)
      })
    }
  })
  zipFile.readEntry()
  return extractionComplete;
}