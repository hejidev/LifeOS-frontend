import type { Quote, Weather } from "@/types/life";

export const mockWeather: Weather = {
  location: "New York, NY",
  temp: 72,
  condition: "Partly Cloudy",
  high: 78,
  low: 65,
  icon: "partly-cloudy",
};

export const mockQuotes: Quote[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Your life does not get better by chance, it gets better by change.", author: "Jim Rohn" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
];

export function getRandomQuote(): Quote {
  return mockQuotes[Math.floor(Math.random() * mockQuotes.length)];
}
