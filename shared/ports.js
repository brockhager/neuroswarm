export const PORTS = {
    NS_NODE: 3009,
    NS_DESKTOP: 3011,
    NEURO_SERVICES: 3007,
    NEURO_RUNNER: 3008,
    NEURO_WEB: 3005,
    ADMIN_NODE: 3000,
    GATEWAY_NODE: 8080,
    VP_NODE: 3002
};

export const SERVICE_URLS = {
    LEARNING_SERVICE: `http://localhost:${PORTS.NEURO_SERVICES}/learning`,
    GATEWAY_DEFAULT: `http://localhost:${PORTS.GATEWAY_NODE}`
};
