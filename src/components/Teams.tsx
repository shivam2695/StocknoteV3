import React, { useState } from 'react';
import { Team, TeamMember } from '../types/Team';
import { useTeams } from '../hooks/useTeams';
import { useEmailValidation } from '../hooks/useEmailValidation';
import { 
  Users, 
  PlusCircle, 
  Settings, 
  Crown, 
  UserPlus, 
  Mail,
  TrendingUp,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle,
  X,
  FileText
} from 'lucide-react';

interface TeamsProps {
  userEmail: string;
  onAddNotification: (notification: any) => void;
}

export default function Teams({ userEmail, onAddNotification }: TeamsProps) {
  const {
    teams,
    currentTeam,
    teamTrades,
    loading,
    error,
    setCurrentTeam,
    createTeam,
    addTeamMember,
    removeTeamMember,
    createTeamTrade,
    voteOnTrade,
    loadTeamTrades
  } = useTeams(userEmail);

  const { validateEmail, isValidating } = useEmailValidation();

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'journal' | 'focus'>('journal');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const team = await createTeam({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined
      });
      
      setShowCreateTeam(false);
      setTeamName('');
      setTeamDescription('');
      
      onAddNotification({
        type: 'system',
        title: 'Team Created',
        message: `Team "${team.name}" has been created successfully!`
      });
    } catch (error: any) {
      console.error('Create team error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberEmail.trim() || !currentTeam) return;
    
    // Validate email first
    const validation = await validateEmail(memberEmail.trim());
    if (!validation.isValid) {
      setEmailError(validation.message || 'Invalid email');
      return;
    }
    
    setEmailError('');
    setIsSubmitting(true);
    try {
      await addTeamMember(currentTeam.id, memberEmail.trim(), memberRole);
      
      setShowAddMember(false);
      setMemberEmail('');
      setMemberRole('member');
      
      onAddNotification({
        type: 'team_invite',
        title: 'Member Added',
        message: `${memberEmail} has been added to ${currentTeam.name}`
      });
    } catch (error: any) {
      console.error('Add member error:', error);
      setEmailError(error.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeamSelect = async (team: Team) => {
    setCurrentTeam(team);
    await loadTeamTrades(team.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // No teams state
  if (teams.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">Collaborate with others on trading decisions</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Teams Yet</h3>
          <p className="text-gray-600 mb-6">Create your first team to start collaborating on trades</p>
          
          <button
            onClick={() => setShowCreateTeam(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create Team</span>
          </button>
        </div>

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Create Team</h2>
                <button
                  onClick={() => setShowCreateTeam(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter team name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe your team's trading strategy..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeam(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSubmitting || !teamName.trim()}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Teams list view
  if (!currentTeam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">Select a team to view trades and collaborate</p>
          </div>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create Team</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => handleTeamSelect(team)}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border hover:border-blue-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Members</div>
                  <div className="text-lg font-bold text-gray-900">
                    {team.members.filter(m => m.isActive).length}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{team.name}</h3>
              {team.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{team.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Total Trades</div>
                  <div className="font-semibold text-gray-900">{team.stats.totalTrades}</div>
                </div>
                <div>
                  <div className="text-gray-500">Win Rate</div>
                  <div className="font-semibold text-gray-900">{team.stats.winRate.toFixed(1)}%</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-gray-500 text-xs">Total P&L</div>
                <div className={`font-bold ${team.stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(team.stats.totalPnL)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Create Team</h2>
                <button
                  onClick={() => setShowCreateTeam(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter team name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe your team's trading strategy..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeam(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSubmitting || !teamName.trim()}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Team detail view with dual sub-tabs
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentTeam(null)}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Teams
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentTeam.name}</h1>
            <p className="text-gray-600 mt-1">{currentTeam.description || 'Team trading dashboard'}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Total Members</h3>
            <Users className="w-6 h-6" />
          </div>
          <div className="text-3xl font-bold">{currentTeam.members.filter(m => m.isActive).length}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Total Trades</h3>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="text-3xl font-bold">{currentTeam.stats.totalTrades}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Win Rate</h3>
            <Target className="w-6 h-6" />
          </div>
          <div className="text-3xl font-bold">{currentTeam.stats.winRate.toFixed(1)}%</div>
        </div>

        <div className={`rounded-xl p-6 text-white ${
          currentTeam.stats.totalPnL >= 0 
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
            : 'bg-gradient-to-br from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Total P&L</h3>
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(currentTeam.stats.totalPnL)}</div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Team Members</h2>
        <div className="space-y-3">
          {currentTeam.members.filter(m => m.isActive).map((member) => (
            <div key={member.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {member.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{member.user.name}</div>
                  <div className="text-sm text-gray-500">{member.user.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {member.role === 'admin' && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  member.role === 'admin' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : member.role === 'member'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Dual View Tabs */}
      <div className="bg-white rounded-xl shadow-lg">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveSubTab('journal')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'journal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>📓 Journal</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSubTab('focus')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'focus'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>⭐ Focus Stocks</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeSubTab === 'journal' ? (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Team Trading Journal</h3>
              {teamTrades.length > 0 ? (
                <div className="space-y-4">
                  {teamTrades.map((trade) => (
                    <div key={trade.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-lg text-gray-900">{trade.stockName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            trade.status === 'open' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {trade.status === 'open' ? '🔄 Active' : '✅ Closed'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Team Trade
                          </span>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(trade.pnl)} ({trade.pnlPercentage.toFixed(2)}%)
                          </div>
                          <div className="text-sm text-gray-500">
                            by {trade.createdBy.name}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Entry Price</div>
                          <div className="font-semibold">{formatCurrency(trade.entryPrice)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Quantity</div>
                          <div className="font-semibold">{trade.quantity}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Entry Date</div>
                          <div className="font-semibold">
                            {new Date(trade.entryDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Risk Level</div>
                          <div className={`font-semibold ${
                            trade.riskLevel === 'high' ? 'text-red-600' :
                            trade.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {trade.riskLevel}
                          </div>
                        </div>
                      </div>

                      {trade.remarks && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-700">{trade.remarks}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No team trades yet</p>
                  <p className="text-sm text-gray-400 mt-1">Trades taken by team members will appear here</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Team Focus Stocks</h3>
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Team focus stocks coming soon</p>
                <p className="text-sm text-gray-400 mt-1">Shared watchlist for team collaboration</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setEmailError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => {
                    setMemberEmail(e.target.value);
                    setEmailError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    emailError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="member@example.com"
                  required
                  disabled={isSubmitting || isValidating}
                />
                {emailError && (
                  <div className="mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">{emailError}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setEmailError('');
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting || isValidating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting || isValidating || !memberEmail.trim()}
                >
                  {isSubmitting ? 'Adding...' : isValidating ? 'Validating...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}