export interface HealthDay {
    date: string;
    label: string;
    sleepHours: number | null;
    steps: number | null;
    waterGlasses: number | null;
    workoutDone: boolean;
  }
  
  export interface HealthInsight {
    tone: "success" | "warning" | "danger" | "info";
    text: string;
  }
  
  export interface HealthHabit {
    id: string;
    title: string;
    frequency: "daily" | "weekly";
    streak: number;
    completedToday: boolean;
    atRisk: boolean;
  }
  
  export interface HealthDashboard {
    date: string;
    today: { sleepHours: number | null; steps: number | null; waterGlasses: number | null; workoutDone: boolean };
    goals: { sleepHours: number; steps: number; waterGlasses: number; workoutsPerWeek: number };
    week: HealthDay[];
    averages: { sleepHours: number | null; steps: number | null; waterGlasses: number | null };
    loggedDays: number;
    workoutsThisWeek: number;
    habits: HealthHabit[];
    insights: HealthInsight[];
  }