import express from 'express';
import stationsRouter from './stations.js';
import personnelRouter from './personnel.js';
import inventoryRouter from './inventory.js';
import cargoRouter from './cargo.js';
import routesRouter from './routesPlanner.js';
import hazardsRouter from './hazards.js';
import sosRouter from './sos.js';
import wellnessRouter from './wellness.js';
import alertsRouter from './alerts.js';
import complianceRouter from './compliance.js';
import auditRouter from './audit.js';
import mlRouter from './ml.js';

const router = express.Router();

router.use('/stations', stationsRouter);
router.use('/personnel', personnelRouter);
router.use('/inventory', inventoryRouter);
router.use('/cargo', cargoRouter);
router.use('/routes', routesRouter);
router.use('/hazards', hazardsRouter);
router.use('/sos', sosRouter);
router.use('/wellness', wellnessRouter);
router.use('/alerts', alertsRouter);
router.use('/compliance', complianceRouter);
router.use('/audit', auditRouter);
router.use('/ml', mlRouter);

export default router;
