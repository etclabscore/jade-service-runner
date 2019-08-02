import { Router } from "./router";
import * as events from "./events";
import { EventEmitter } from "events";

describe("Should test router", () => {
  let router: Router;
  let notifications: events.ExternalServiceNotifications;
  let testService: events.ExternalServiceNotification;
  beforeEach(() => {
    notifications = new EventEmitter();
    router = new Router(notifications);
    testService = { env: "test-env", name: "test-service", protocol: "ws", rpcPort: "5000", version: "1.0.0" };

  });

  it("should add/remove/resolve service from emitter", () => {
    notifications.emit("launched", testService);
    const routeInfo = router.resolve("/test-service/test-env/1.0.0");
    expect(routeInfo).toBeDefined();
    expect(routeInfo.port).toBe(5000);
    notifications.emit("terminated", testService);
    expect(() => router.resolve("/test-service/test-env/1.0.0")).toThrowError(/^.*Service could not be found.*$/);
  });

  it("should not remove different matching service key with different config", () => {
    notifications.emit("launched", testService);
    let routeInfo = router.resolve("/test-service/test-env/1.0.0");
    expect(routeInfo).toBeDefined();
    notifications.emit("terminated", Object.assign({}, testService, { rpcPort: "6000" }));
    routeInfo = router.resolve("/test-service/test-env/1.0.0");
    expect(routeInfo).toBeDefined();
  });
});
