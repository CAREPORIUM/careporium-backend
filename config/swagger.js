import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Careporium API",
            version: "1.0.0",
            description:
                "API documentation for the Careporium Healthcare Worker Shift Marketplace"
        },

        servers: [
            {
                url: "http://localhost:8089"
            }
        ]
    },

    apis: ["./routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;