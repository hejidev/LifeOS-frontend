import "dotenv/config";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

const plans = [
  { key: "STARTER_MONTHLY", name: "Starter (Monthly)", amount: 100000, interval: "monthly" },
  { key: "STARTER_YEARLY", name: "Starter (Yearly)", amount: 1000000, interval: "annually" },
  { key: "PRO_MONTHLY", name: "Pro (Monthly)", amount: 250000, interval: "monthly" },
  { key: "PRO_YEARLY", name: "Pro (Yearly)", amount: 2500000, interval: "annually" },
  { key: "PREMIUM_MONTHLY", name: "Premium (Monthly)", amount: 450000, interval: "monthly" },
  { key: "PREMIUM_YEARLY", name: "Premium (Yearly)", amount: 4500000, interval: "annually" },
  { key: "MERCHANT_STARTER_MONTHLY", name: "Merchant Starter (Monthly)", amount: 200000, interval: "monthly" },
  { key: "MERCHANT_STARTER_YEARLY", name: "Merchant Starter (Yearly)", amount: 2000000, interval: "annually" },
  { key: "MERCHANT_GROWTH_MONTHLY", name: "Merchant Growth (Monthly)", amount: 500000, interval: "monthly" },
  { key: "MERCHANT_GROWTH_YEARLY", name: "Merchant Growth (Yearly)", amount: 5000000, interval: "annually" },
  { key: "MERCHANT_PRO_MONTHLY", name: "Merchant Pro (Monthly)", amount: 1000000, interval: "monthly" },
  { key: "MERCHANT_PRO_YEARLY", name: "Merchant Pro (Yearly)", amount: 10000000, interval: "annually" },
];

async function main() {
  for (const plan of plans) {
    const res = await fetch("https://api.paystack.co/plan", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: plan.name, amount: plan.amount, interval: plan.interval }),
    });
    const data = await res.json();
    console.log(`PAYSTACK_PLAN_${plan.key}=${data.data.plan_code}`);
  }
}

main();