import { Router } from 'express';
import { StatusController } from './status.controller';

const router = Router();

/**
 * @swagger
 * /healthz:
 *   get:
 *     summary: Perform a health check on the service
 *     tags: [Status]
 *     description: Checks the status of the service and its connection to the database.
 *     responses:
 *       200:
 *         description: Service is healthy and connected to the database.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 data:
 *                   type: object
 *                   properties:
 *                     read:
 *                       type: boolean
 *                       example: true
 *                     write:
 *                       type: boolean
 *                       example: true
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       503:
 *         description: Service is unhealthy or cannot connect to the database.
 */
router.get('/', new StatusController().checkStatus);

export default router;
