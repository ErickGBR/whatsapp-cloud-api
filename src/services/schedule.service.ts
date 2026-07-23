export class ScheduleService {
  private openingHour: number = 9; // 9 AM
  private closingHour: number = 18; // 6 PM
  private timezone: string = "America/Mexico_City";

  setSchedule(openingHour: number, closingHour: number, timezone?: string): void {
    this.openingHour = openingHour;
    this.closingHour = closingHour;
    if (timezone) {
      this.timezone = timezone;
    }
  }

  isOpen(): boolean {
    const now = new Date();
    const hour = now.getHours();

    // Check if it's a business day (Monday to Friday)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Closed on weekends
    }

    return hour >= this.openingHour && hour < this.closingHour;
  }

  getOpeningHours(): string {
    const opening = this.formatHour(this.openingHour);
    const closing = this.formatHour(this.closingHour);
    return `${opening} - ${closing}`;
  }

  getNextOpeningTime(): string {
    const now = new Date();
    let nextOpen = new Date(now);

    // If weekend, go to next Monday
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      // Sunday
      nextOpen.setDate(now.getDate() + 1); // Monday
    } else if (dayOfWeek === 6) {
      // Saturday
      nextOpen.setDate(now.getDate() + 2); // Monday
    } else if (now.getHours() >= this.closingHour) {
      // If past closing time, next day
      nextOpen.setDate(now.getDate() + 1);
    }

    nextOpen.setHours(this.openingHour, 0, 0, 0);

    return nextOpen.toLocaleString("en-US", {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getOffHoursMessage(): string {
    const schedule = this.getOpeningHours();
    const nextOpen = this.getNextOpeningTime();

    return `⏰ *BUSINESS HOURS*\n\n` +
           `Our hours are *${schedule}* (Monday to Friday)\n\n` +
           `We are currently closed. We'll be available on *${nextOpen}*.\n\n` +
           `You can leave your message and we'll reply when we open.`;
  }

  private formatHour(hour: number): string {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  }
}

export const scheduleService = new ScheduleService();

