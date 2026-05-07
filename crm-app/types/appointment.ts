export interface Appointment {
  _id: string;
  title: string;
  clientName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
  reminderSent: boolean;
  createdAt: string;
}
