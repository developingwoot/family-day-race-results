export interface Tournament {
  id: string;
  name: string;
  date: Date;
  tournamentType: 'singleDay' | 'multiDay';
  status: 'setup' | 'qualifying' | 'heats' | 'final' | 'completed';
  qualifyingStart: Date;
  qualifyingEnd: Date;
  heatsStart: Date;
  finalStart: Date;
  
  // Configuration
  sitesIncluded: string[];
  qualifiersPerSite: number;
  
  // Results tracking
  qualifyingResults: {
    [siteId: string]: {
      playerId: string;
      playerName: string;
      time: number;
      raceId: string;
    }[];
  };
  
  heats: {
    heatId: string;
    heatNumber: number;
    status: 'scheduled' | 'completed';
    scheduledTime: Date;
    raceId?: string;
    participants: {
      playerId: string;
      playerName: string;
      site: string;
      position?: number;
      points?: number;
    }[];
  }[];
  
  finalHeat: {
    status: 'scheduled' | 'completed';
    scheduledTime: Date;
    raceId?: string;
    participants: {
      playerId: string;
      playerName: string;
      site: string;
      position?: number;
      totalPoints: number;
    }[];
  };
  
  winners: {
    first: { playerId: string; playerName: string; site: string; };
    second: { playerId: string; playerName: string; site: string; };
    third: { playerId: string; playerName: string; site: string; };
  };
}
