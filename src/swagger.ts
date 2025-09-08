import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Exporter Service API',
      version: '1.0.0',
      description: 'API documentation for an Exporter Service, accepting data from various ERPs',
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

const specs = swaggerJsdoc(options);

export default specs;
