




import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { OptionStrategy, OptionStrategyInput, OptionAction, OptionLeg, Account, SortConfig, SortableKey, SortDirection, RealizedPLPeriod, PLHistoryData, ApiProvider, ApiKeys, StockPriceUpdate, WatchlistItem, PriceAlert, AlertStatus, AlertCondition } from './types';
import { fetchCurrentStockPrices as fetchAlphaVantagePrices } from './services/alphaVantageService';
import * as alpacaService from './services/alpacaService';
import { simulateCurrentOptionPrice } from './services/geminiService';
import { calculateMargin } from './services/marginCalculator';
import OptionForm from './components/OptionForm';
import PortfolioTable from './components/PortfolioTable';
import SummaryCard from './components/SummaryCard';
import EditStrategyModal from './components/EditStrategyModal';
import RollStrategyModal from './components/RollStrategyModal';
import CloseStrategyModal from './components/CloseStrategyModal';
import ClosedPositionsTable from './components/ClosedPositionsTable';
import AddAccountModal from './components/AddAccountModal';
import AccountSelector from './components/AccountSelector';
import ConfirmDeleteAccountModal from './components/ConfirmDeleteAccountModal';
import PLChart from './components/PLChart';
import ApiSettingsModal from './components/ApiSettingsModal';
import SettingsIcon from './components/icons/SettingsIcon';
import Watchlist from './components/Watchlist';
import StockChartModal from './components/StockChartModal';
import AlertsPanel from './components/AlertsPanel';
import { NotificationContainer } from './components/NotificationContainer';

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [positions, setPositions] = useState<OptionStrategy[]>([]);
  const [closedPositions, setClosedPositions] = useState<OptionStrategy[]>([]);
  const [stockData, setStockData] = useState<Record<string, { price: number; previousClose: number }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [editingStrategy, setEditingStrategy] = useState<OptionStrategy | null>(null);
  const [rollingStrategy, setRollingStrategy] = useState<OptionStrategy | null>(null);
  const [closingStrategy, setClosingStrategy] = useState<OptionStrategy | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [openSortConfig, setOpenSortConfig] = useState<SortConfig>(null);
  const [closedSortConfig, setClosedSortConfig] = useState<SortConfig>(null);
  const [realizedPLPeriod, setRealizedPLPeriod] = useState<RealizedPLPeriod>('today');
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [plHistory, setPlHistory] = useState<PLHistoryData[]>([]);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('alphaVantage');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  const [manualWatchlist, setManualWatchlist] = useState<string[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [chartTicker, setChartTicker] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const savedProvider = localStorage.getItem('apiProvider') as ApiProvider | null;
    const savedKeys = localStorage.getItem('apiKeys');
    const savedWatchlist = localStorage.getItem('manualWatchlist');
    const savedAlerts = localStorage.getItem('priceAlerts');
    const savedAccounts = localStorage.getItem('accounts');
    const savedPositions = localStorage.getItem('positions');
    const savedClosedPositions = localStorage.getItem('closedPositions');
    const savedPlHistory = localStorage.getItem('plHistory');

    if (savedProvider) setApiProvider(savedProvider);
    if (savedKeys) {
        try {
            setApiKeys(JSON.parse(savedKeys));
        } catch (e) {
            console.error("Failed to parse apiKeys from localStorage", e);
            localStorage.removeItem('apiKeys');
        }
    } else {
        setIsApiModalOpen(true);
    }
    if (savedWatchlist) {
      try {
        const parsed = JSON.parse(savedWatchlist);
        if (Array.isArray(parsed)) setManualWatchlist(parsed);
      } catch (e) { 
        console.error("Failed to parse manualWatchlist from localStorage", e);
        localStorage.removeItem('manualWatchlist');
      }
    }
    if (savedAlerts) {
      try {
        const parsed = JSON.parse(savedAlerts);
        if (Array.isArray(parsed)) setAlerts(parsed);
      } catch (e) { 
        console.error("Failed to parse priceAlerts from localStorage", e);
        localStorage.removeItem('priceAlerts');
      }
    }
    if (savedAccounts) {
      try {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed)) setAccounts(parsed);
      } catch(e) { 
        console.error("Failed to parse accounts from localStorage", e);
        localStorage.removeItem('accounts');
      }
    }
    if (savedPositions) {
      try {
        const parsed = JSON.parse(savedPositions);
        if (Array.isArray(parsed)) setPositions(parsed);
      } catch(e) {
        console.error("Failed to parse positions from localStorage", e);
        localStorage.removeItem('positions');
      }
    }
    if (savedClosedPositions) {
      try {
        const parsed = JSON.parse(savedClosedPositions);
        if (Array.isArray(parsed)) setClosedPositions(parsed);
      } catch(e) {
        console.error("Failed to parse closed positions from localStorage", e);
        localStorage.removeItem('closedPositions');
      }
    }
    if (savedPlHistory) {
      try {
        const parsed = JSON.parse(savedPlHistory);
        if (Array.isArray(parsed)) setPlHistory(parsed);
      } catch(e) {
        console.error("Failed to parse P/L history from localStorage", e);
        localStorage.removeItem('plHistory');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }, [accounts]);
  
  useEffect(() => {
    localStorage.setItem('positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('closedPositions', JSON.stringify(closedPositions));
  }, [closedPositions]);
  
  useEffect(() => {
    localStorage.setItem('plHistory', JSON.stringify(plHistory));
  }, [plHistory]);
  
  useEffect(() => {
    const totalUnrealizedPL = positions.reduce((acc, pos) => acc + (pos.totalPL || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const todayInHistory = plHistory.some(item => item.date === today);

    if (positions.length > 0 || todayInHistory) {
      setPlHistory(prev => {
        const historyCopy = [...prev];
        const todayIndex = historyCopy.findIndex(item => item.date === today);

        if (todayIndex > -1) {
          if (historyCopy[todayIndex].unrealizedPL === totalUnrealizedPL) {
            return prev; // No change needed
          }
          historyCopy[todayIndex] = { ...historyCopy[todayIndex], unrealizedPL: totalUnrealizedPL };
        } else {
          historyCopy.push({ date: today, unrealizedPL: totalUnrealizedPL, realizedPL: 0 });
        }
        
        historyCopy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return historyCopy;
      });
    }
  }, [positions, plHistory]);

  const handleSaveApiSettings = (provider: ApiProvider, keys: ApiKeys) => {
    setApiProvider(provider);
    setApiKeys(keys);
    localStorage.setItem('apiProvider', provider);
    localStorage.setItem('apiKeys', JSON.stringify(keys));
    setIsApiModalOpen(false);
    setError(null); 
  };
  
  const apiKeysConfigured = useMemo(() => {
    if (apiProvider === 'alpaca') {
        return !!apiKeys.alpacaKey && !!apiKeys.alpacaSecret;
    }
    return !!apiKeys.alphaVantage;
  }, [apiProvider, apiKeys]);

  const handleSort = (key: SortableKey, table: 'open' | 'closed') => {
    let direction: SortDirection = 'ascending';
    const currentConfig = table === 'open' ? openSortConfig : closedSortConfig;
    const setConfig = table === 'open' ? setOpenSortConfig : setClosedSortConfig;

    if (currentConfig && currentConfig.key === key && currentConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setConfig({ key, direction });
  };

  const sortedOpenPositions = useMemo(() => {
    let sortableItems = (selectedAccountId === 'all')
      ? positions
      : positions.filter(p => p.accountId === selectedAccountId);

    if (openSortConfig !== null) {
      sortableItems.sort((a, b) => {
        const { key, direction } = openSortConfig;
        
        const getValue = (item: OptionStrategy): any => {
          const strategyKeys: (keyof OptionStrategy)[] = ['name', 'totalPL', 'openDate'];
          if (strategyKeys.includes(key as keyof OptionStrategy)) {
            return item[key as keyof OptionStrategy];
          }
          if (key === 'margin') {
            return calculateMargin(item);
          }
          if (item.legs.length === 1) {
            const legKeys: (keyof OptionLeg)[] = ['ticker', 'action', 'type', 'strike', 'expiration', 'contracts', 'purchasePrice'];
            if (legKeys.includes(key as keyof OptionLeg)) {
              return item.legs[0][key as keyof OptionLeg];
            }
          }
          return null; 
        };

        const aValue = getValue(a);
        const bValue = getValue(b);

        if (aValue === null || bValue === null) return 0;
        
        let comparison = 0;
        if (key === 'expiration' || key === 'openDate') {
            comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        }

        return direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [positions, selectedAccountId, openSortConfig]);

  const sortedClosedPositions = useMemo(() => {
    let sortableItems = (selectedAccountId === 'all')
      ? closedPositions
      : closedPositions.filter(p => p.accountId === selectedAccountId);
    
    if (closedSortConfig !== null) {
      sortableItems.sort((a, b) => {
        const { key, direction } = closedSortConfig;
        const aValue = a[key as keyof OptionStrategy];
        const bValue = b[key as keyof OptionStrategy];

        if (aValue === undefined || bValue === undefined) return 0;

        let comparison = 0;
        if (['openDate', 'closeDate'].includes(key)) {
            comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        }

        return direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [closedPositions, selectedAccountId, closedSortConfig]);

  const addAccount = (name: string, broker: string) => {
    const newAccount: Account = { id: `acc-${Date.now()}`, name, broker };
    setAccounts(prev => [...prev, newAccount]);
    setSelectedAccountId(newAccount.id); 
    setIsAddAccountModalOpen(false);
  };

  const requestDeleteAccount = (accountId: string) => {
    if (accountId === 'all') return;
    setDeletingAccountId(accountId);
  };

  const confirmDeleteAccount = () => {
    if (!deletingAccountId) return;
    
    const accountHasPositions = 
        positions.some(p => p.accountId === deletingAccountId) || 
        closedPositions.some(p => p.accountId === deletingAccountId);

    if (accountHasPositions) {
        setError('Cannot delete account as it still contains positions. Please move or close them first.');
        setDeletingAccountId(null);
        return;
    }

    setAccounts(prev => prev.filter(acc => acc.id !== deletingAccountId));
    setSelectedAccountId('all');
    setDeletingAccountId(null);
  };

  const cancelDeleteAccount = () => {
    setDeletingAccountId(null);
  };

  const addStrategy = (strategyInput: OptionStrategyInput) => {
    // FIX: Calculate initial P/L based on premium paid (debit) or received (credit).
    // A BUY action is a debit (negative P/L), a SELL is a credit (positive P/L).
    // The initial `currentPrice` is set to 0 to reflect this cost against the `purchasePrice`.
    let totalInitialPL = 0;
    const legsWithInitialPL: OptionLeg[] = strategyInput.legs.map((legInput, index) => {
        const cost = legInput.purchasePrice * legInput.contracts * 100;
        const pl = legInput.action === OptionAction.BUY ? -cost : cost;
        totalInitialPL += pl;
        return {
            ...legInput,
            id: `${strategyInput.name}-${legInput.ticker}-${index}-${Date.now()}`,
            currentPrice: 0, // Set to 0 to calculate P/L against purchase price
            pl: pl,
        };
    });

    const newStrategy: OptionStrategy = {
      id: `${strategyInput.name}-${Date.now()}`,
      name: strategyInput.name,
      totalPL: totalInitialPL,
      legs: legsWithInitialPL,
      accountId: strategyInput.accountId,
      openDate: strategyInput.openDate,
    };

    setPositions(prev => [...prev, newStrategy]);
    setIsFormVisible(false);

    // Remove newly added tickers from manual watchlist, as they are now in open positions
    const tickersFromNewStrategy = new Set(strategyInput.legs.map(l => l.ticker));
    setManualWatchlist(prevWatchlist => {
      const newWatchlist = prevWatchlist.filter(t => !tickersFromNewStrategy.has(t));
      if (newWatchlist.length !== prevWatchlist.length) {
        localStorage.setItem('manualWatchlist', JSON.stringify(newWatchlist));
      }
      return newWatchlist;
    });
  };

  const handleUpdateStrategy = (strategyId: string, strategyInput: OptionStrategyInput) => {
    setPositions(prev =>
      prev.map(s => {
        if (s.id === strategyId) {
            // FIX: When updating, recalculate initial P/L based on new premiums.
            let totalInitialPL = 0;
            const legsWithInitialPL: OptionLeg[] = strategyInput.legs.map((legInput, index) => {
                const oldLeg = s.legs.find(oldLeg => 
                    oldLeg.ticker === legInput.ticker && 
                    oldLeg.strike === legInput.strike && 
                    oldLeg.type === legInput.type
                );
                const cost = legInput.purchasePrice * legInput.contracts * 100;
                const pl = legInput.action === OptionAction.BUY ? -cost : cost;
                totalInitialPL += pl;
                return {
                    ...legInput,
                    id: oldLeg?.id || `${strategyInput.name}-${legInput.ticker}-${index}-${Date.now()}`,
                    currentPrice: 0, // P/L is calculated against cost basis
                    pl: pl,
                };
            });
            
            const updatedStrategy: OptionStrategy = {
              ...s,
              name: strategyInput.name,
              totalPL: totalInitialPL,
              legs: legsWithInitialPL,
              accountId: strategyInput.accountId,
              openDate: strategyInput.openDate,
            };
            return updatedStrategy;
        }
        return s;
      })
    );
    setEditingStrategy(null);
  };

  const handleRollStrategy = (strategyId: string, rollData: { newStrike: number; newExpiration: string; rollPremium: number }) => {
    setPositions(prev =>
        prev.map(s => {
            if (s.id === strategyId) {
                if (s.legs.length !== 1) return s; 
                const oldLeg = s.legs[0];
                let newPurchasePrice;
                if (oldLeg.action === OptionAction.BUY) {
                    newPurchasePrice = oldLeg.purchasePrice - rollData.rollPremium;
                } else { // SELL
                    newPurchasePrice = oldLeg.purchasePrice + rollData.rollPremium;
                }

                // FIX: On roll, the new position's P/L reflects the new cost basis.
                const newCost = newPurchasePrice * oldLeg.contracts * 100;
                const initialPL = oldLeg.action === OptionAction.BUY ? -newCost : newCost;

                const newLeg: OptionLeg = {
                    ...oldLeg,
                    id: `${s.name}-${oldLeg.ticker}-rolled-${Date.now()}`,
                    strike: rollData.newStrike,
                    expiration: rollData.newExpiration,
                    purchasePrice: newPurchasePrice,
                    currentPrice: 0,
                    pl: initialPL,
                };
                return { ...s, name: `${oldLeg.ticker} ${rollData.newStrike} ${oldLeg.type} (Rolled)`, legs: [newLeg], totalPL: initialPL };
            }
            return s;
        })
    );
    setRollingStrategy(null); 
  };
  
  const handleCloseStrategy = (strategyId: string, closingLegs: { legId: string; price: number }[]) => {
    const strategyToClose = positions.find(p => p.id === strategyId);
    if (!strategyToClose) return;

    let finalStrategyPL = 0;
    strategyToClose.legs.forEach(leg => {
        const closingInfo = closingLegs.find(cl => cl.legId === leg.id);
        if (!closingInfo) return;
        const costBasis = leg.purchasePrice * leg.contracts * 100;
        const closingValue = closingInfo.price * leg.contracts * 100;
        finalStrategyPL += leg.action === OptionAction.BUY ? closingValue - costBasis : costBasis - closingValue;
    });
    
    const closedStrategy: OptionStrategy = {
      ...strategyToClose,
      closeDate: new Date().toISOString().split('T')[0],
      realizedPL: finalStrategyPL,
      totalPL: finalStrategyPL,
    };

    const remainingPositions = positions.filter(p => p.id !== strategyId);
    
    // Check if the closed tickers are still in other open positions.
    // If not, add them to the manual watchlist (move to Favourites).
    const tickersFromClosedStrategy = new Set(strategyToClose.legs.map(l => l.ticker));
    const remainingOpenTickers = new Set(remainingPositions.flatMap(p => p.legs.map(l => l.ticker)));

    const tickersToMoveToFavourites: string[] = [];
    tickersFromClosedStrategy.forEach(ticker => {
        if (!remainingOpenTickers.has(ticker)) {
            tickersToMoveToFavourites.push(ticker);
        }
    });

    if (tickersToMoveToFavourites.length > 0) {
      setManualWatchlist(prevWatchlist => {
          const newWatchlist = new Set([...prevWatchlist, ...tickersToMoveToFavourites]);
          const newWatchlistArray = Array.from(newWatchlist);
          localStorage.setItem('manualWatchlist', JSON.stringify(newWatchlistArray));
          return newWatchlistArray;
      });
    }

    setClosedPositions(prev => [closedStrategy, ...prev]);
    setPositions(remainingPositions);
    setClosingStrategy(null);

    if (closedStrategy.closeDate && finalStrategyPL) {
      setPlHistory(prev => {
        const historyCopy = [...prev];
        const closeDate = closedStrategy.closeDate!;
        const closeDateIndex = historyCopy.findIndex(item => item.date === closeDate);

        if (closeDateIndex > -1) {
          historyCopy[closeDateIndex] = {
            ...historyCopy[closeDateIndex],
            realizedPL: (historyCopy[closeDateIndex].realizedPL || 0) + finalStrategyPL
          };
        } else {
          historyCopy.push({ date: closeDate, unrealizedPL: 0, realizedPL: finalStrategyPL });
        }
        historyCopy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return historyCopy;
      });
    }
  };


  const openEditModal = (strategy: OptionStrategy) => setEditingStrategy(strategy);
  const openRollModal = (strategy: OptionStrategy) => setRollingStrategy(strategy);
  const openCloseModal = (strategy: OptionStrategy) => setClosingStrategy(strategy);
  const openChartModal = (ticker: string) => setChartTicker(ticker);

  const openPositionTickers = useMemo(() => {
    const tickers = positions.flatMap(p => p.legs.map(l => l.ticker));
    return new Set(tickers);
  }, [positions]);

  const allWatchlistTickers = useMemo(() => {
    const alertTickers = alerts.map(a => a.ticker);
    return Array.from(new Set([...openPositionTickers, ...manualWatchlist, ...alertTickers])).sort();
  }, [openPositionTickers, manualWatchlist, alerts]);

  const refreshPrices = useCallback(async () => {
    const tickersToFetch = Array.from(new Set([...positions.flatMap(p => p.legs.map(l => l.ticker)), ...allWatchlistTickers]));
    if (tickersToFetch.length === 0) return;
    if (!apiKeysConfigured) {
        setError("API keys are not configured. Please set them in the settings.");
        setIsApiModalOpen(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
        let stockPriceUpdates: StockPriceUpdate[] = [];
        
        if (tickersToFetch.length > 0) {
            if (apiProvider === 'alpaca') {
                const { alpacaKey, alpacaSecret } = apiKeys;
                if (!alpacaKey || !alpacaSecret) throw new Error('Alpaca API keys missing.');
                stockPriceUpdates = await alpacaService.fetchCurrentStockPrices(tickersToFetch, alpacaKey, alpacaSecret);
            } else { // alphaVantage
                const { alphaVantage } = apiKeys;
                if (!alphaVantage) throw new Error('Alpha Vantage API key missing.');
                stockPriceUpdates = await fetchAlphaVantagePrices(tickersToFetch, alphaVantage);
            }
        }
        
        const newStockData: Record<string, { price: number; previousClose: number }> = {};
        const newWatchlistItems: WatchlistItem[] = [];

        stockPriceUpdates.forEach(p => {
            if (p.price != null && p.previousClose != null) {
                newStockData[p.ticker] = { price: p.price, previousClose: p.previousClose };
                if (allWatchlistTickers.includes(p.ticker)) {
                    const change = p.price - p.previousClose;
                    const changePercent = p.previousClose === 0 ? 0 : (change / p.previousClose) * 100;
                    newWatchlistItems.push({ ...p, change, changePercent });
                }
            }
        });
        
        setStockData(newStockData);
        setWatchlistItems(newWatchlistItems.sort((a, b) => a.ticker.localeCompare(b.ticker)));

        // --- Price Alert Logic ---
        const triggeredAlerts: PriceAlert[] = [];
        const updatedAlerts = alerts.map(alert => {
            if (alert.status === AlertStatus.ACTIVE) {
                const stock = newStockData[alert.ticker];
                if (stock) {
                    const price = stock.price;
                    const conditionMet = 
                        (alert.condition === AlertCondition.ABOVE && price >= alert.targetPrice) ||
                        (alert.condition === AlertCondition.BELOW && price <= alert.targetPrice);

                    if (conditionMet) {
                        const triggeredAlert: PriceAlert = {
                            ...alert,
                            status: AlertStatus.TRIGGERED,
                            triggeredAt: new Date().toISOString()
                        };
                        triggeredAlerts.push(triggeredAlert);
                        return triggeredAlert;
                    }
                }
            }
            return alert;
        });

        if (triggeredAlerts.length > 0) {
            setAlerts(updatedAlerts);
            localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
            setNotifications(prev => [...prev, ...triggeredAlerts]);
        }
        // --- End Price Alert Logic ---

        const allLegs = positions.flatMap(s => s.legs);
        if (allLegs.length > 0) {
            let optionPriceMap = new Map<string, number>();

            if (apiProvider === 'alpaca') {
                const { alpacaKey, alpacaSecret } = apiKeys;
                if (!alpacaKey || !alpacaSecret) throw new Error('Alpaca API keys missing.');
                const optionPrices = await alpacaService.fetchCurrentOptionPrices(allLegs, alpacaKey, alpacaSecret);
                optionPrices.forEach(p => optionPriceMap.set(p.id, p.currentPrice));
            } else { // Gemini
                const optionPricePromises = allLegs.map(leg => {
                    const underlyingPrice = newStockData[leg.ticker]?.price;
                    if (underlyingPrice !== undefined) {
                        return simulateCurrentOptionPrice(leg, underlyingPrice).then(price => ({
                            id: leg.id,
                            currentPrice: price,
                        }));
                    }
                    return Promise.resolve({ id: leg.id, currentPrice: null });
                });
                const updatedOptionPrices = (await Promise.all(optionPricePromises)).filter(p => p.currentPrice !== null);
                updatedOptionPrices.forEach(p => {
                    if (p.currentPrice !== null) optionPriceMap.set(p.id, p.currentPrice);
                });
            }

            setPositions(prevStrategies =>
              prevStrategies.map(strategy => {
                // As per user request, only update the current market price of the leg.
                // The P/L will remain fixed to the initial premium paid/received.
                const updatedLegs = strategy.legs.map(leg => {
                  const currentPrice = optionPriceMap.get(leg.id);
                  if (currentPrice !== undefined && currentPrice !== null) {
                    // Only update the market price, leave the P/L as it was (initial cost).
                    return { ...leg, currentPrice };
                  }
                  return leg; // Return original leg if no new price
                });
            
                // Since leg P/L is not changed, the strategy's total P/L also remains unchanged.
                return { ...strategy, legs: updatedLegs };
              })
            );
        }
    } catch (err) {
        // FIX: The caught error `err` is of type 'unknown'. We must check its type
        // before using it as a string to avoid a TypeScript error.
        let message = "An unknown error occurred.";
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        }
        const errorMessage = `Failed to fetch latest prices. ${message}`;
        console.error(errorMessage, err);
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [positions, apiProvider, apiKeys, apiKeysConfigured, allWatchlistTickers, alerts]);
  
  const handleAddTickerToWatchlist = (ticker: string) => {
    const upperTicker = ticker.toUpperCase();
    if (upperTicker && !manualWatchlist.includes(upperTicker) && !openPositionTickers.has(upperTicker)) {
      const newWatchlist = [...manualWatchlist, upperTicker];
      setManualWatchlist(newWatchlist);
      localStorage.setItem('manualWatchlist', JSON.stringify(newWatchlist));
    }
  };

  const handleRemoveTickerFromWatchlist = (ticker: string) => {
    const newWatchlist = manualWatchlist.filter(t => t !== ticker);
    setManualWatchlist(newWatchlist);
    localStorage.setItem('manualWatchlist', JSON.stringify(newWatchlist));
    setWatchlistItems(prev => prev.filter(item => item.ticker !== ticker || openPositionTickers.has(ticker)));
  };

  const handleAddAlert = (alertData: Omit<PriceAlert, 'id' | 'status' | 'createdAt'>) => {
    const newAlert: PriceAlert = {
      ...alertData,
      id: `alert-${Date.now()}`,
      status: AlertStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };
    const updatedAlerts = [...alerts, newAlert];
    setAlerts(updatedAlerts);
    localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
  };

  const handleDeleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.filter(a => a.id !== alertId);
    setAlerts(updatedAlerts);
    localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
  };
  
  const handleDismissNotification = (alertId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== alertId));
  };

  const unrealizedPL = useMemo(() => {
    return sortedOpenPositions.reduce((acc, pos) => acc + (pos.totalPL || 0), 0);
  }, [sortedOpenPositions]);

  const realizedPL = useMemo(() => {
    const now = new Date();
    const getDateString = (date: Date): string => date.toISOString().split('T')[0];
    const todayStr = getDateString(now);

    const filteredPositions = sortedClosedPositions.filter(pos => {
        if (!pos.closeDate) return false;
        switch (realizedPLPeriod) {
            case 'today': return pos.closeDate === todayStr;
            case 'last7': {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                return pos.closeDate >= getDateString(sevenDaysAgo);
            }
            case 'last30': {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 29);
                return pos.closeDate >= getDateString(thirtyDaysAgo);
            }
            case 'last90': {
                const ninetyDaysAgo = new Date(now);
                ninetyDaysAgo.setDate(now.getDate() - 89);
                return pos.closeDate >= getDateString(ninetyDaysAgo);
            }
            case 'last365': {
                const oneYearAgo = new Date(now);
                oneYearAgo.setFullYear(now.getFullYear() - 1);
                return pos.closeDate >= getDateString(oneYearAgo);
            }
            case 'ytd': return pos.closeDate >= `${now.getFullYear()}-01-01`;
            case 'custom': {
                if (!customDateRange.start || !customDateRange.end) return false;
                return pos.closeDate >= customDateRange.start && pos.closeDate <= customDateRange.end;
            }
            default: return true;
        }
    });

    return filteredPositions.reduce((acc, pos) => acc + (pos.realizedPL || 0), 0);
  }, [sortedClosedPositions, realizedPLPeriod, customDateRange]);

  const HeaderInfo = () => {
    if (apiProvider === 'alpaca') {
        return (
            <p className="text-center text-gray-400 mt-2">
                Live stock & option data from <a href="https://alpaca.markets/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">Alpaca</a>.
            </p>
        );
    }
    return (
        <p className="text-center text-gray-400 mt-2">
            Live stock data from <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">Alpha Vantage</a>. Option prices via AI simulation.
        </p>
    );
  };

  const hasPositions = useMemo(() => positions.length > 0, [positions]);
  const deletingAccount = useMemo(() => accounts.find(acc => acc.id === deletingAccountId), [accounts, deletingAccountId]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <NotificationContainer notifications={notifications} onDismiss={handleDismissNotification} />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <div className="flex justify-center items-center gap-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-cyan-400">
                Options P/L Tracker
            </h1>
            <button onClick={() => setIsApiModalOpen(true)} className="text-gray-400 hover:text-white transition-colors" title="API Settings">
                <SettingsIcon />
            </button>
          </div>
          <HeaderInfo />
        </header>
        
        <div className="mb-8">
            <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelectAccount={setSelectedAccountId}
                onAddAccount={() => setIsAddAccountModalOpen(true)}
                onDeleteAccount={requestDeleteAccount}
            />
        </div>

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
                    <span className="text-2xl leading-none" aria-hidden="true">&times;</span>
                </button>
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
            <SummaryCard
              unrealizedPL={unrealizedPL}
              realizedPL={realizedPL}
              realizedPLPeriod={realizedPLPeriod}
              onRealizedPLPeriodChange={setRealizedPLPeriod}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
              onRefresh={refreshPrices}
              isLoading={isLoading}
              hasPositions={hasPositions}
              onAdd={() => setIsFormVisible(!isFormVisible)}
              isFormVisible={isFormVisible}
              hasAccounts={accounts.length > 0}
              apiKeysConfigured={apiKeysConfigured}
            />
          </div>

          <div className="lg:col-span-3">
            <PLChart data={plHistory} />
          </div>

          {isFormVisible && (
            <div className="lg:col-span-3">
              <OptionForm
                onSubmit={addStrategy}
                onCancel={() => setIsFormVisible(false)}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
              />
            </div>
          )}
          
          <div className="lg:col-span-3">
            <div className="flex border-b border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab('open')}
                className={`px-6 py-3 font-semibold text-lg transition-colors ${activeTab === 'open' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
                aria-current={activeTab === 'open'}
              >
                Open Positions ({sortedOpenPositions.length})
              </button>
              <button
                onClick={() => setActiveTab('closed')}
                className={`px-6 py-3 font-semibold text-lg transition-colors ${activeTab === 'closed' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
                aria-current={activeTab === 'closed'}
              >
                Closed Positions ({sortedClosedPositions.length})
              </button>
            </div>
            
            {activeTab === 'open' ? (
              <PortfolioTable 
                positions={sortedOpenPositions} 
                stockData={stockData}
                isLoading={isLoading} 
                onEdit={openEditModal} 
                onRoll={openRollModal} 
                onClose={openCloseModal}
                sortConfig={openSortConfig}
                onSort={(key) => handleSort(key, 'open')}
              />
            ) : (
              <ClosedPositionsTable 
                positions={sortedClosedPositions} 
                sortConfig={closedSortConfig}
                onSort={(key) => handleSort(key, 'closed')}
              />
            )}
          </div>
          <div className="lg:col-span-3">
            <Watchlist
              tickers={allWatchlistTickers}
              items={watchlistItems}
              openPositionTickers={openPositionTickers}
              onAddTicker={handleAddTickerToWatchlist}
              onRemoveTicker={handleRemoveTickerFromWatchlist}
              onOpenChart={openChartModal}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-3">
             <AlertsPanel
                alerts={alerts}
                onAddAlert={handleAddAlert}
                onDeleteAlert={handleDeleteAlert}
                allWatchlistTickers={allWatchlistTickers}
              />
          </div>
        </main>
        {editingStrategy && (
          <EditStrategyModal
            strategy={editingStrategy}
            onSave={handleUpdateStrategy}
            onCancel={() => setEditingStrategy(null)}
            accounts={accounts}
          />
        )}
        {rollingStrategy && (
          <RollStrategyModal
            strategy={rollingStrategy}
            onSave={handleRollStrategy}
            onCancel={() => setRollingStrategy(null)}
          />
        )}
        {closingStrategy && (
          <CloseStrategyModal
            strategy={closingStrategy}
            onConfirmClose={handleCloseStrategy}
            onCancel={() => setClosingStrategy(null)}
          />
        )}
        {isAddAccountModalOpen && (
          <AddAccountModal
            onSave={addAccount}
            onCancel={() => setIsAddAccountModalOpen(false)}
          />
        )}
        {deletingAccount && (
          <ConfirmDeleteAccountModal
            accountName={deletingAccount.name}
            onConfirm={confirmDeleteAccount}
            onCancel={cancelDeleteAccount}
          />
        )}
        {isApiModalOpen && (
            <ApiSettingsModal
                currentProvider={apiProvider}
                currentKeys={apiKeys}
                onSave={handleSaveApiSettings}
                onCancel={() => setIsApiModalOpen(false)}
            />
        )}
        {chartTicker && (
            <StockChartModal
                ticker={chartTicker}
                apiProvider={apiProvider}
                apiKeys={apiKeys}
                onClose={() => setChartTicker(null)}
            />
        )}
      </div>
    </div>
  );
};

export default App;