const express = require('express');
const router = express.Router();
const {
  getPolicies,
  getPolicyByType,
  getPolicy,
  createOrUpdatePolicy,
  updatePolicy,
  deletePolicy
} = require('../controller/policyController');
const { protectAdmin } = require('../middleware/adminAuth');

// CRITICAL: Public routes MUST come before parameterized routes
// Route order matters in Express - more specific routes first
// This route must be defined before /:id to avoid route conflicts
router.get('/type/:type', (req, res, next) => {
  // Add logging for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Route /type/:type matched, type:', req.params.type);
  }
  getPolicyByType(req, res, next);
});

// Admin routes - using protectAdmin middleware
// These must come after the /type/:type route to avoid route conflicts
router.get('/', protectAdmin, getPolicies);
router.post('/', protectAdmin, createOrUpdatePolicy);
router.get('/:id', protectAdmin, getPolicy);
router.put('/:id', protectAdmin, updatePolicy);
router.delete('/:id', protectAdmin, deletePolicy);

module.exports = router;

