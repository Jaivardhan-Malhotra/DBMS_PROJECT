const express = require('express');
const { body, param } = require('express-validator');
const playersController = require('../controllers/playersController');
const { validate } = require('../middleware/validate');

const router = express.Router();

const VALID_ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
const VALID_BATTING_STYLES = ['Right-Hand', 'Left-Hand'];

// Validation chains
const createPlayerValidation = [
  body('player_name')
    .trim()
    .notEmpty()
    .withMessage('player_name is required')
    .isLength({ max: 150 })
    .withMessage('player_name cannot exceed 150 characters'),
  body('role')
    .notEmpty()
    .withMessage('role is required')
    .isIn(VALID_ROLES)
    .withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
  body('batting_style')
    .optional()
    .isIn(VALID_BATTING_STYLES)
    .withMessage(`batting_style must be one of: ${VALID_BATTING_STYLES.join(', ')}`),
  body('nationality')
    .trim()
    .notEmpty()
    .withMessage('nationality is required')
    .isLength({ max: 100 })
    .withMessage('nationality cannot exceed 100 characters'),
  body('bowling_style')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('bowling_style cannot exceed 100 characters'),
  body('dob')
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dob must use YYYY-MM-DD format')
    .isISO8601({ strict: true })
    .withMessage('dob must be a valid date'),
  body('team_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('team_id must be a positive integer'),
  body('jersey_no')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 99 })
    .withMessage('jersey_no must be between 0 and 99'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean or 0/1')
];

const updatePlayerValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid player ID parameter'),
  body('player_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('player_name cannot be empty')
    .isLength({ max: 150 })
    .withMessage('player_name cannot exceed 150 characters'),
  body('role')
    .optional()
    .isIn(VALID_ROLES)
    .withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
  body('batting_style')
    .optional()
    .isIn(VALID_BATTING_STYLES)
    .withMessage(`batting_style must be one of: ${VALID_BATTING_STYLES.join(', ')}`),
  body('nationality')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('nationality cannot be empty')
    .isLength({ max: 100 })
    .withMessage('nationality cannot exceed 100 characters'),
  body('bowling_style')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('bowling_style cannot exceed 100 characters'),
  body('dob')
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dob must use YYYY-MM-DD format')
    .isISO8601({ strict: true })
    .withMessage('dob must be a valid date'),
  body('team_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('team_id must be a positive integer'),
  body('jersey_no')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 99 })
    .withMessage('jersey_no must be between 0 and 99'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean or 0/1')
];

// Routes
router.get('/', playersController.getAllPlayers);
router.get(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid player ID parameter'),
  validate,
  playersController.getPlayerById
);
router.post('/', createPlayerValidation, validate, playersController.createPlayer);
router.put('/:id', updatePlayerValidation, validate, playersController.updatePlayer);
router.delete(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Invalid player ID parameter'),
  validate,
  playersController.deletePlayer
);

module.exports = router;
