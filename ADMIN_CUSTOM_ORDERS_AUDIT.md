# Admin Custom Orders - Root Cause Audit

## ROOT CAUSE IDENTIFIED ✗

**The admin Orders UI does NOT display custom lamp orders** because:

1. **AdminPage.jsx** (the actual admin interface at `/admin`) only fetches regular orders
   - Line 63: `axios.get('${API_BASE_URL}/orders', ...)`
   - Does NOT fetch `/api/admin/custom-orders`
   - Has NO tab for custom orders
   - Has NO state for customOrders

2. **OrdersPage.jsx** (the user orders history page) was updated but is NOT used by admins
   - OrdersPage.jsx is for authenticated users viewing their own order history
   - Admins view orders via AdminPage.jsx, not OrdersPage.jsx

## FILES INVOLVED

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/pages/AdminPage.jsx` | ⚠️ ADMIN interface at /admin - NOT showing custom orders | **BROKEN** |
| `frontend/src/pages/OrdersPage.jsx` | User order history - has custom orders tab | ✅ Working |
| `frontend/src/App.jsx` | Routes: `/admin` → AdminPage | ✅ Correct |

## PROOF

**Current AdminPage.jsx:**
```javascript
// Line 40: Has orders state
const [orders, setOrders] = useState([]);

// Line 61-64: Only fetches regular orders
const [productsRes, ordersRes, postsRes] = await Promise.all([
  axios.get(`${API_BASE_URL}/admin/products`, ...),
  axios.get(`${API_BASE_URL}/orders`, ...),  // ← ONLY REGULAR ORDERS
  axios.get(`${API_BASE_URL}/blog`, ...),
]);

// Line 451-454: Tab for orders
<button className={activeTab === 'orders' ? 'tab active' : 'tab'}
  onClick={() => setActiveTab('orders')}>
  Orders
</button>

// Line 638-750: Renders ONLY regular orders from this.orders
// - No custom orders section
// - No custom orders tab
// - No custom orders rendering
```

## REQUIRED FIXES

### AdminPage.jsx Changes Needed:

1. Add state: `const [customOrders, setCustomOrders] = useState([])`
2. Fetch custom orders: Add to Promise.all
   ```javascript
   axios.get(`${API_BASE_URL}/admin/custom-orders`, { withCredentials: true })
   ```
3. Parse response: `setCustomOrders(customOrdersRes.data?.data || [])`
4. Add tab button for custom orders
5. Add render section for custom orders with:
   - Status dropdown
   - Admin notes textarea
   - Product details display
   - Image count display

## EXPECTED OUTCOME

After fixes:
- Admin goes to `/admin`
- Clicks "Orders" tab → Sees regular orders ✓
- Clicks "Custom Lamp Orders" tab → Sees submitted custom orders ✓
- Can change status and add admin notes ✓
