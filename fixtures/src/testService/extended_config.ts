export const simpleMathConfig = (assetLocation: string) => {
  return {
    services: [
      {
        name: "simple-math",
        version: "1.0.0",
        rpcPort: "${DYNAMIC_TCP_PORT_1}",
        environments: [
          {
            name: "http",
            args: {
              start: ["${SERVICE_DIR}/index.js", "--port=${DYNAMIC_TCP_PORT_1}", "--mode=http"],
              stop: [],
              teardown: [],
            },
            health: {
              interval: 20000,
              retries: 5,
              port: "${DYNAMIC_TCP_PORT_1}",
              protocol: "tcp",
            },
          },
          {
            rpcPort: "${DYNAMIC_TCP_PORT_1}",
            name: "ws",
            args: {
              start: ["${SERVICE_DIR}/index.js", "--port=${DYNAMIC_TCP_PORT_1}", "--mode=ws"],
              stop: [],
              teardown: [],
            },
            health: {
              interval: 20000,
              retries: 5,
              port: "${DYNAMIC_TCP_PORT_1}",
              protocol: "tcp",
            },
          },
        ],
        os: {
          osx: {
            commands: {
              setup: [],
              start: "node",
              stop: "",
              teardown: "",
            },
            assets: [`file://${assetLocation}/testService.zip`],
          },
          linux: {
            commands: {
              setup: [],
              start: "node",
              stop: "",
              teardown: "",
            },
            assets: [`file://${assetLocation}/testService.zip`],
          },
          windows: {
            commands: {
              setup: [],
              start: "node",
              stop: "",
              teardown: "",
            },
            assets: [`file://${assetLocation}/testService.zip`],
          },
        },

      },
    ],
  };
};
