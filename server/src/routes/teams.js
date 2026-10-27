const express = require('express');
const { body, param } = require('express-validator');
const teamsController = require('../controllers/teamsController');
const { validate } = require('../middleware/validate');
const jerseyColors = require('../../../database/team-colors.json');

const router = express.Router();
const validJerseyColors = jerseyColors.map(({ name }) => name);
const teamIdValidation = param('id')
  .isInt({ min: 1 })
  .withMessage('Invalid team ID parameter');

// Validation chains
const createTeamValidation = [
  body('team_name')
    .trim()
    .notEmpty()
    .withMessage('team_name is required')
    .isLength({ max: 150 })
    .withMessage('team_name cannot exceed 150 characters'),
  body('short_name')
    .trim()
    .notEmpty()
    .withMessage('short_name is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('short_name must be between 2 and 10 characters'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('city is required')
    .isLength({ max: 100 })
    .withMessage('city cannot exceed 100 characters'),
  body('coach')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('coach cannot exceed 100 characters'),
  body('jersey_color')
    .notEmpty()
    .isIn(validJerseyColors)
    .withMessage(`jersey_color must be one of: ${validJerseyColors.join(', ')}`),
  body('home_venue_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('home_venue_id must be a positive integer'),
  body('founded_year')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 })
    .withMessage('founded_year must be a valid year'),
  body('titles_won')
    .optional()
    .isInt({ min: 0, max: 255 })
    .withMessage('titles_won must be a whole number between 0 and 255')
];

const updateTeamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID parameter'),
  body('team_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('team_name cannot be empty')
    .isLength({ max: 150 })
    .withMessage('team_name cannot exceed 150 characters'),
  body('short_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('short_name cannot be empty')
    .isLength({ min: 2, max: 10 })
    .withMessage('short_name must be between 2 and 10 characters'),
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('city cannot be empty')
    .isLength({ max: 100 })
    .withMessage('city cannot exceed 100 characters'),
  body('coach')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('coach cannot exceed 100 characters'),
  body('jersey_color')
    .optional()
    .isIn(validJerseyColors)
    .withMessage(`jersey_color must be one of: ${validJerseyColors.join(', ')}`),
  body('captain_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('captain_id must be a positive integer'),
  body('home_venue_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('home_venue_id must be a positive integer'),
  body('founded_year')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 })
    .withMessage('founded_year must be a valid year'),
  body('titles_won')
    .optional()
    .isInt({ min: 0, max: 255 })
    .withMessage('titles_won must be a whole number between 0 and 255')
];

// Routes
router.get('/', teamsController.getAllTeams);
router.get('/:id', teamIdValidation, validate, teamsController.getTeamById);
router.get('/:id/players', teamIdValidation, validate, teamsController.getTeamPlayers);
router.post('/', createTeamValidation, validate, teamsController.createTeam);
router.put('/:id', updateTeamValidation, validate, teamsController.updateTeam);
router.delete('/:id', teamIdValidation, validate, teamsController.deleteTeam);

module.exports = router;
