import { wsFrontend } from "./wsFrontend";
import { httpFrontend } from "./httpFrontend";
import { Protocol } from "../util";
import { Frontend } from "./types";
/**
 * frontendRegistry - is a Map of protocol to frontend used to instantiate the outward facing ports to route
 * all protocol specific request through.
 */
export const frontendRegistry = new Map<Protocol, Frontend>([
  ["ws", wsFrontend],
  ["http", httpFrontend],
]);
