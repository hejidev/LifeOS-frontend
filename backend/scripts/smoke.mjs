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

const removed = await call(`/business/products/${product.id}`, { method: "DELETE", token: owner });
check("Test product is archived", removed.status === 204, `status ${removed.status}`);

finish();