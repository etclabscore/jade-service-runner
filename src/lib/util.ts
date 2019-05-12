export const getOS = ():string =>{
  switch (process.platform){
    case "darwin": return "osx";
    case "freebsd": return "linux";
    case "linux": return "linux";
    case "win32":return "windows";
    default: throw new Error("unsupported platform")

  }    
}