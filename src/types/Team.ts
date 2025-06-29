export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  settings: {
    isPrivate: boolean;
    allowMemberInvites: boolean;
    requireApproval: boolean;
  };
  stats: {
    totalTrades: number;
    totalPnL: number;
    winRate: number;
  };
}

export interface TeamMember {
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
  isActive: boolean;
}

export interface TeamTrade {
  id: string;
  team: string;
  stockName: string;
  entryPrice: number;
  entryDate: string;
  currentPrice?: number;
  exitPrice?: number;
  exitDate?: string;
  quantity: number;
  status: 'open' | 'closed';
  remarks?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  strategy?: string;
  riskLevel: 'low' | 'medium' | 'high';
  targetPrice?: number;
  stopLoss?: number;
  votes: TeamVote[];
  pnl: number;
  pnlPercentage: number;
  month: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamVote {
  user: {
    id: string;
    name: string;
    email: string;
  };
  vote: 'buy' | 'sell' | 'hold';
  votedAt: string;
  comment?: string;
}