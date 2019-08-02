import path from "path";
import { copyFile, ensureDirSync, createReadStream, createWriteStream } from "fs-extra";
import { mkdir } from "fs";
import { Readable, Writable, Transform } from "stream";
import { promisify } from "util";
import yauzl, { ZipFile } from "yauzl";
import tar from "tar-fs";
import zlib from "zlib";
import request from "request";
import net, { AddressInfo } from "net";
import dgram, { Socket } from "dgram";
import { makeLogger } from "./logging";
import url from "url";

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

export type Protocol = "udp" | "tcp" | "ws" | "http" | "https" | "wss";
const SOCKET_CONNECTIVITY_TIMEOUT = 5000;
/**
 * Returns true or false if port cannot be connected to. For services support RPC discover
 * isUp will check the RPC discover response to verify connectivity across protocols.
 * For services without RPC discover, service will just test raw connectivity with TCP.
 * and port availibility with UDP.
 *
 * For UDP an unavailable port implies connectivity.
 *
 * @returns true if the port is able to be connected to, false otherwise
 */
export async function isUp(port: number, protocol: Protocol): Promise<boolean> {
  switch (protocol) {
    case "tcp":
      try {
        await tcpSocketTest(port);
        return true;
      } catch (e) {
        logger.error(e.message);
        return false;
      }
    case "udp":
      try {
        await getAvailableUDPPort(port);
        logger.error(`Port is still available`);
        return false;
      } catch (e) {
        return true;
      }
    default:
      throw new Error("Unsupported healthcheck protocol");
  }
}

function tcpSocketTest(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const handleError = (err: Error) => {
      logger.debug(err);
      socket.destroy();
      reject(err);
    };
    socket.once("error", handleError);
    socket.once("timeout", handleError);
    socket.setTimeout(SOCKET_CONNECTIVITY_TIMEOUT);
    socket.connect(port, "localhost", () => {
      resolve();
    });
  });
}
// Note this might be problematic if there are collisions
/**
 * Returns a set of TCP and UDP Ports.
 *
 *
 * @returns a set of free TCP and UDP Ports
 */
export async function getFreePorts(): Promise<IDynamicPorts> {
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
export const getAvailableTCPPort = (testPort: number = 0): Promise<number> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on("error", reject);
  server.listen(testPort, () => {
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
export const getAvailableUDPPort = (testPort: number = 0) => new Promise((resolve, reject) => {

  const socket = dgram.createSocket("udp4");
  socket.on("error", reject);
  socket.bind({ port: testPort }, () => {
    const { port } = socket.address() as AddressInfo;
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
export const downloadAsset = async (assetURI: string, dir: string, timeout: number = 120000): Promise<string> => {
  const uri = url.parse(assetURI);
  if (uri === undefined || uri.pathname === undefined) {
    const err = new Error(`Could not parse download url`);
    logger.error(err);
    throw err;
  }

  const pathParts = uri.pathname.split("/");
  const tailPart = pathParts.pop();
  let fileName = "";
  if (tailPart) { fileName = tailPart; }
  await fsMkdir(dir, { recursive: true });
  const downloadPath = `${dir}/${fileName}`;

  if (uri.protocol === "file:") {
    await copyFile(uri.pathname, downloadPath);
    return downloadPath;
  }
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
