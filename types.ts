

import { Time } from 'lightweight-charts';

export interface Account {
  id: string;
  name: string;
  broker: string;
}

export enum OptionType {
  CALL = 'CALL',
  PUT = 'PUT',
}

export enum OptionAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

// Represents the input for a single leg when creating a strategy
export interface OptionLegInput {
  ticker: string;
  type: OptionType;
  action: OptionAction;
  strike: number;
  expiration: string;
  purchasePrice: number;
  contracts: number;
}

// Represents a single leg within a strategy in the portfolio
export interface OptionLeg extends OptionLegInput {
  id:string;
  currentPrice: number | null;
  pl: number;
}

// Represents the input for a new strategy from the form
export interface OptionStrategyInput {
    name: string;
    legs: OptionLegInput[];
    accountId: string;
    openDate: string;
}

// Represents a full strategy in the portfolio
export interface OptionStrategy {
  id: string;
  name: string;
  legs: OptionLeg[];
  totalPL: number; // For open positions, this is unrealized P/L. For closed, it's the final P/L.
  accountId: string;
  openDate: string;
  closeDate?: string;
  realizedPL?: number; // Specifically for closed positions to store final P/L
}

export interface OptionPriceUpdate {
    id: string; // This will be the leg's ID
    currentPrice: number;
}

export interface StockPriceUpdate {
    ticker: string;
    price: number;
    previousClose: number;
}

export interface PLHistoryData {
  date: string; // YYYY-MM-DD
  unrealizedPL: number;
  realizedPL: number;
}

export interface WatchlistItem extends StockPriceUpdate {
  change: number;
  changePercent: number;
}

export interface CandlestickData {
  time: string; // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Types for table sorting
export type SortDirection = 'ascending' | 'descending';

export type SortableKey = 
  | keyof OptionStrategy 
  | 'action' 
  | 'type' 
  | 'strike' 
  | 'expiration' 
  | 'contracts' 
  | 'purchasePrice' 
  | 'margin';

export type SortConfig = {
  key: SortableKey;
  direction: SortDirection;
} | null;

// Types for Realized P/L time period filtering
export type RealizedPLPeriod = 'today' | 'last7' | 'last30' | 'last90' | 'last365' | 'ytd' | 'all' | 'custom';

// Types for API providers
export type ApiProvider = 'alphaVantage' | 'alpaca';

export interface ApiKeys {
  alphaVantage?: string;
  alpacaKey?: string;
  alpacaSecret?: string;
}

export enum LineStyle {
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
}

// Types for Chart Drawings
export interface PointInTime {
  time: Time;
  price: number;
}

export interface Drawing {
  id: string;
  start: PointInTime;
  end: PointInTime;
  color: string;
  lineWidth: number;
  lineStyle: LineStyle;
}

export interface TrendLine extends Drawing {
  extendLeft?: boolean;
  extendRight?: boolean;
}

export type Ruler = Drawing;
export type FibRetracement = Drawing;

export interface ChartDrawings {
  trendLines: TrendLine[];
  fibs: FibRetracement[];
}

// Types for Price Alerts
export enum AlertCondition {
  ABOVE = 'above',
  BELOW = 'below',
}

export enum AlertStatus {
  ACTIVE = 'active',
  TRIGGERED = 'triggered',
}

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  condition: AlertCondition;
  status: AlertStatus;
  createdAt: string;
  triggeredAt?: string;
}

// Indicator types
export interface BollingerBandsSettings {
  period: number;
  stdDev: number;
}

export interface StochasticRsiSettings {
  rsiPeriod: number;
  stochasticPeriod: number;
  kPeriod: number;
  dPeriod: number;
}

export type IndicatorSettings = BollingerBandsSettings | StochasticRsiSettings;

export interface IndicatorConfig<T extends IndicatorSettings = IndicatorSettings> {
  id: string;
  type: 'bollingerBands' | 'stochasticRSI';
  settings: T;
  isVisible?: boolean;
}

export interface BollingerBandsDataPoint {
  time: Time;
  upper: number;
  middle: number;
  lower: number;
}

export interface StochasticRsiDataPoint {
  time: Time;
  k: number;
  d: number;
}