const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const calculateSubtotal = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 1);
    return sum + unitPrice * (Number.isFinite(quantity) ? quantity : 1);
  }, 0);
  return roundMoney(subtotal);
};

const calculateTax = (amount) => {
  return roundMoney(0);
};

const calculateDeposit = (amount) => {
  const base = roundMoney(amount);
  return roundMoney(base * 0.5);
};

const applyPromo = (promo, amount) => {
  const base = roundMoney(amount);
  if (!promo) {
    return {
      discountAmount: 0,
      discountedTotal: base,
    };
  }

  let discountAmount = 0;
  if (promo.discountType === 'percentage') {
    discountAmount = roundMoney(base * (Number(promo.discountValue || 0) / 100));
  } else if (promo.discountType === 'fixed') {
    discountAmount = roundMoney(Math.min(Number(promo.discountValue || 0), base));
  }

  const discountedTotal = roundMoney(Math.max(0, base - discountAmount));
  return {
    discountAmount,
    discountedTotal,
  };
};

module.exports = {
  roundMoney,
  calculateSubtotal,
  calculateTax,
  calculateDeposit,
  applyPromo,
};
