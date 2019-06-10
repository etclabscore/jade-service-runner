import path from "path";
import { ensureDirSync, createReadStream, createWriteStream } from "fs-extra";
import { mkdir } from "fs";
import { Readable, Writable, Transform } from "stream";
import { promisify } from "util";
import yauzl, { ZipFile } from "yauzl";
import tar from "tar-fs";
import zlib from "zlib";
import request from "request";
import net, { AddressInfo } from "net";
import dgram from "dgram";
import { makeLogger } from "./logging";
const logger = makeLogger("ServiceRunner", "Util");

const fsMkdir = promisify(mkdir);
const openZip = promisify(yauzl.open) as (path: string, options: yauzl.Options) => Promise<ZipFile | undefined>;

interface IDynamicPorts {
  DYNAMIC_TCP_PORT_1: number;
  DYNAMIC_TCP_PORT_2: number;
  DYNAMIC_TCP_PORT_3: number;
  DYNAMIC_UDP_PORT_1: number;
  DYNAMIC_UDP_PORT_2: number;
  DYNAMIC_UDP_PORT_3: number;
}

// Note this might be problematic if there are collisions
/**
 * Returns a set of TCP and UDP Ports.
 *
 *
 * @returns a set of free TCP and UDP Ports
 */
export async function getFreePorts(): Promise < IDynamicPorts > {
  const tcpPorts = [1, 2, 3].map(() => getAvailableTCPPort());
  const udpPorts = [1, 2, 3].map(() => getAvailableUDPPort());

  const availPorts = await Promise.all([...tcpPorts, ...udpPorts]) as number[];
  return {
    DYNAMIC_TCP_PORT_1: availPorts[1],
    DYNAMIC_TCP_PORT_2: availPorts[2],
    DYNAMIC_TCP_PORT_3: availPorts[3],
    DYNAMIC_UDP_PORT_1: availPorts[4],
    DYNAMIC_UDP_PORT_2: availPorts[5],
    DYNAMIC_UDP_PORT_3: availPorts[6],
  };
}
// Note this might be problematic if executed serially
/**
 * Returns a free TCP Port.
 *
 *
 * @returns a free TCP Port
 */
export const getAvailableTCPPort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on("error", reject);
  server.listen(0, () => {
    const { port } = server.address() as AddressInfo;
    server.close(() => {
      resolve(port);
    });
  });
});
/**
 * Returns a free UDP Port.
 *
 *
 * @returns a free TCP Port
 */
export const getAvailableUDPPort = () => new Promise((resolve, reject) => {

  const socket = dgram.createSocket("udp4");
  socket.bind({ port: 0 }, () => {
    const { port } = socket.address() as AddressInfo;
    socket.on("error", reject);
    socket.close(() => {
      resolve(port);
    });
  });
});

export enum OSTypes {
  OSX = "osx",
  WINDOWS = "windows",
  LINUX = "linux",
}
/**
 * Gets current platform and maps node OS type to logical os type.
 *
 *
 */
export const getOS = (): OSTypes => {
  switch (process.platform) {
    case "darwin": return OSTypes.OSX;
    case "freebsd": return OSTypes.LINUX;
    case "linux": return OSTypes.LINUX;
    case "win32": return OSTypes.WINDOWS;
    default: throw new Error("unsupported platform");

  }
};

/**
 * Downloads a uri resource and writes it to a given directory. It returns
 * the final path of the resource
 *
 * @param uri - URI of the resource
 * @param dir - Directory to download to
 * @param name - Name of the subdir
 * @param timeout - Timeout of the 2min for the download resource before failure
 * @returns The config of a service scoped by OS and service name
 */
export const downloadAsset = async (uri: string, dir: string,
                                    name: string, timeout: number = 120000): Promise<string> => {
  await fsMkdir(dir, { recursive: true });
  const downloadPath = `${dir}/${name}`;
  return new Promise((resolve: (p: string) => void, reject) => {
    const file = createWriteStream(downloadPath);
    file.on("finish", () => {
      file.close();
      resolve(downloadPath);
    })
      .on("error", (err) => {
        reject(err);
      });

    request.get({ uri, timeout })
      .on("response", (response) => {
        const { statusCode } = response;
        const errMsg = `Could not fetch asset from:${uri}`;
        if (statusCode < 200 || statusCode > 299) {
          logger.error(errMsg);
          reject(new Error(errMsg));
        }
      })
      .on("error", (err) => {
        const errMsg = `Could not fetch asset from:${uri}`;
        logger.error(errMsg);
        reject(new Error(errMsg));
      })
      .pipe(file);
  }).catch((e) => {
    throw e;
  });
};

/**
 * Extract an asset to a destination
 *
 * @param srcPath - The path of the resource
 * @param srcDest - The path to extract the resource to
 * @returns The success or failure of the extraction
 */
export const extractAsset = async (srcPath: string, srcDest: string): Promise<boolean> => {
  const ext = path.extname(srcPath);
  switch (ext) {
    case ".zip": return extractZipFile(srcPath, srcDest);
    case ".gz": return extractTar(srcPath, srcDest, true);
    case ".tgz": return extractTar(srcPath, srcDest, true);
    case ".tar": return extractTar(srcPath, srcDest);

    default:
      const err = `Unknown extension(${ext})`;
      throw new Error(err);
  }
};

const extractTar = async (srcPath: string, destPath: string, gz: boolean = false): Promise<boolean> => {
  await ensureDirSync(destPath);
  return new Promise((resolve: (val: boolean) => void) => {
    const rs = createReadStream(srcPath);
    let stream: Readable | Writable = rs;
    if (gz) { stream = rs.pipe(zlib.createGunzip()); }
    stream.pipe(tar.extract(destPath)
      .on("error", (err) => {
        throw err;
      }).on("finish", () => {
        resolve(true);
      }))
      .on("error", (err) => {
        throw err;
      });
  });
};

const extractZipFile = async (srcPath: string, destPath: string): Promise<boolean> => {
  const zipFile = await openZip(srcPath, { lazyEntries: true });
  if (zipFile === undefined) {
    const errMsg = `Cannot find ${srcPath}`;
    logger.error(errMsg);
    throw Error(errMsg);
  }
  const extractionComplete = new Promise((resolve: (value: boolean) => void) => {
    zipFile.on("close", () => {
      resolve(true);
    });
  });
  zipFile.on("entry", async (entry) => {
    await ensureDirSync(path.dirname(`${destPath}/${entry.fileName}`));
    if (/\/$/.test(entry.fileName)) {
      // directory file names end with '/'
      zipFile.readEntry();
    } else {
      zipFile.openReadStream(entry, (err, readStream) => {
        if (err) { throw err; }
        const filter = new Transform();
        filter._transform = (chunk, encoding, cb) => {
          cb(undefined, chunk);
        };
        filter._flush = (cb) => {
          cb();
          zipFile.readEntry();
        };
        const writeStream = createWriteStream(`${destPath}/${entry.fileName}`);
        if (writeStream === undefined || readStream === undefined) {
          const errMsg = `Could not write file to disk ${entry.fileName}`;
          logger.error(errMsg);
          throw new Error(errMsg);
        }
        readStream.pipe(filter).pipe(writeStream);
      });
    }
  });
  zipFile.readEntry();
  return extractionComplete;
};
