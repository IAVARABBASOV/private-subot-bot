import { IChannel, IMember } from "./types";

export function getMemberData(channelId: number, memberId: number) : IMember {

    const expireDate = calculateExpireDate(`${getRandomOf(10)} days`).getTime().toString();

    const emptySub: IMember = {
        id: memberId.toString(),
        subscribedChannelId: channelId,
        enddate: expireDate,
        role: getRandomRole(),
        startdate: Date.now().toString(),
        username: `yuzer_#${memberId}`,
        subscriptionPlanId: "1",
        joinLink: ""
    };

    return emptySub;
  }

  const roles = ['admin', 'subscriber', 'banned'];
  const roleWeights = {
      'admin': 0.15,      // 15%
      'subscriber': 0.60, // 60%
      'banned': 0.25      // 25%
  };

  function getWeightOfRole(role: string) : number{
    if(role === 'admin') return roleWeights.admin;
    if(role === 'banned') return roleWeights.banned;

    return roleWeights.subscriber;
  }

  function getRandomRole() : 'admin' | 'subscriber' | 'banned' {
      const random = Math.random(); // Random number between 0 and 1
      let cumulativeWeight = 0;

      for (let index = 0; index < 3; index++) {
        const role = roles[index];
        cumulativeWeight += getWeightOfRole(role); // Add the weight of the current role
        if (random < cumulativeWeight) {
            return role as 'admin' | 'subscriber' | 'banned'; // Return the role if random falls within the current range
        }
      }
  }


  function calculateExpireDate(input: string): Date {
    const [amount, unit] = input.split(" "); // Split input into amount and unit
    const currentDate = new Date(); // Get current date
    const parsedAmount = parseInt(amount, 10); // Convert amount to a number

    if (isNaN(parsedAmount)) {
        throw new Error("Invalid amount. Please provide a number followed by a unit (e.g., '3 months').");
    }

    switch (unit.toLowerCase()) {
        case "day":
        case "days":
            currentDate.setDate(currentDate.getDate() + parsedAmount); // Add days
            break;
        case "month":
        case "months":
            currentDate.setMonth(currentDate.getMonth() + parsedAmount); // Add months
            break;
        default:
            throw new Error("Invalid unit. Supported units are 'days' and 'months'.");
    }

    return currentDate;
}

function getRandomOf(initNum: number) : number {
    return Math.floor(Math.random() * initNum) + 1;
}