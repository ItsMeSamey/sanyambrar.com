// Keep fractional milliseconds across feedback pauses; display rounding belongs to the view.
export class ActiveCountdown {
  private deadline: number | null = null;
  private retained = 0;

  get running() { return this.deadline !== null; }

  start(duration: number, now: number) {
    this.retained = Math.max(0, duration);
    this.deadline = now + this.retained;
  }

  remaining(now: number) {
    return this.deadline === null ? this.retained : Math.max(0, this.deadline - now);
  }

  pause(now: number) {
    this.retained = this.remaining(now);
    this.deadline = null;
    return this.retained;
  }

  resume(now: number) {
    if (this.deadline === null && this.retained > 0) this.deadline = now + this.retained;
  }

  reset() {
    this.deadline = null;
    this.retained = 0;
  }
}
