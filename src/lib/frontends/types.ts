import { ConnectionInfo, ConnectionBus } from "../connection";
export type Teardown = () => Promise<void>;
export type Frontend = (connection: ConnectionInfo, connectionBus: ConnectionBus) => Teardown;
