import { useState, useEffect } from 'react';
import { Team, TeamMember, TeamTrade } from '../types/Team';
import { apiService } from '../services/api';

export function useTeams(userEmail?: string) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamTrades, setTeamTrades] = useState<TeamTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's teams
  const loadTeams = async () => {
    if (!userEmail) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getTeams();
      
      if (response.success && response.data.teams) {
        setTeams(response.data.teams);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
      console.error('Load teams error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load team trades
  const loadTeamTrades = async (teamId: string) => {
    try {
      setLoading(true);
      const response = await apiService.getTeamTrades(teamId);
      
      if (response.success && response.data.trades) {
        setTeamTrades(response.data.trades);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team trades');
      console.error('Load team trades error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [userEmail]);

  const createTeam = async (teamData: { name: string; description?: string }) => {
    try {
      const response = await apiService.createTeam(teamData);
      
      if (response.success) {
        await loadTeams();
        return response.data.team;
      }
    } catch (error) {
      console.error('Create team error:', error);
      throw error;
    }
  };

  const addTeamMember = async (teamId: string, userEmail: string, role: string = 'member') => {
    try {
      const response = await apiService.addTeamMember(teamId, userEmail, role);
      
      if (response.success) {
        await loadTeams();
        if (currentTeam?.id === teamId) {
          const teamResponse = await apiService.getTeam(teamId);
          if (teamResponse.success) {
            setCurrentTeam(teamResponse.data.team);
          }
        }
      }
    } catch (error) {
      console.error('Add team member error:', error);
      throw error;
    }
  };

  const removeTeamMember = async (teamId: string, userId: string) => {
    try {
      const response = await apiService.removeTeamMember(teamId, userId);
      
      if (response.success) {
        await loadTeams();
        if (currentTeam?.id === teamId) {
          const teamResponse = await apiService.getTeam(teamId);
          if (teamResponse.success) {
            setCurrentTeam(teamResponse.data.team);
          }
        }
      }
    } catch (error) {
      console.error('Remove team member error:', error);
      throw error;
    }
  };

  const createTeamTrade = async (teamId: string, tradeData: any) => {
    try {
      const response = await apiService.createTeamTrade({
        ...tradeData,
        team: teamId
      });
      
      if (response.success) {
        await loadTeamTrades(teamId);
      }
    } catch (error) {
      console.error('Create team trade error:', error);
      throw error;
    }
  };

  const voteOnTrade = async (tradeId: string, vote: string, comment?: string) => {
    try {
      const response = await apiService.voteOnTeamTrade(tradeId, vote, comment);
      
      if (response.success && currentTeam) {
        await loadTeamTrades(currentTeam.id);
      }
    } catch (error) {
      console.error('Vote on trade error:', error);
      throw error;
    }
  };

  return {
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
    loadTeamTrades,
    refetch: loadTeams
  };
}