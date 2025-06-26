declare global {
    interface Date {
        /**
         * This Function Designed to Calculate the Rounded time by Adding to this Time
         * @param ms Milliseconds to add.
         */
        getRoundedNextTime(ms: number): number;
    }
}

Date.prototype.getRoundedNextTime = function (this, ms: number): number {
    const step = 60; // Dynamic step size (e.g., 60 seconds in your case)
    const planExpireDateTime = Math.round(Math.round(this.getTime() + ms) / 1000);
    const roundedPlanExpireDateTime = Math.round(planExpireDateTime / step) * step;

    return roundedPlanExpireDateTime; // Round to step
};