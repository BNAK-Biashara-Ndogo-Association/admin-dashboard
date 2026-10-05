export const formatMoney = (amount: number) => `KES ${new Intl.NumberFormat('en-KE').format(amount)}`;
