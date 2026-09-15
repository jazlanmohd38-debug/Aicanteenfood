import type { SalesRecord, FoodItem } from './supabase';

export interface PredictionInput {
  foodItemId: string;
  targetDate: string;
  dayOfWeek: string;
  isHoliday: boolean;
  isCollegeEvent: boolean;
  weatherCondition: string;
  specialOccasion: string;
}

export interface PredictionResult {
  predictedQuantity: number;
  confidence: number;
  factors: { label: string; impact: number; detail: string }[];
  averageSold: number;
  recentTrend: number;
  baseDemand: number;
}

const WEATHER_FACTORS: Record<string, number> = {
  Sunny: 1.0,
  Cloudy: 0.95,
  Rainy: 0.75,
  Cold: 1.15,
  Windy: 0.9,
  Hot: 1.1,
};

const DAY_FACTORS: Record<string, number> = {
  Sunday: 0.4,
  Monday: 1.0,
  Tuesday: 1.0,
  Wednesday: 1.05,
  Thursday: 1.0,
  Friday: 0.95,
  Saturday: 0.7,
};

export function predictDemand(
  input: PredictionInput,
  historicalData: SalesRecord[],
  foodItems: FoodItem[]
): PredictionResult {
  const itemRecords = historicalData.filter(
    (r) => r.food_item_id === input.foodItemId
  );

  const factors: { label: string; impact: number; detail: string }[] = [];

  // Base demand: average sold for this item
  const avgSold =
    itemRecords.length > 0
      ? itemRecords.reduce((sum, r) => sum + r.quantity_sold, 0) / itemRecords.length
      : 50;
  const baseDemand = Math.round(avgSold);
  factors.push({
    label: 'Base Demand (Historical Average)',
    impact: 1.0,
    detail: `Average sold: ${baseDemand} units across ${itemRecords.length} records`,
  });

  // Day of week factor
  const dayFactor = DAY_FACTORS[input.dayOfWeek] ?? 1.0;
  factors.push({
    label: 'Day of Week',
    impact: dayFactor,
    detail: `${input.dayOfWeek} factor: ${dayFactor.toFixed(2)}x`,
  });

  // Same day-of-week average (last 4 occurrences)
  const sameDayRecords = itemRecords
    .filter((r) => r.day_of_week === input.dayOfWeek)
    .slice(-4);
  const sameDayAvg =
    sameDayRecords.length > 0
      ? sameDayRecords.reduce((sum, r) => sum + r.quantity_sold, 0) / sameDayRecords.length
      : avgSold;

  // Recent trend: last 7 days average vs overall average
  const recentRecords = itemRecords.slice(-7);
  const recentAvg =
    recentRecords.length > 0
      ? recentRecords.reduce((sum, r) => sum + r.quantity_sold, 0) / recentRecords.length
      : avgSold;
  const trendRatio = recentAvg / (avgSold || 1);
  const recentTrend = Math.round(recentAvg);
  factors.push({
    label: 'Recent Sales Trend',
    impact: trendRatio,
    detail: `Last 7 records avg: ${recentTrend} units (trend: ${trendRatio > 1.05 ? 'rising' : trendRatio < 0.95 ? 'declining' : 'stable'})`,
  });

  // Weather factor
  const weatherFactor = WEATHER_FACTORS[input.weatherCondition] ?? 1.0;
  factors.push({
    label: 'Weather Condition',
    impact: weatherFactor,
    detail: `${input.weatherCondition} factor: ${weatherFactor.toFixed(2)}x`,
  });

  // Holiday factor
  const holidayFactor = input.isHoliday ? 0.3 : 1.0;
  factors.push({
    label: 'Holiday',
    impact: holidayFactor,
    detail: input.isHoliday ? 'Holiday: demand drops to 30%' : 'No holiday: normal demand',
  });

  // College event factor
  const eventFactor = input.isCollegeEvent ? 1.4 : 1.0;
  factors.push({
    label: 'College Event',
    impact: eventFactor,
    detail: input.isCollegeEvent ? 'Event day: demand boosted 40%' : 'No event: normal demand',
  });

  // Special occasion factor
  const occasionFactor = input.specialOccasion.trim() !== '' ? 1.25 : 1.0;
  factors.push({
    label: 'Special Occasion',
    impact: occasionFactor,
    detail:
      input.specialOccasion.trim() !== ''
        ? `${input.specialOccasion}: demand boosted 25%`
        : 'No special occasion',
  });

  // Weighted prediction: blend same-day-of-week average with overall average
  const blendedBase =
    sameDayRecords.length > 0
      ? sameDayAvg * 0.6 + avgSold * 0.4
      : avgSold;

  const predicted = Math.round(
    blendedBase *
      dayFactor *
      weatherFactor *
      holidayFactor *
      eventFactor *
      occasionFactor *
      (0.7 + trendRatio * 0.3)
  );

  // Confidence: based on data volume and factor stability
  const dataVolume = Math.min(itemRecords.length / 30, 1); // full confidence at 30+ records
  const sameDayVolume = Math.min(sameDayRecords.length / 4, 1);
  const confidence = Math.round(
    (dataVolume * 0.4 + sameDayVolume * 0.4 + 0.2) * 100
  );

  return {
    predictedQuantity: Math.max(predicted, 5),
    confidence,
    factors,
    averageSold: Math.round(avgSold),
    recentTrend,
    baseDemand,
  };
}

export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][date.getDay()];
}
