// import React, { useState, useMemo, useEffect, FC } from 'react';
// import { RefreshCcw, TrendingUp, TrendingDown, Coins, Gamepad, DollarSign, Edit, Save, X } from 'lucide-react';

// // --- Type Definitions ---

// interface Game {
//   id: number;
//   name: string;
//   coinsEarned: number;
//   coinsSpent: number;
//   coinsRecharged: number; // New field for recharged coins
// }

// interface OverallMetrics {
//   totalCoinsEarned: number;
//   totalCoinsSpent: number;
//   totalCoinsRecharged: number; 
//   totalNetCoinFlow: number;
//   totalPnl: number;
// }

// interface StatCardProps {
//   title: string;
//   value: string;
//   icon: React.ElementType;
//   colorClass: { border: string; bg: string; text: string };
//   description: string;
// }

// interface GameRowProps {
//   game: Game;
//   coinValue: number;
//   isEditing: boolean;
//   onEditStart: (id: number) => void;
//   // NOTE: Accepts three change arguments
//   onUpdate: (id: number, spentChange: number, earnedChange: number, rechargeChange: number) => void; 
//   onCancel: () => void;
// }

// // --- Configuration & Utility Functions ---

// const INITIAL_COIN_VALUE: number = 0.05; // $0.05 per coin
// const gamesData: string[] = [
//   "Galaxy Rider", "Pixel Dungeon", "Aether Wars", "Farm Frenzy", "Kart King",
//   "Zen Garden", "Crypto Tycoon", "Space Invaders", "Mystic Maze", "Tsunami Dash"
// ];

// const generateInitialGames = (): Game[] => {
//   // MODIFIED: All coin totals are now initialized to 0 for a clean reset/start.
//   return gamesData.map((name, index) => ({
//     id: index + 1,
//     name: name,
//     coinsEarned: 0,
//     coinsSpent: 0,
//     coinsRecharged: 0, 
//   }));
// };

// const simulateTransaction = (games: Game[]): Game[] => {
//   return games.map(game => {
//     // Randomly select a game to update (80% chance to skip)
//     if (Math.random() < 0.8) {
//       return game;
//     }

//     // Simulate random coin activity (33% chance for each transaction type)
//     const activityType = Math.random();
//     const amount = Math.floor(Math.random() * 500) + 50;
    
//     let spentChange = 0;
//     let earnedChange = 0;
//     let rechargedChange = 0;

//     if (activityType < 0.33) {
//       spentChange = amount;
//     } else if (activityType < 0.66) {
//       earnedChange = amount;
//     } else {
//       rechargedChange = amount;
//     }

//     return {
//       ...game,
//       coinsSpent: game.coinsSpent + spentChange,
//       coinsEarned: game.coinsEarned + earnedChange,
//       coinsRecharged: game.coinsRecharged + rechargedChange, 
//     };
//   });
// };

// // Helper for formatting currency
// const formatCurrency = (amount: number): string => {
//   return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
// };

// // --- Main Components ---

// const StatCard: FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, description }) => (
//   <div className="bg-white p-5 rounded-xl shadow-lg border-t-4 border-solid" style={{ borderColor: colorClass.border }}>
//     <div className="flex items-center justify-between">
//       <div className={`text-3xl p-3 rounded-full ${colorClass.bg} ${colorClass.text}`}>
//         <Icon size={24} />
//       </div>
//       <p className="text-sm font-semibold text-gray-500 uppercase">{title}</p>
//     </div>
//     <div className="mt-4">
//       <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
//       <p className="text-xs text-gray-500 mt-1">{description}</p>
//     </div>
//   </div>
// );

// const GameRow: FC<GameRowProps> = ({ game, coinValue, isEditing, onEditStart, onUpdate, onCancel }) => {
//   // Local state for inputs when editing. These now store the daily/transaction CHANGE amount, initialized to 0.
//   const [dailySpentChange, setDailySpentChange] = useState<number>(0);
//   const [dailyEarnedChange, setDailyEarnedChange] = useState<number>(0);
//   const [dailyRechargeChange, setDailyRechargeChange] = useState<number>(0); 

//   // Net coin flow now accounts for Earned and Recharged coins (Total Inflow).
//   const totalInflow = game.coinsEarned + game.coinsRecharged;
//   const netCoinFlow: number = game.coinsSpent - totalInflow; 
//   const pnl: number = netCoinFlow * coinValue;

//   const isProfit: boolean = pnl >= 0;
//   const pnlClass: string = isProfit ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100';
//   const PnlIcon = isProfit ? TrendingUp : TrendingDown;
  
//   // Input styling
//   const inputStyle: string = "w-full p-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-center";
//   const buttonStyle: string = "p-1 rounded-full shadow-md transition duration-150 text-white";

//   // Quick adjustment amount
//   const QUICK_ADJUST_AMOUNT = 1000;

//   // Handlers for quick adjustment. They adjust the *daily change* amount.
//   const adjustSpent = (amount: number): void => {
//       setDailySpentChange(prev => Math.max(0, prev + amount));
//   };
  
//   const adjustEarned = (amount: number): void => {
//       setDailyEarnedChange(prev => Math.max(0, prev + amount));
//   };
  
//   const adjustRecharge = (amount: number): void => { 
//       setDailyRechargeChange(prev => Math.max(0, prev + amount));
//   };

//   // When in Edit Mode
//   if (isEditing) {
//     return (
//       <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-indigo-50 border-b border-indigo-200 rounded-lg my-2 transition duration-150">
//         {/* Game Name */}
//         <div className="col-span-12 flex items-center space-x-3 mb-4">
//           <Gamepad size={20} className="text-indigo-600" />
//           <span className="font-bold text-gray-800 truncate">{game.name} - Log Daily Activity</span>
//         </div>

//         {/* Edit Fields Container (3 Columns on desktop, stacked on mobile) */}
//         <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            
//             {/* 1. Daily Coins Spent (Used) */}
//             <div className="text-sm text-gray-700">
//               <label className="font-medium mr-2 block text-xs text-gray-500 mb-1">1. Coins Used (Spent):</label>
//               <div className="flex items-center space-x-1">
//                 <button
//                     onClick={() => adjustSpent(-QUICK_ADJUST_AMOUNT)}
//                     className="p-1 w-6 h-6 flex items-center justify-center text-red-500 bg-white border border-gray-300 rounded-lg hover:bg-red-50 transition duration-150 text-lg font-bold"
//                     title={`Subtract ${QUICK_ADJUST_AMOUNT} Coins`}
//                 >
//                     -
//                 </button>
//                 <input
//                   type="number"
//                   value={dailySpentChange}
//                   onChange={(e) => setDailySpentChange(parseInt(e.target.value) || 0)}
//                   className={`${inputStyle} text-red-600 font-mono flex-grow`}
//                   min="0"
//                   placeholder="0"
//                 />
//                 <button
//                     onClick={() => adjustSpent(QUICK_ADJUST_AMOUNT)}
//                     className="p-1 w-6 h-6 flex items-center justify-center text-green-500 bg-white border border-gray-300 rounded-lg hover:bg-green-50 transition duration-150 text-lg font-bold"
//                     title={`Add ${QUICK_ADJUST_AMOUNT} Coins`}
//                 >
//                     +
//                 </button>
//               </div>
//             </div>

//             {/* 2. Daily Coins Earned */}
//             <div className="text-sm text-gray-700">
//               <label className="font-medium mr-2 block text-xs text-gray-500 mb-1">2. Coins Earned:</label>
//               <div className="flex items-center space-x-1">
//                 <button
//                     onClick={() => adjustEarned(-QUICK_ADJUST_AMOUNT)}
//                     className="p-1 w-6 h-6 flex items-center justify-center text-red-500 bg-white border border-gray-300 rounded-lg hover:bg-red-50 transition duration-150 text-lg font-bold"
//                     title={`Subtract ${QUICK_ADJUST_AMOUNT} Coins`}
//                 >
//                     -
//                 </button>
//                 <input
//                   type="number"
//                   value={dailyEarnedChange}
//                   onChange={(e) => setDailyEarnedChange(parseInt(e.target.value) || 0)}
//                   className={`${inputStyle} text-green-600 font-mono flex-grow`}
//                   min="0"
//                   placeholder="0"
//                 />
//                 <button
//                     onClick={() => adjustEarned(QUICK_ADJUST_AMOUNT)}
//                     className="p-1 w-6 h-6 flex items-center justify-center text-green-500 bg-white border border-gray-300 rounded-lg hover:bg-green-50 transition duration-150 text-lg font-bold"
//                     title={`Add ${QUICK_ADJUST_AMOUNT} Coins`}
//                 >
//                     +
//                 </button>
//               </div>
//             </div>
            
//             {/* 3. Daily Coins Recharged (New Field) */}
//             <div className="text-sm text-gray-700">
//               <label className="font-medium mr-2 block text-xs text-gray-500 mb-1">3. Coins Recharged:</label>
//               <div className="flex items-center space-x-1">
//                 <button
//                     onClick={() => adjustRecharge(-QUICK_ADJUST_AMOUNT)}
//                     className="p-1 w-6 h-6 flex items-center justify-center text-red-500 bg-white border border-gray-300 rounded-lg hover:bg-red-50 transition duration-150 text-lg font-bold"
//                     title={`Subtract ${QUICK_ADJUST_AMOUNT} Coins`}
//                 >
//                     -
//                 </button>
//                 <input
//                   type="number"
//                   value={dailyRechargeChange}
//                   onChange={(e) => setDailyRechargeChange(parseInt(e.target.value) || 0)}
//                   className={`${inputStyle} text-blue-600 font-mono flex-grow`}
//                   min="0"
//                   placeholder="0"
//                 />
//                 <button
//                     onClick={() => adjustRecharge(QUICK_ADJUST_AMOUNT)}
//                     className="p-1 w-6 h-6 flex items-center justify-center text-blue-500 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 transition duration-150 text-lg font-bold"
//                     title={`Add ${QUICK_ADJUST_AMOUNT} Coins`}
//                 >
//                     +
//                 </button>
//               </div>
//             </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="col-span-12 flex space-x-2 items-center justify-end mt-4">
//           <button 
//             // Passing all three daily CHANGE amounts up
//             onClick={() => onUpdate(game.id, dailySpentChange, dailyEarnedChange, dailyRechargeChange)}
//             className={`${buttonStyle} bg-emerald-500 hover:bg-emerald-600 flex items-center px-3 py-1.5 text-xs`}
//             disabled={
//                 isNaN(dailySpentChange) || isNaN(dailyEarnedChange) || isNaN(dailyRechargeChange) || 
//                 dailySpentChange < 0 || dailyEarnedChange < 0 || dailyRechargeChange < 0
//             }
//             title="Log Daily Transaction"
//           >
//             <Save size={14} className="mr-1" />
//             Log Transaction
//           </button>
//           <button 
//             onClick={onCancel}
//             className={`${buttonStyle} bg-gray-500 hover:bg-gray-600 flex items-center px-3 py-1.5 text-xs`}
//             title="Cancel Editing"
//           >
//             <X size={14} className="mr-1" />
//             Cancel
//           </button>
//         </div>
//       </div>
//     );
//   }


//   // When in Display Mode
//   return (
//     <div className="grid grid-cols-12 gap-4 py-4 px-4 hover:bg-gray-50 transition duration-150 border-b border-gray-100">
//       {/* Game Name */}
//       <div className="col-span-3 flex items-center space-x-3">
//         <Gamepad size={20} className="text-indigo-500 hidden md:block" />
//         <span className="font-semibold text-gray-800 truncate">{game.name}</span>
//       </div>

//       {/* Coins Spent */}
//       <div className="col-span-2 text-sm text-gray-700">
//         <span className="md:hidden font-medium mr-2">Spent:</span>
//         <span className="font-mono text-red-600">{game.coinsSpent.toLocaleString()}</span>
//       </div>

//       {/* Coins Earned */}
//       <div className="col-span-2 text-sm text-gray-700">
//         <span className="md:hidden font-medium mr-2">Earned:</span>
//         <span className="font-mono text-green-600">{game.coinsEarned.toLocaleString()}</span>
//       </div>
      
//       {/* Coins Recharged (NEW COLUMN) */}
//       <div className="col-span-2 text-sm text-gray-700">
//         <span className="md:hidden font-medium mr-2">Recharged:</span>
//         <span className="font-mono text-blue-600">{game.coinsRecharged.toLocaleString()}</span>
//       </div>

//       {/* Net Coin Flow */}
//       <div className="col-span-1 text-sm">
//         <span className="md:hidden font-medium mr-2">Net Flow:</span>
//         <span className={`font-mono ${netCoinFlow > 0 ? 'text-green-700' : netCoinFlow < 0 ? 'text-red-700' : 'text-gray-500'}`}>
//           {netCoinFlow.toLocaleString()}
//         </span>
//       </div>

//       {/* P&L and Edit Button */}
//       <div className="col-span-2 text-sm flex items-center justify-end space-x-3">
//         <span className="md:hidden font-medium mr-2">P&L:</span>
//         <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center ${pnlClass} w-20 justify-center`}>
//           <PnlIcon size={14} className="mr-1" />
//           {formatCurrency(pnl)}
//         </span>
//         <button
//           onClick={() => onEditStart(game.id)}
//           className="p-1 text-indigo-500 hover:text-indigo-700 transition duration-150 rounded-full hover:bg-indigo-100"
//           title="Edit Coin Usage"
//         >
//           <Edit size={16} />
//         </button>
//       </div>
//     </div>
//   );
// };

// // --- App Component ---

// const App: FC = () => {
//   // Use generateInitialGames for the initial state (now all zeros)
//   const [games, setGames] = useState<Game[]>(generateInitialGames);
//   const [coinValue, setCoinValue] = useState<number>(INITIAL_COIN_VALUE);
//   const [inputCoinValue, setInputCoinValue] = useState<number | string>(INITIAL_COIN_VALUE);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [editingGameId, setEditingGameId] = useState<number | null>(null); 

//   // Memoize overall metrics calculation
//   const overallMetrics: OverallMetrics = useMemo(() => {
//     const totalCoinsEarned = games.reduce((sum, game) => sum + game.coinsEarned, 0);
//     const totalCoinsSpent = games.reduce((sum, game) => sum + game.coinsSpent, 0);
//     const totalCoinsRecharged = games.reduce((sum, game) => sum + game.coinsRecharged, 0); 

//     // Net Coin Flow is Spent - (Earned + Recharged)
//     const totalNetCoinFlow = totalCoinsSpent - (totalCoinsEarned + totalCoinsRecharged); 
//     const totalPnl = totalNetCoinFlow * coinValue;

//     return {
//       totalCoinsEarned,
//       totalCoinsSpent,
//       totalCoinsRecharged, 
//       totalNetCoinFlow,
//       totalPnl,
//     };
//   }, [games, coinValue]);

//   const handleSimulate = (): void => {
//     if (editingGameId !== null) return; // Prevent simulation during edit

//     setLoading(true);
//     // Simulate API delay for better UX
//     setTimeout(() => {
//       setGames(simulateTransaction(games));
//       setLoading(false);
//     }, 500);
//   };

//   const resetData = (): void => {
//     // Calling generateInitialGames resets all totals to zero (0)
//     setGames(generateInitialGames()); 
//     setCoinValue(INITIAL_COIN_VALUE);
//     setInputCoinValue(INITIAL_COIN_VALUE);
//     setEditingGameId(null);
//   }
  
//   const handleCoinValueUpdate = (): void => {
//     const numericValue = typeof inputCoinValue === 'string' ? parseFloat(inputCoinValue) : inputCoinValue;
    
//     if (!isNaN(numericValue) && numericValue > 0) {
//       setCoinValue(numericValue);
//       setInputCoinValue(numericValue); 
//     } else {
//       setInputCoinValue(coinValue);
//     }
//   };

//   const handleGameUpdate = (id: number, spentChange: number, earnedChange: number, rechargeChange: number): void => {
//     // Inputs are now interpreted as daily change amounts to be added to the current totals
//     setGames(prevGames =>
//       prevGames.map(game => {
//         if (game.id === id) {
//           // Calculate new totals by adding the change amounts
//           const newSpent = game.coinsSpent + spentChange;
//           const newEarned = game.coinsEarned + earnedChange;
//           const newRecharged = game.coinsRecharged + rechargeChange; 
          
//           return { 
//             ...game, 
//             coinsSpent: Math.max(0, newSpent), 
//             coinsEarned: Math.max(0, newEarned),
//             coinsRecharged: Math.max(0, newRecharged) 
//           };
//         }
//         return game;
//       })
//     );
//     setEditingGameId(null); // Exit edit mode
//   };
  
//   // Define P&L color logic
//   const pnlColor = overallMetrics.totalPnl >= 0
//     ? { border: 'rgb(5, 150, 105)', bg: 'bg-emerald-500', text: 'text-white' }
//     : { border: 'rgb(220, 38, 38)', bg: 'bg-red-500', text: 'text-white' };


//   return (
//     <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
//       <script src="https://cdn.tailwindcss.com"></script>
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />

//       {/* Header and Controls */}
//       <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 pb-4 border-b border-gray-200">
//         <h1 className="text-4xl font-extrabold text-gray-900 mb-4 xl:mb-0 flex items-center">
//           <Coins size={36} className="text-indigo-600 mr-3" />
//           Game Coin Dashboard
//         </h1>

//         {/* Update Form and Action Buttons */}
//         <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 w-full xl:w-auto">
            
//             {/* Coin Value Update Form */}
//             <div className="flex items-center space-x-2 p-3 bg-white rounded-xl shadow-md border border-indigo-200 w-full lg:w-auto">
//                 <DollarSign size={20} className="text-indigo-500 hidden sm:block"/>
//                 <label htmlFor="coinValueInput" className="text-sm font-medium text-gray-700 whitespace-nowrap">
//                     Coin Value:
//                 </label>
//                 <input
//                     id="coinValueInput"
//                     type="number"
//                     step="0.01"
//                     min="0.01"
//                     // Cast to string for input value property
//                     value={inputCoinValue.toString()} 
//                     onChange={(e) => setInputCoinValue(e.target.value)}
//                     className="w-20 p-1 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-right"
//                 />
//                 <button
//                     onClick={handleCoinValueUpdate}
//                     // Disable if input value is the same as the current coinValue, or if invalid, or if editing a game
//                     disabled={parseFloat(inputCoinValue as string) === coinValue || parseFloat(inputCoinValue as string) <= 0 || editingGameId !== null}
//                     className="px-3 py-1 text-sm bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-50"
//                 >
//                     Set
//                 </button>
//             </div>

//             {/* Action Buttons */}
//             <div className="flex space-x-3 w-full lg:w-auto">
//                 <button
//                     onClick={resetData}
//                     className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-150 w-1/2 lg:w-auto justify-center"
//                     disabled={editingGameId !== null}
//                 >
//                     Reset
//                 </button>
//                 <button
//                     onClick={handleSimulate}
//                     disabled={loading || editingGameId !== null}
//                     className="flex items-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-xl hover:bg-emerald-700 transition duration-150 disabled:opacity-50 w-1/2 lg:w-auto justify-center"
//                 >
//                     <RefreshCcw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
//                     {loading ? 'Processing...' : 'Simulate Data'}
//                 </button>
//             </div>
//         </div>
//       </header>

//       {/* Overall Stats Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
//         <StatCard
//           title="Total Coins Spent"
//           value={overallMetrics.totalCoinsSpent.toLocaleString()}
//           icon={TrendingUp}
//           description="Total coins spent by users across all games."
//           colorClass={{ border: 'rgb(79, 70, 229)', bg: 'bg-indigo-100', text: 'text-indigo-600' }}
//         />
//         <StatCard
//           title="Total Coins Earned"
//           value={overallMetrics.totalCoinsEarned.toLocaleString()}
//           icon={TrendingDown}
//           description="Total coins rewarded to users by all games."
//           colorClass={{ border: 'rgb(245, 158, 11)', bg: 'bg-amber-100', text: 'text-amber-600' }}
//         />
//         <StatCard
//           title="Total Coins Recharged" 
//           value={overallMetrics.totalCoinsRecharged.toLocaleString()}
//           icon={DollarSign}
//           description="Total coins purchased or manually recharged by users."
//           colorClass={{ border: 'rgb(59, 130, 246)', bg: 'bg-blue-100', text: 'text-blue-600' }}
//         />
//         <StatCard
//           title="Total P&L ($)"
//           value={formatCurrency(overallMetrics.totalPnl)}
//           icon={overallMetrics.totalPnl >= 0 ? TrendingUp : TrendingDown}
//           description={`Net Flow = Spent - (Earned + Recharged). Value: ${formatCurrency(coinValue)}.`}
//           colorClass={pnlColor}
//         />
//       </div>

//       {/* Game Breakdown Table/List */}
//       <div className="bg-white rounded-xl shadow-2xl p-6">
//         <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
//             <Gamepad size={24} className="text-indigo-600 mr-2" />
//             Game-by-Game Breakdown ({games.length} Games)
//         </h2>

//         {/* Header (Desktop) - Adjusted columns for Recharge field */}
//         <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase border-b-2 pb-2 mb-2">
//             <div className="col-span-3">Game Name</div>
//             <div className="col-span-2">Coins Spent</div>
//             <div className="col-span-2">Coins Earned</div>
//             <div className="col-span-2">Coins Recharged</div> 
//             <div className="col-span-1">Net Flow</div>
//             <div className="col-span-2 text-right">P&L & Action</div> 
//         </div>

//         {/* Game Rows */}
//         <div className="divide-y divide-gray-100">
//           {games
//             .sort((a, b) => (b.coinsSpent - (b.coinsEarned + b.coinsRecharged)) - (a.coinsSpent - (a.coinsEarned + a.coinsRecharged))) // Sort by Net Flow
//             .map((game: Game) => (
//               <GameRow 
//                 key={game.id} 
//                 game={game} 
//                 coinValue={coinValue} 
//                 isEditing={editingGameId === game.id}
//                 onEditStart={setEditingGameId}
//                 onUpdate={handleGameUpdate}
//                 onCancel={() => setEditingGameId(null)}
//               />
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// // Default export is required for the component to be rendered
// export default App;
