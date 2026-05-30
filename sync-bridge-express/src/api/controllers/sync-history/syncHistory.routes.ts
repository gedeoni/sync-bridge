import { Router } from 'express';
import * as syncHistoryController from './syncHistory.controller';

const router = Router();

/**
 * @swagger
 * /sync-history:
 *   get:
 *     summary: Get all sync history records
 *     tags: [Sync History]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number for pagination.
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *         description: The number of items per page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [successful, failed, invalid, pending_retry]
 *         description: Filter by sync status.
 *     responses:
 *       200:
 *         description: A list of sync history records.
 *       401:
 *         description: Unauthorized, missing or invalid authentication headers.
 *       500:
 *         description: Internal server error.
 */
router.get('/', syncHistoryController.getAll);

/**
 * @swagger
 * /sync-history/{id}:
 *   get:
 *     summary: Get a single sync history record by ID
 *     tags: [Sync History]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the sync history record.
 *     responses:
 *       200:
 *         description: The sync history record.
 *       401:
 *         description: Unauthorized, missing or invalid authentication headers.
 *       404:
 *         description: Sync history not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:id', syncHistoryController.getById);

/**
 * @swagger
 * /sync-history/retry/{id}:
 *   post:
 *     summary: Retry a failed sync request
 *     tags: [Sync History]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the sync history record to retry.
 *     responses:
 *       200:
 *         description: The sync history record will be retried.
 *       400:
 *         description: Bad request, for example, trying to retry a successful sync.
 *       401:
 *         description: Unauthorized, missing or invalid authentication headers.
 *       404:
 *         description: Sync history not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/retry/:id', syncHistoryController.retry);

/**
 * @swagger
 * /sync-history/{id}:
 *   delete:
 *     summary: Delete a sync history record
 *     tags: [Sync History]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the sync history record to delete.
 *     responses:
 *       204:
 *         description: The sync history record was deleted successfully.
 *       401:
 *         description: Unauthorized, missing or invalid authentication headers.
 *       404:
 *         description: Sync history not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:id', syncHistoryController.deleteById);

export default router;
