import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const MAX_SHOTS = 10;
const DEFAULT_SQUAD = ["Matt", "Zach", "Alex"];
const DEFAULT_STATIONS = 8;

const ADJECTIVES = ["swift","bold","keen","rugged","brisk","clever","mighty","stout","fierce","noble"];
const NOUNS = ["clay","eagle","hawk","ram","bolt","shot","drive","lift","mark","trap"];

const generateGameCode = () => {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit code 1000-9999
};

const generateGameName = () => {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const d = Math.floor(Math.random() * 99) + 1;
  return `${a}-${n}-${d}`;
};

const createInitialScores = (squad, numStations) => {
  const scores = {};
  squad.forEach(name => {
    scores[name] = Array.from({ length: numStations }, () => Array(MAX_SHOTS).fill(null));
  });
  return scores;
};

// ─── Generate quips ────────────────────────────────────────────────────────────
const generateQuips = (squad, scores, numStations) => {
  const totals = squad.map(name => {
    const total = Object.keys(scores[name]).reduce((sum, sIdx) => {
      return sum + scores[name][Number(sIdx)].filter(s => s === 1).length;
    }, 0);
    const possible = numStations * MAX_SHOTS;
    const pct = Math.round((total / possible) * 100);
    const perfectStations = Object.keys(scores[name]).filter(sIdx =>
      scores[name][Number(sIdx)].every(s => s === 1)
    ).length;
    const zeroStations = Object.keys(scores[name]).filter(sIdx =>
      scores[name][Number(sIdx)].filter(s => s === 1).length === 0
    ).length;
    const streaks = [];
    let streak = 0;
    scores[name].forEach(station => {
      station.forEach(shot => {
        if (shot === 1) { streak++; } else { if (streak > 0) streaks.push(streak); streak = 0; }
      });
    });
    if (streak > 0) streaks.push(streak);
    const bestStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
    return { name, total, possible, pct, perfectStations, zeroStations, bestStreak };
  });

  totals.sort((a, b) => b.total - a.total);
  const winner = totals[0];
  const loser = totals[totals.length - 1];

  const quips = [];

  const winnerQuips = [
    `${winner.name} is taking home the trophy! 🏆 Everyone else, better luck next time.`,
    `${winner.name} came, ${winner.name} saw, ${winner.name} crushed it. 💪`,
    `Dust off the trophy case — ${winner.name} is the champ today! 🎯`,
    `${winner.name} made it look easy. It wasn't, but it looked that way. 😎`,
    `Somebody get ${winner.name} a sponsorship deal! 📸`,
  ];

  const loserQuips = [
    `${loser.name} might wanna stick to fishing. 🎣`,
    `Hey ${loser.name}, there's always next weekend... and the one after that. 😅`,
    `${loser.name} brought the snacks, at least. 🍿`,
    `Rumor has it ${loser.name} is already Googling "how to improve aim." 🔍`,
    `${loser.name} showed up, which is honestly the bravest thing you can do. 🫡`,
  ];

  const streakShooter = totals.reduce((best, t) => t.bestStreak > best.bestStreak ? t : best, totals[0]);
  if (streakShooter.bestStreak >= 5) {
    quips.push(`${streakShooter.name} caught fire with a ${streakShooter.bestStreak}-hit streak! 🔥`);
  }

  const perfectShooter = totals.find(t => t.perfectStations > 0);
  if (perfectShooter) {
    quips.push(`${perfectShooter.name} ran a station clean! ${perfectShooter.perfectStations > 1 ? `Actually, ${perfectShooter.perfectStations} of them!` : 'Straight 10/10!'} 💯`);
  }

  const zeroShooter = totals.find(t => t.zeroStations > 0);
  if (zeroShooter) {
    quips.push(`${zeroShooter.name} had ${zeroShooter.zeroStations} station${zeroShooter.zeroStations > 1 ? 's' : ''} with a big fat zero. Yikes. 😬`);
  }

  if (winner.pct >= 90) {
    quips.push(`${winner.name} hit ${winner.pct}% — are you sure they're not a robot? 🤖`);
  } else if (winner.pct >= 70) {
    quips.push(`${winner.name} hit ${winner.pct}% — solid day at the range! 👏`);
  } else if (winner.pct < 40 && totals.length > 1) {
    quips.push(`${winner.pct}% was enough to win? Rough day for everyone. 😂`);
  }

  if (totals.length > 1 && totals[0].total === totals[1].total) {
    quips.push(`It's a TIE at the top! ${totals.filter(t => t.total === winner.total).map(t => t.name).join(' & ')} — settle it with rock-paper-scissors! ✊✋✌️`);
  }

  return {
    rankings: totals,
    winnerQuip: winnerQuips[Math.floor(Math.random() * winnerQuips.length)],
    loserQuip: loserQuips[Math.floor(Math.random() * loserQuips.length)],
    extraQuips: quips,
  };
};

// ─── Game Summary Screen ───────────────────────────────────────────────────────
function GameSummary({ squad, scores, numStations, onNewGame }) {
  const { rankings, winnerQuip, loserQuip, extraQuips } = generateQuips(squad, scores, numStations);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-900 text-slate-100 min-h-screen font-sans select-none">
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-2xl font-black tracking-tight">Final Results</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{numStations} Stations · {MAX_SHOTS} Shots Each</p>
        </div>

        <div className="space-y-2 mb-6">
          {rankings.map((r, i) => (
            <div key={r.name} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-500/20 border border-amber-500' : 'bg-slate-700/50'}`}>
              <span className="text-2xl">{medals[i] || `#${i + 1}`}</span>
              <div className="flex-1">
                <div className={`font-black ${i === 0 ? 'text-amber-400 text-lg' : 'text-white'}`}>{r.name}</div>
                <div className="text-xs text-slate-400">{r.pct}% accuracy · {r.bestStreak} best streak</div>
              </div>
              <div className="text-right">
                <div className={`font-black ${i === 0 ? 'text-amber-400 text-2xl' : 'text-white text-xl'}`}>{r.total}</div>
                <div className="text-[10px] text-slate-500">of {r.possible}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-700/40 rounded-xl p-4 mb-6 space-y-3 border border-slate-600/50">
          <div className="text-sm text-amber-300 font-bold">{winnerQuip}</div>
          {rankings.length > 1 && <div className="text-sm text-rose-300 font-bold">{loserQuip}</div>}
          {extraQuips.map((quip, i) => (
            <div key={i} className="text-sm text-slate-300">{quip}</div>
          ))}
        </div>

        <button
          onClick={onNewGame}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-lg tracking-wide shadow-lg transition-all active:scale-95"
        >
          🔄 New Game
        </button>
      </div>
    </div>
  );
}

// ─── Squad Setup Screen ────────────────────────────────────────────────────────
function SquadSetup({ onStart, onJoinGame }) {
  const [players, setPlayers] = useState([...DEFAULT_SQUAD]);
  const [newName, setNewName] = useState('');
  const [numStations, setNumStations] = useState(DEFAULT_STATIONS);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const handleJoinWithCode = async () => {
    const code = joinCode.trim();
    if (code.length !== 4) { setJoinError('Enter a 4-digit code'); return; }
    setJoinLoading(true);
    setJoinError('');
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, game_name, game_code, squad, num_stations, scores, status')
        .eq('game_code', code)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        setJoinError('No active game with that code');
        setJoinLoading(false);
        return;
      }
      onJoinGame(data[0]);
    } catch (e) {
      setJoinError('Something went wrong');
    }
    setJoinLoading(false);
  };

  const addPlayer = () => {
    const trimmed = newName.trim();
    if (trimmed && !players.includes(trimmed)) {
      setPlayers([...players, trimmed]);
      setNewName('');
    }
  };

  const removePlayer = (index) => {
    if (players.length <= 1) return;
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index, value) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const validPlayers = players.filter(p => p.trim() !== '');

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-900 text-slate-100 min-h-screen font-sans select-none flex flex-col items-center justify-center">
      <div className="w-full bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🏆</div>
          <h1 className="text-2xl font-black tracking-tight">Squad Setup</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Add your shooters</p>
        </div>

        {/* Join with Code */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">🔗 Join a Game</div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '')); setJoinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
              placeholder="4-digit code"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-black text-center text-xl tracking-[0.5em] placeholder-slate-500 placeholder-tracking-normal placeholder-text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
            <button
              onClick={handleJoinWithCode}
              disabled={joinLoading || joinCode.length !== 4}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-500 text-white px-5 rounded-lg font-bold transition-colors"
            >
              Join
            </button>
          </div>
          {joinError && <div className="text-xs text-rose-400 mt-1 text-center">{joinError}</div>}
        </div>

        <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">— Or Start a New Game —</div>

        <div className="space-y-2 mb-4">
          {players.map((name, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={name}
                onChange={(e) => updatePlayer(i, e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
              <button
                onClick={() => removePlayer(i)}
                className="bg-rose-600 hover:bg-rose-500 text-white w-9 h-9 rounded-lg font-black text-sm flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            placeholder="New shooter name..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <button
            onClick={addPlayer}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-lg font-bold transition-colors"
          >
            + Add
          </button>
        </div>

        <div className="mb-6 bg-slate-700/50 rounded-lg p-3">
          <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">Number of Stations</label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setNumStations(Math.max(1, numStations - 1))}
              className="bg-slate-600 hover:bg-slate-500 text-white w-10 h-10 rounded-lg font-black text-xl flex items-center justify-center transition-colors"
            >
              −
            </button>
            <span className="text-3xl font-black text-amber-400 w-12 text-center">{numStations}</span>
            <button
              onClick={() => setNumStations(Math.min(12, numStations + 1))}
              className="bg-slate-600 hover:bg-slate-500 text-white w-10 h-10 rounded-lg font-black text-xl flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => onStart(validPlayers, numStations)}
          disabled={validPlayers.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-500 text-white py-3 rounded-xl font-black text-lg tracking-wide shadow-lg transition-all active:scale-95"
        >
          👉 Start Scoring ({validPlayers.length} Shooter{validPlayers.length !== 1 ? 's' : ''} · {numStations} Station{numStations !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

// ─── Main Scorecard ────────────────────────────────────────────────────────────
function Scorecard({ squad, numStations, gameId, gameName, gameCode, initialScores, onEndGame }) {
  const [scores, setScores] = useState(initialScores || createInitialScores(squad, numStations));
  const [activeStation, setActiveStation] = useState(null);
  const [activeShooterIndex, setActiveShooterIndex] = useState(0);
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connected'); // connected | syncing | offline
  const scoresRef = useRef(scores);
  const activeStationRef = useRef(activeStation);
  const activeShooterIndexRef = useRef(activeShooterIndex);
  const activeShotIndexRef = useRef(activeShotIndex);

  // Keep refs in sync
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { activeStationRef.current = activeStation; }, [activeStation]);
  useEffect(() => { activeShooterIndexRef.current = activeShooterIndex; }, [activeShooterIndex]);
  useEffect(() => { activeShotIndexRef.current = activeShotIndex; }, [activeShotIndex]);

  // Push state to Supabase
  const syncToSupabase = useCallback(async (newScores, newActiveStation, newActiveShooterIndex, newActiveShotIndex) => {
    if (!gameId) return;
    setSyncStatus('syncing');
    try {
      const rotation = newActiveStation !== null ? getRotation(newActiveStation) : squad;
      const shooter = rotation[newActiveShooterIndex] || null;
      const { error } = await supabase
        .from('games')
        .update({
          scores: newScores,
          active_station: newActiveStation,
          active_shooter: shooter,
          active_shot_index: newActiveShotIndex,
        })
        .eq('id', gameId);
      if (error) console.error('Sync error:', error);
      else setSyncStatus('connected');
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncStatus('offline');
    }
  }, [gameId, squad]);

  // Subscribe to Realtime updates from other devices
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        const newData = payload.new;
        if (!newData) return;

        // Incoming scores from another device — merge them
        if (newData.scores) {
          setScores(prev => {
            const merged = { ...prev };
            for (const name of Object.keys(newData.scores)) {
              if (merged[name]) {
                // Keep the value that's not null (prefer real data)
                const incoming = newData.scores[name];
                for (let s = 0; s < incoming.length; s++) {
                  for (let sh = 0; sh < incoming[s].length; sh++) {
                    if (incoming[s][sh] !== null && merged[name][s][sh] === null) {
                      merged[name] = [...merged[name]];
                      merged[name][s] = [...merged[name][s]];
                      merged[name][s][sh] = incoming[s][sh];
                    }
                  }
                }
              }
            }
            return merged;
          });
        }

        // Sync active cursor position from remote
        if (newData.active_station !== undefined && newData.active_shooter && newData.active_shot_index !== undefined) {
          const rotation = getRotation(newData.active_station);
          const remoteIdx = rotation.indexOf(newData.active_shooter);
          if (remoteIdx !== -1) {
            setActiveStation(newData.active_station);
            setActiveShooterIndex(remoteIdx);
            setActiveShotIndex(newData.active_shot_index);
          }
        }

        setSyncStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSyncStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSyncStatus('offline');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const getRotation = (stationIdx) => {
    const offset = stationIdx % squad.length;
    return [...squad.slice(offset), ...squad.slice(0, offset)];
  };

  const currentRotation = activeStation !== null ? getRotation(activeStation) : squad;
  const activeShooter = currentRotation[activeShooterIndex];
  const nextShooter = currentRotation[(activeShooterIndex + 1) % currentRotation.length];

  const handleSelectStation = (stationIdx) => {
    const rotation = getRotation(stationIdx);
    const leadShooter = rotation[0];
    const leadScores = scores[leadShooter][stationIdx];
    const firstEmpty = leadScores.findIndex(shot => shot === null);
    const newShotIndex = firstEmpty !== -1 ? firstEmpty : 0;

    setActiveStation(stationIdx);
    setActiveShooterIndex(0);
    setActiveShotIndex(newShotIndex);

    syncToSupabase(scoresRef.current, stationIdx, 0, newShotIndex);
  };

  const recordScore = (value) => {
    if (activeStation === null || activeShotIndex === null) return;

    const updated = { ...scores };
    updated[activeShooter] = [...updated[activeShooter]];
    updated[activeShooter][activeStation] = [...updated[activeShooter][activeStation]];
    updated[activeShooter][activeStation][activeShotIndex] = value;
    setScores(updated);

    let newStation = activeStation;
    let newShooterIdx = activeShooterIndex;
    let newShotIdx = activeShotIndex;

    if (activeShotIndex < MAX_SHOTS - 1) {
      newShotIdx = activeShotIndex + 1;
      setActiveShotIndex(newShotIdx);
    } else {
      if (activeShooterIndex < currentRotation.length - 1) {
        newShooterIdx = activeShooterIndex + 1;
        const nextShooterName = currentRotation[newShooterIdx];
        const nextScores = updated[nextShooterName][activeStation];
        const firstEmpty = nextScores.findIndex(shot => shot === null);
        newShotIdx = firstEmpty !== -1 ? firstEmpty : 0;
        setActiveShooterIndex(newShooterIdx);
        setActiveShotIndex(newShotIdx);
      } else {
        newShotIdx = null;
        setActiveShotIndex(null);
      }
    }

    syncToSupabase(updated, newStation, newShooterIdx, newShotIdx);
  };

  const getStationTotal = (shooterName, stationIdx) => {
    return scores[shooterName][stationIdx].reduce((acc, shot) => acc + (shot === 1 ? 1 : 0), 0);
  };

  const getRunningTotal = (shooterName) => {
    return Object.keys(scores[shooterName]).reduce((total, stationIdx) => {
      return total + getStationTotal(shooterName, Number(stationIdx));
    }, 0);
  };

  const syncIndicatorColor = syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500';

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-900 text-slate-100 min-h-screen pb-40 font-sans select-none">

      {/* Game code + sync indicator */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Code:</span>
          <span className="text-sm font-black text-amber-400 tracking-[0.3em]">{gameCode}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${syncIndicatorColor}`} />
          <span className="text-[10px] text-slate-500 uppercase">{syncStatus}</span>
        </div>
      </div>

      {/* SQUAD RUNNING TOTALS HEADER */}
      <div className="bg-slate-800 rounded-xl p-3 mb-4 shadow-md border border-slate-700">
        <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 text-center">🏆 Leaderboard</div>
        <div className={`grid gap-2 text-center`} style={{ gridTemplateColumns: `repeat(${squad.length}, minmax(0, 1fr))` }}>
          {squad.map((name) => (
            <div key={name} className={`p-2 rounded-lg ${name === activeShooter && activeStation !== null ? 'bg-amber-500/20 border border-amber-500' : 'bg-slate-700/50'}`}>
              <div className="text-xs font-semibold text-slate-300 truncate">{name}</div>
              <div className="text-xl font-black text-white">{getRunningTotal(name)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ROTATION / TURN INDICATOR */}
      {activeStation !== null && activeShotIndex !== null ? (
        <div className="bg-amber-50 text-slate-950 rounded-xl p-3 mb-4 flex justify-between items-center shadow-lg">
          <div>
            <span className="text-xs font-bold uppercase opacity-75 block">In The Cage</span>
            <span className="text-lg font-black tracking-tight text-amber-600 animate-pulse">{activeShooter}</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase opacity-75 block">On Deck</span>
            <span className="text-sm font-bold opacity-80">{nextShooter}</span>
          </div>
        </div>
      ) : (
        <div className="bg-blue-600 text-white text-center font-bold py-3 px-4 rounded-xl mb-4 shadow-md">
          {activeStation === null ? "👉 Tap a Station Number to Begin" : "🎉 Station Complete! Select next station."}
        </div>
      )}

      {/* END GAME BUTTON */}
      <button
        onClick={() => setShowEndConfirm(true)}
        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-xl text-sm font-bold mb-4 transition-colors border border-slate-600"
      >
        🏁 End Game
      </button>

      {/* END GAME CONFIRMATION MODAL */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-600 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">⚠️</div>
              <h2 className="text-xl font-black text-white">End Game?</h2>
              <p className="text-sm text-slate-400 mt-2">All scores will be lost. Are you sure?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Keep Playing
              </button>
              <button
                onClick={async () => {
                  if (gameId) {
                    await supabase.from('games').update({ status: 'ended' }).eq('id', gameId);
                  }
                  onEndGame(scores);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black transition-colors"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCORECARD GRID CONTAINER */}
      <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-12 gap-0 border-b border-slate-700 bg-slate-800 text-center text-[10px] font-bold text-slate-400 uppercase py-2">
          <div className="col-span-2">Sta</div>
          <div className="col-span-9 grid grid-cols-10">
            {Array.from({ length: MAX_SHOTS }).map((_, i) => (
              <div key={i} className="text-center">{i + 1}</div>
            ))}
          </div>
          <div className="col-span-1">Tot</div>
        </div>

        {Array.from({ length: numStations }).map((_, stationIdx) => {
          const isRowActive = activeStation === stationIdx;
          const rotation = getRotation(stationIdx);
          return (
            <div
              key={stationIdx}
              className={`grid grid-cols-12 gap-0 border-b border-slate-700/50 items-center text-center transition-colors ${isRowActive ? 'bg-amber-500/5' : ''}`}
            >
              <button
                onClick={() => handleSelectStation(stationIdx)}
                className={`col-span-2 py-3 font-black text-sm border-r border-slate-700 transition-colors ${isRowActive ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-700/50'}`}
              >
                {stationIdx + 1}<span className="text-[9px] font-normal opacity-60 ml-0.5">{rotation[0][0]}</span>
              </button>

              <div className="col-span-9 grid grid-cols-10 h-full items-stretch">
                {Array.from({ length: MAX_SHOTS }).map((_, shotIdx) => {
                  const shotValue = scores[activeShooter]?.[stationIdx]?.[shotIdx];
                  const isCurrentTarget = isRowActive && activeShotIndex === shotIdx;

                  let cellStyle = "border-r border-slate-700/50 flex items-center justify-center text-xs py-3 transition-all";
                  if (shotValue === 1) cellStyle += " bg-emerald-500 text-white font-black";
                  else if (shotValue === 0) cellStyle += " bg-rose-500 text-white font-black";
                  else if (isCurrentTarget) cellStyle += " bg-slate-700 ring-2 ring-inset ring-amber-400";
                  else cellStyle += " bg-slate-800/40";

                  return (
                    <div key={shotIdx} className={cellStyle}>
                      {shotValue === 1 && '•'}
                      {shotValue === 0 && 'X'}
                    </div>
                  );
                })}
              </div>

              <div className="col-span-1 font-black text-[11px] text-slate-400">
                {getStationTotal(activeShooter, stationIdx)}
              </div>
            </div>
          );
        })}
      </div>

      {/* FIXED BASE ACTION BAR */}
      {activeStation !== null && activeShotIndex !== null && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-800 border-t border-slate-700 shadow-2xl max-w-md mx-auto flex gap-4 rounded-t-2xl z-50">
          <button
            onClick={() => recordScore(0)}
            className="flex-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white py-4 rounded-xl font-black text-lg tracking-wide shadow-lg transition-all active:scale-95"
          >
            ❌ MISS
          </button>
          <button
            onClick={() => recordScore(1)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-400 active:bg-emerald-700 text-white py-4 rounded-xl font-black text-lg tracking-wide shadow-lg transition-all active:scale-95"
          >
            💥 HIT
          </button>
        </div>
      )}
    </div>
  );
}

// ─── App wrapper: setup → scorecard → summary flow ─────────────────────────────
export default function App() {
  const [gameConfig, setGameConfig] = useState(null);   // { squad, numStations, gameId, gameName, gameCode }
  const [finalScores, setFinalScores] = useState(null);

  // Start a new game — creates a Supabase row
  const handleStart = async (players, stations) => {
    const gameCode = generateGameCode();
    const gameName = generateGameName();
    const initialScores = createInitialScores(players, stations);

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          game_code: gameCode,
          game_name: gameName,
          squad: players,
          num_stations: stations,
          scores: initialScores,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create game:', error);
        setGameConfig({ squad: players, numStations: stations, gameId: null, gameName: gameName + ' (offline)', gameCode });
      } else {
        setGameConfig({ squad: players, numStations: stations, gameId: data.id, gameName, gameCode });
      }
    } catch (e) {
      console.error('Supabase error:', e);
      setGameConfig({ squad: players, numStations: stations, gameId: null, gameName: gameName + ' (offline)', gameCode });
    }
  };

  // Join an existing game by code
  const handleJoinGame = (game) => {
    setGameConfig({
      squad: game.squad,
      numStations: game.num_stations,
      gameId: game.id,
      gameName: game.game_name,
      gameCode: game.game_code,
      existingScores: game.scores,
    });
  };

  // Show setup screen
  if (!gameConfig) {
    return <SquadSetup onStart={handleStart} onJoinGame={handleJoinGame} />;
  }

  // Show summary screen
  if (finalScores) {
    return (
      <GameSummary
        squad={gameConfig.squad}
        scores={finalScores}
        numStations={gameConfig.numStations}
        onNewGame={() => { setGameConfig(null); setFinalScores(null); }}
      />
    );
  }

  // Show scorecard
  return (
    <Scorecard
      squad={gameConfig.squad}
      numStations={gameConfig.numStations}
      gameId={gameConfig.gameId}
      gameName={gameConfig.gameName}
      gameCode={gameConfig.gameCode}
      initialScores={gameConfig.existingScores}
      onEndGame={(scores) => setFinalScores(scores)}
    />
  );
}
