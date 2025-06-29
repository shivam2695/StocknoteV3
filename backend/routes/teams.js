const express = require('express');
const Team = require('../models/Team');
const TeamTrade = require('../models/TeamTrade');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateTeam = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Team name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// @route   GET /api/teams
// @desc    Get user's teams
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.getUserTeams(req.user._id);
    
    res.json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams'
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');
    
    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is a member
    if (!team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    res.json({
      success: true,
      data: { team }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
});

// @route   GET /api/teams/:id/stats
// @desc    Get team statistics
// @access  Private
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is a member
    if (!team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    const stats = await TeamTrade.getTeamStats(req.params.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team statistics'
    });
  }
});

// @route   POST /api/teams
// @desc    Create new team
// @access  Private
router.post('/', auth, validateTeam, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const teamData = {
      ...req.body,
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }]
    };
    
    const team = new Team(teamData);
    await team.save();
    
    // Populate the team data
    await team.populate('members.user', 'name email');
    await team.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team }
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team'
    });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private
router.put('/:id', auth, validateTeam, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const team = await Team.findById(req.params.id);
    
    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is admin
    if (!team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team admins can update team details.'
      });
    }
    
    Object.assign(team, req.body);
    await team.save();
    
    await team.populate('members.user', 'name email');
    await team.populate('createdBy', 'name email');
    
    res.json({
      success: true,
      message: 'Team updated successfully',
      data: { team }
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
});

// @route   POST /api/teams/:id/members
// @desc    Add member to team
// @access  Private
router.post('/:id/members', auth, [
  body('userEmail')
    .isEmail()
    .withMessage('Valid email is required'),
  body('role')
    .optional()
    .isIn(['admin', 'member', 'viewer'])
    .withMessage('Role must be admin, member, or viewer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userEmail, role = 'member' } = req.body;
    
    const team = await Team.findById(req.params.id);
    
    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is admin
    if (!team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team admins can add members.'
      });
    }
    
    // Find user by email
    const User = require('../models/User');
    const userToAdd = await User.findOne({ email: userEmail });
    
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }
    
    // Add member to team
    team.addMember(userToAdd._id, role);
    await team.save();
    
    await team.populate('members.user', 'name email');
    
    res.json({
      success: true,
      message: 'Member added successfully',
      data: { team }
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding team member'
    });
  }
});

// @route   DELETE /api/teams/:id/members/:userId
// @desc    Remove member from team
// @access  Private
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is admin or removing themselves
    if (!team.isAdmin(req.user._id) && req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team admins can remove members.'
      });
    }
    
    // Remove member from team
    const removed = team.removeMember(req.params.userId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in team'
      });
    }
    
    await team.save();
    
    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing team member'
    });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is admin
    if (!team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team admins can delete the team.'
      });
    }
    
    team.isActive = false;
    await team.save();
    
    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
});

module.exports = router;