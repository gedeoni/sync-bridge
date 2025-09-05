"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Exporter Service API',
            version: '1.0.0',
            description: 'API documentation for an a middleware service receiving data from various ERPs',
        },
        servers: [
            {
                url: '/api/v1',
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/api/controllers/**/*.routes.ts', './src/api/controllers/**/*.controller.ts'], // Path to the API docs
};
const specs = (0, swagger_jsdoc_1.default)(options);
exports.default = specs;
