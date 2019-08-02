import { wsBackend } from "./wsBackend";
import { httpBackend } from "./httpBackend";
/**
 * backendRegistry - is a map from protocol to backend to instantiate
 */
export const backendRegistry = {
  ws: wsBackend,
  http: httpBackend,
};
