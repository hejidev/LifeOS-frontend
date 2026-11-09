const API = process.env.API_URL ?? "http://localhost:5000/api";
const required = ["OWNER_EMAIL", "OWNER_PASSWORD", "STORE_CODE", "STAFF_NAME", "STAFF_PIN"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Set these environment variables first: ${missing.join(", ")}`);
  process.exit(1);
}

const results = [];

function check(label, ok, detail) {
  results.push(!!ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  ->  ${detail}`}`);
}

function finish() {
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function call(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Client": "mobile", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  return { status: response.status, data };
}

const pad = (value) => String(value).padStart(2, "0");
const now = new Date();
const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const offset = -now.getTimezoneOffset();

const ownerLogin = await call("/auth/login", { method: "POST", body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } });
check("Owner signs in", ownerLogin.status === 200 && ownerLogin.data?.accessToken, `status ${ownerLogin.status}`);
if (!ownerLogin.data?.accessToken) finish();
const owner = ownerLogin.data.accessToken;

const staffLogin = await call("/staff-session/login", { method: "POST", body: { storeCode: process.env.STORE_CODE, name: process.env.STAFF_NAME, pin: process.env.STAFF_PIN } });
check("Staff signs in and receives a token", staffLogin.status === 200 && staffLogin.data?.token, `status ${staffLogin.status}`);
if (!staffLogin.data?.token) finish();
const staff = staffLogin.data.token;

const me = await call("/staff-session/me", { token: staff });
const storeId = me.data?.scope?.storeId;
const role = me.data?.staff?.role;
check("Staff session reports a store", !!storeId, JSON.stringify(me.data?.scope));
if (!storeId) finish();

const created = await call("/business/products", {
  method: "POST",
  token: owner,
  body: { name: `Smoke test ${Date.now()}`, price: 100, stock: 5, lowStockAt: 1, storeId },
});
const product = created.data?.product;
check("Owner creates a test product with stock 5", created.status === 201 && product?.id, `status ${created.status}`);
if (!product?.id) finish();

const requestId = crypto.randomUUID();
const salePayload = { clientRequestId: requestId, items: [{ productId: product.id, name: product.name, unitPrice: 100, quantity: 2 }], paymentMethod: "CASH", status: "PAID" };
const sale = await call("/staff-pos/sales", { method: "POST", token: staff, body: salePayload });
check("Staff sells 2 units", sale.status === 201 && sale.data?.sale?.id, `status ${sale.status} ${sale.data?.error ?? ""}`);
const saleId = sale.data?.sale?.id;

const replay = await call("/staff-pos/sales", { method: "POST", token: staff, body: salePayload });
check("Repeating the same request returns the same sale", replay.data?.sale?.id === saleId);

const listed = await call(`/business/products?active=true&storeId=${storeId}`, { token: owner });
check("Stock fell to 3, not 1", listed.data?.products?.find((item) => item.id === product.id)?.stock === 3);

const threads = await call("/staff-chat/threads", { token: staff });
check("Staff sees the team chat and an owner thread", threads.data?.threads?.some((t) => t.kind === "TEAM") && threads.data?.threads?.some((t) => t.kind === "DIRECT"));
const teamThread = threads.data?.threads?.find((t) => t.kind === "TEAM")?.id;

const hello = await call(`/staff-chat/threads/${teamThread}/messages`, { method: "POST", token: staff, body: { body: "Smoke test message" } });
check("Staff posts to the team chat", hello.status === 201);

const withProduct = await call(`/staff-chat/threads/${teamThread}/messages`, { method: "POST", token: staff, body: { attachment: { type: "PRODUCT", id: product.id } } });
check("Staff shares a product", withProduct.status === 201 && withProduct.data?.message?.attachment?.title === product.name);

const withSale = await call(`/staff-chat/threads/${teamThread}/messages`, { method: "POST", token: staff, body: { attachment: { type: "SALE", id: saleId } } });
check("Staff shares their own sale", withSale.status === 201 && withSale.data?.message?.attachment?.type === "SALE", `status ${withSale.status}`);

const emptyMessage = await call(`/staff-chat/threads/${teamThread}/messages`, { method: "POST", token: staff, body: { body: "  " } });
check("An empty message is rejected", emptyMessage.status === 400, `status ${emptyMessage.status}`);

const foreign = await call("/staff-chat/threads/dm_00000000-0000-0000-0000-000000000000/messages", { token: staff });
check("Staff can't open another person's direct thread", foreign.status === 404, `status ${foreign.status}`);

const ownerThreads = await call("/merchant/chat/threads", { token: owner });
const ownerTeam = ownerThreads.data?.threads?.find((t) => t.kind === "TEAM");
check("Owner has unread team messages", (ownerTeam?.unread ?? 0) >= 1);
await call(`/merchant/chat/threads/${ownerTeam?.id}/read`, { method: "POST", token: owner });
const afterRead = await call("/merchant/chat/threads", { token: owner });
check("Reading clears the unread count", afterRead.data?.threads?.find((t) => t.kind === "TEAM")?.unread === 0);

const since = encodeURIComponent(new Date(Date.now() - 10 * 60000).toISOString());
const shift = await call(`/staff-ops/shift-summary?since=${since}`, { token: staff });
check("Shift summary includes the sale", shift.status === 200 && shift.data?.orders >= 1 && shift.data?.revenue >= 200, JSON.stringify(shift.data));

const report = await call(`/ops/reports/daily?date=${localDate}&offset=${offset}&storeId=${storeId}`, { token: owner });
check("Daily report counts the sale", report.status === 200 && report.data?.summary?.revenue >= 200, JSON.stringify(report.data?.summary));
check("Daily report splits payments", report.data?.byPayment?.some((row) => row.method === "CASH"));

const badRemoval = await call(`/ops/products/${product.id}/stock`, { method: "POST", token: owner, body: { delta: -50, reason: "DAMAGED", storeId } });
check("Removing more than is in stock is refused", badRemoval.status === 409, `status ${badRemoval.status}`);

const received = await call(`/ops/products/${product.id}/stock`, { method: "POST", token: owner, body: { delta: 4, reason: "RECEIVED", storeId } });
check("Receiving 4 units brings stock to 7", received.status === 200 && received.data?.stock === 7, JSON.stringify(received.data));

const history = await call(`/ops/products/${product.id}/stock-history?storeId=${storeId}`, { token: owner });
check("Stock history records the change", history.data?.movements?.some((row) => row.reason === "RECEIVED" && row.delta === 4));

const staffAdjust = await call(`/staff-ops/products/${product.id}/stock`, { method: "POST", token: staff, body: { delta: 1, reason: "RECEIVED" } });
const allowed = ["INVENTORY_CLERK", "MANAGER"].includes(role);
check(`${role} ${allowed ? "may" : "may not"} adjust stock`, staffAdjust.status === (allowed ? 200 : 403), `status ${staffAdjust.status}`);

if (process.env.CLERK_NAME && process.env.CLERK_PIN) {
  const clerkLogin = await call("/staff-session/login", { method: "POST", body: { storeCode: process.env.STORE_CODE, name: process.env.CLERK_NAME, pin: process.env.CLERK_PIN } });
  const clerkAdjust = await call(`/staff-ops/products/${product.id}/stock`, { method: "POST", token: clerkLogin.data?.token, body: { delta: 1, reason: "RECEIVED" } });
  check("The clerk can adjust stock", clerkAdjust.status === 200, `status ${clerkAdjust.status}`);
}

const before = (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock;
const refund = await call(`/business/sales/${saleId}/status`, { method: "PATCH", token: owner, body: { status: "REFUNDED" } });
const after = (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock;
check("Refund succeeds", refund.status === 200, `status ${refund.status}`);
check("Refund returns the 2 units to stock", after === before + 2, `before ${before}, after ${after}`);

const refundAgain = await call(`/business/sales/${saleId}/status`, { method: "PATCH", token: owner, body: { status: "REFUNDED" } });
check("Refunding twice does not return stock twice", (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock === after, `second refund status ${refundAgain.status}`);

const customerResult = await call("/business/customers", { method: "POST", token: owner, body: { name: `Smoke customer ${Date.now()}` } });
const customerId = customerResult.data?.customer?.id;
check("Owner adds a test customer", customerResult.status === 201 && customerId, `status ${customerResult.status}`);

const creditItems = [{ productId: product.id, name: product.name, unitPrice: 100, quantity: 1 }];
const noCustomer = await call("/business/sales", { method: "POST", token: owner, body: { clientRequestId: crypto.randomUUID(), status: "PENDING", items: creditItems, storeId } });
check("A pay-later sale without a customer is refused", noCustomer.status === 400, `status ${noCustomer.status}`);

const stockBeforeCredit = (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock;
const credit = await call("/business/sales", { method: "POST", token: owner, body: { clientRequestId: crypto.randomUUID(), status: "PENDING", items: creditItems, customerId, storeId } });
const creditId = credit.data?.sale?.id;
check("A pay-later sale is recorded as unpaid", credit.status === 201 && credit.data?.sale?.status === "PENDING", `status ${credit.status} ${credit.data?.error ?? ""}`);

const stockAfterCredit = (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock;
check("Stock drops when a credit sale is recorded", stockAfterCredit === stockBeforeCredit - 1, `before ${stockBeforeCredit}, after ${stockAfterCredit}`);

const profileBefore = await call(`/ops/customers/${customerId}/profile`, { token: owner });
check("The profile shows the 100 owed", profileBefore.data?.stats?.balance === 100 && profileBefore.data?.pending?.length === 1, JSON.stringify(profileBefore.data?.stats));

const collected = await call(`/ops/sales/${creditId}/collect`, { method: "POST", token: owner, body: { paymentMethod: "TRANSFER" } });
check("Collecting payment marks the sale paid", collected.status === 200 && collected.data?.sale?.status === "PAID" && collected.data?.sale?.paymentMethod === "TRANSFER", `status ${collected.status}`);

const collectedAgain = await call(`/ops/sales/${creditId}/collect`, { method: "POST", token: owner, body: { paymentMethod: "CASH" } });
check("Collecting the same sale twice is refused", collectedAgain.status === 409, `status ${collectedAgain.status}`);

const profileAfter = await call(`/ops/customers/${customerId}/profile`, { token: owner });
check("The balance clears and lifetime spend rises", profileAfter.data?.stats?.balance === 0 && profileAfter.data?.stats?.lifetimeSpend >= 100, JSON.stringify(profileAfter.data?.stats));

const cancelled = await call("/business/sales", { method: "POST", token: owner, body: { clientRequestId: crypto.randomUUID(), status: "PENDING", items: creditItems, customerId, storeId } });
const stockWithCancel = (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock;
await call(`/business/sales/${cancelled.data?.sale?.id}/status`, { method: "PATCH", token: owner, body: { status: "CANCELLED" } });
const stockAfterCancel = (await call(`/business/products?active=true&storeId=${storeId}`, { token: owner })).data?.products?.find((item) => item.id === product.id)?.stock;
check("Cancelling an unpaid sale returns its stock", stockAfterCancel === stockWithCancel + 1, `before ${stockWithCancel}, after ${stockAfterCancel}`);

const registerState = await call(`/ops/register/current?storeId=${storeId}`, { token: owner });
if (registerState.data?.session) {
  check("No register is open at this location", false, "Close the open register, then run the test again.");
} else {
  const expectedCash = async () => (await call(`/ops/register/current?storeId=${storeId}`, { token: owner })).data?.session?.cash?.expected;

  const opened = await call("/ops/register/open", { method: "POST", token: owner, body: { openingFloat: 1000, storeId } });
  check("The register opens with a 1000 float", opened.status === 201 && opened.data?.session?.cash?.expected === 1000, JSON.stringify(opened.data));

  const openedTwice = await call("/ops/register/open", { method: "POST", token: owner, body: { openingFloat: 5, storeId } });
  check("A second register can't be opened at the same location", openedTwice.status === 409, `status ${openedTwice.status}`);

  const cashSale = await call("/business/sales", { method: "POST", token: owner, body: { clientRequestId: crypto.randomUUID(), status: "PAID", paymentMethod: "CASH", items: creditItems, storeId } });
  const cashSaleId = cashSale.data?.sale?.id;
  check("A 100 cash sale raises expected cash to 1100", (await expectedCash()) === 1100, String(await expectedCash()));

  const payOut = await call("/ops/register/movements", { method: "POST", token: owner, body: { kind: "PAY_OUT", amount: 50, reason: "Supplies", storeId } });
  check("A 50 pay-out lowers it to 1050", payOut.data?.session?.cash?.expected === 1050, JSON.stringify(payOut.data?.session?.cash));

  const tooMuch = await call("/ops/register/movements", { method: "POST", token: owner, body: { kind: "PAY_OUT", amount: 99999, reason: "Too much", storeId } });
  check("Paying out more than the drawer holds is refused", tooMuch.status === 409, `status ${tooMuch.status}`);

  const credit = await call("/business/sales", { method: "POST", token: owner, body: { clientRequestId: crypto.randomUUID(), status: "PENDING", items: creditItems, customerId, storeId } });
  const creditSaleId = credit.data?.sale?.id;
  check("A credit sale doesn't change the drawer", (await expectedCash()) === 1050);

  const part = await call(`/ops/sales/${creditSaleId}/collect`, { method: "POST", token: owner, body: { paymentMethod: "CASH", amount: 40 } });
  check("A 40 part-payment leaves 60 owed and the sale unpaid", part.data?.sale?.status === "PENDING" && part.data?.sale?.balance === 60, JSON.stringify(part.data?.sale));
  check("The part-payment adds 40 to the drawer", (await expectedCash()) === 1090);

  const over = await call(`/ops/sales/${creditSaleId}/collect`, { method: "POST", token: owner, body: { paymentMethod: "CASH", amount: 100 } });
  check("Collecting more than is owed is refused", over.status === 400, `status ${over.status}`);

  const cancelPartial = await call(`/business/sales/${creditSaleId}/status`, { method: "PATCH", token: owner, body: { status: "CANCELLED" } });
  check("A part-paid sale can't be cancelled", cancelPartial.status === 409, `status ${cancelPartial.status}`);

  const finish = await call(`/ops/sales/${creditSaleId}/collect`, { method: "POST", token: owner, body: { paymentMethod: "TRANSFER" } });
  check("Collecting the rest completes the sale", finish.data?.sale?.status === "PAID" && finish.data?.sale?.balance === 0, JSON.stringify(finish.data?.sale));
  check("A transfer doesn't change the drawer", (await expectedCash()) === 1090);

  const history = await call(`/ops/sales/${creditSaleId}/payments`, { token: owner });
  check("The sale shows two payments", history.data?.payments?.length === 2, JSON.stringify(history.data));

  await call(`/business/sales/${cashSaleId}/status`, { method: "PATCH", token: owner, body: { status: "REFUNDED" } });
  check("Refunding the cash sale takes 100 back out", (await expectedCash()) === 990, String(await expectedCash()));

  const closed = await call("/ops/register/close", { method: "POST", token: owner, body: { countedCash: 985, note: "Smoke test", storeId } });
  check("Closing with 985 counted reports 5 short", closed.data?.session?.cash?.expected === 990 && closed.data?.session?.variance === -5, JSON.stringify(closed.data?.session));

  const after = await call(`/ops/register/current?storeId=${storeId}`, { token: owner });
  check("No register is open afterwards", after.data?.session === null);
}

const removed = await call(`/business/products/${product.id}`, { method: "DELETE", token: owner });
check("Test product is archived", removed.status === 204, `status ${removed.status}`);

finish();