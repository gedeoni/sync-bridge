import { Router } from 'express';
import { sync, getStats } from './sync.controller';
import { validate } from '../../../middlewares/validate';
import { syncSchema } from './sync.validation';

const router = Router();

/**
 * @swagger
 * /sync/stats:
 *   get:
 *     summary: Get statistics about sync requests
 *     tags: [Sync]
 *     responses:
 *       200:
 *         description: Sync statistics retrieved successfully.
 *       401:
 *         description: Unauthorized, missing or invalid authentication headers.
 *       500:
 *         description: Internal server error.
 */
router.get('/stats', getStats);

/**
 * @swagger
 * /sync:
 *   post:
 *     summary: Sync data for various models (customers, products, orders)
 *     tags: [Sync]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *                 description: The name of the model to sync.
 *                 enum: [customers, products, orders]
 *               data:
 *                 type: array
 *                 description: An array of records to sync.
 *                 items:
 *                   type: object
 *           examples:
 *             sync_customers:
 *               summary: Example for syncing customers
 *               value:
 *                 model: "customers"
 *                 data: [{ "email": "test@example.com", "first_name": "Test", "last_name": "User" }]
 *             sync_orders:
 *               summary: Example for syncing an order with items
 *               value:
 *                 model: "orders"
 *                 data: [{ "order_number": "ORD-123", "customer_id": 1, "status": "pending", "amount": 1500, "items": [{ "product_id": 1, "qty": 1, "unit_price": 1500 }] }]
 *     responses:
 *       200:
 *         description: Sync operation was successful.
 *       400:
 *         description: Bad request, such as an invalid model name or validation error.
 *       401:
 *         description: Unauthorized, missing or invalid authentication headers.
 *       500:
 *         description: Internal server error during the sync process.
 */
router.post('/', validate(syncSchema), sync);

export default router;
