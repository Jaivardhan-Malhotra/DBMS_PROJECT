const express = require('express');
const { body, param } = require('express-validator');
const matchesController = require('../controllers/matchesController');
const { validate } = require('../middleware/validate');

const router = express.Router();

const VALID_MATCH_STATUS = ['Scheduled', 'Live', 'Completed', 'Cancelled', 'No Result'];

// Validation chains
const createMatchValidation = [
  body('season_id')
    .notEmpty()
    .withMessage('season_id is required')
    .isInt({ min: 1 })
    .withMessage('season_id must be a positive integer'),
  body('venue_id')
    .notEmpty()
    .withMessage('venue_id is required')
    .isInt({ min: 1 })
    .withMessage('venue_id must be a positive integer'),
  body('team1_id')
    .notEmpty()
    .withMessage('team1_id is required')
    .isInt({ min: 1 })
    .withMessage('team1_id must be a positive integer'),
  body('team2_id')
    .notEmpty()
    .withMessage('team2_id is required')
    .isInt({ min: 1 })
    .withMessage('team2_id must be a positive integer')
    .custom((value, { req }) => {
      if (Number(value) === Number(req.body.team1_id)) {
        throw new Error('team2_id cannot be the same as team1_id');
      }
      return true;
    }),
  body('match_date')
    .notEmpty()
    .withMessage('match_date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('match_date must use YYYY-MM-DD format')
    .isISO8601({ strict: true })
    .withMessage('match_date must be a valid date in YYYY-MM-DD format'),
  body('match_time')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
    .withMessage('match_time must be a valid 24-hour time'),
  body('status')
    .optional()
    .isIn(VALID_MATCH_STATUS)
    .withMessage(`status must be one of: ${VALID_MATCH_STATUS.join(', ')}`)
];

const updateMatchValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid match ID parameter'),
  body('season_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('season_id must be a positive integer'),
  body('venue_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('venue_id must be a positive integer'),
  body('team1_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('team1_id must be a positive integer'),
  body('team2_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('team2_id must be a positive integer')
    .custom((value, { req }) => {
      if (req.body.team1_id !== undefined && Number(value) === Number(req.body.team1_id)) {
        throw new Error('team2_id cannot be the same as team1_id');
      }
      return true;
    }),
  body('match_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('match_date must use YYYY-MM-DD format')
    .isISO8601({ strict: true })
    .withMessage('match_date must be a valid date in YYYY-MM-DD format'),
  body('match_time')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
    .withMessage('match_time must be a valid 24-hour time'),
  body('status')
    .optional()
    .isIn(VALID_MATCH_STATUS)
    .withMessage(`status must be one of: ${VALID_MATCH_STATUS.join(', ')}`)
];

// Routes
router.get('/', matchesController.getAllMatches);
router.get(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid match ID parameter'),
  validate,
  matchesController.getMatchById
);
router.post('/', createMatchValidation, validate, matchesController.createMatch);
router.put('/:id', updateMatchValidation, validate, matchesController.updateMatch);
router.delete(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid match ID parameter'),
  validate,
  matchesController.deleteMatch
);

module.exports = router;
