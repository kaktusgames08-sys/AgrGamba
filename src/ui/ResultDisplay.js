export function formatMachineResult({ loser, winner }) {
  return {
    payer: `${String(loser).toUpperCase()} PLATÍ`,
    winner: `${String(winner).toUpperCase()} VYHRÁVÁ`,
    tone: String(winner).toLowerCase() === 'agraelus' ? 'agra' : 'chat',
  };
}
