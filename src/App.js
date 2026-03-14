import React, { useMemo, useState, useCallback, useReducer } from "react";

// ==================== INITIAL STATE ====================
const initialProducts = [
  { id: 1, barcode: "480001", name: "Instant Noodles", category: "Grocery", price: 18.5, stock: 120, active: true },
  { id: 2, barcode: "480002", name: "Bottled Water", category: "Beverage", price: 20, stock: 75, active: true },
  { id: 3, barcode: "480003", name: "Shampoo Sachet", category: "Personal Care", price: 8, stock: 220, active: true },
  { id: 4, barcode: "480004", name: "Canned Sardines", category: "Canned Goods", price: 27.75, stock: 43, active: true },
  { id: 5, barcode: "480005", name: "Chocolate Bar", category: "Snacks", price: 35, stock: 0, active: false },
];

const initialUsers = [
  { id: 1, name: "Maria Cruz", password: "1234", role: "Cashier", status: "Active", lastLogin: "08:42 AM" },
  { id: 2, name: "Daniel Reyes", password: "1234", role: "Supervisor", status: "Active", lastLogin: "09:01 AM" },
  { id: 3, name: "Angela Santos", password: "1234", role: "Administrator", status: "Active", lastLogin: "07:58 AM" },
  { id: 4, name: "Leo Gomez", password: "1234", role: "Cashier", status: "Inactive", lastLogin: "Yesterday" },
];

const initialAuditLogs = [
  { action: "Post-void Approved", user: "Daniel Reyes", details: "TXN-20481 reversed", time: "10:24 AM", level: "High" },
  { action: "Receipt Reprinted", user: "Maria Cruz", details: "TXN-20483 reprinted", time: "10:18 AM", level: "Medium" },
  { action: "User Role Updated", user: "Angela Santos", details: "Cashier assigned to Leo Gomez", time: "09:51 AM", level: "High" },
  { action: "Product Deactivated", user: "Angela Santos", details: "Chocolate Bar archived", time: "09:22 AM", level: "Medium" },
];

const initialTransactions = [
  { id: 20483, items: [{ id: 1, name: "Instant Noodles", qty: 3, price: 18.5 }, { id: 2, name: "Bottled Water", qty: 2, price: 20 }, { id: 3, name: "Canned Sardines", qty: 1, price: 27.75 }], total: 120.75, discount: "none", discountAmount: 0, timestamp: "10:18 AM", cashier: "Maria Cruz", reprinted: true },
];

// ==================== UTILITY FUNCTIONS ====================
function peso(v) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(v);
}

function getCurrentTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getNextTransactionId() {
  return Math.floor(Math.random() * 99999) + 20000;
}

// ==================== CART REDUCER ====================
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM":
      const existingItem = state.find(item => item.id === action.payload.id);
      if (existingItem) {
        return state.map(item => 
          item.id === action.payload.id 
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...state, { ...action.payload, qty: 1 }];
    
    case "REMOVE_ITEM":
      return state.filter(item => item.id !== action.payload);
    
    case "UPDATE_QUANTITY":
      return state.map(item =>
        item.id === action.payload.id
          ? { ...item, qty: Math.max(1, action.payload.qty) }
          : item
      );
    
    case "CLEAR_CART":
      return [];
    
    default:
      return state;
  }
};

// ==================== VALIDATOR FUNCTIONS ====================
const validators = {
  productName: (name) => name.trim().length >= 2,
  barcode: (barcode) => barcode.trim().length >= 5,
  price: (price) => price > 0,
  stock: (stock) => stock >= 0,
  userName: (name) => name.trim().length >= 2,
  password: (password) => password.length >= 4,
};

// ==================== MAIN COMPONENT ====================
export default function App() {
  // ==================== AUTHENTICATION ====================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ name: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("sales");
  const [discount, setDiscount] = useState("none");

  // ==================== STATE INITIALIZATION ====================
  // Initialize audit logs and transactions FIRST (before functions that use them)
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [transactions, setTransactions] = useState(initialTransactions);

  // Audit logging function
  const addAuditLog = useCallback((action, user, details, level) => {
    const newLog = { action, user, details, time: getCurrentTime(), level };
    setAuditLogs(prev => [newLog, ...prev]);
  }, []);

  const handleLogin = useCallback((e) => {
    e.preventDefault();
    setLoginError("");
    const user = initialUsers.find(u => u.name === loginForm.name && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginForm({ name: "", password: "" });
    } else {
      setLoginError("Invalid username or password");
    }
  }, [loginForm]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginForm({ name: "", password: "" });
    setActiveTab("sales");
  }, []);

  // ==================== PRODUCT MANAGEMENT ====================
  const [products, setProducts] = useState(initialProducts);
  const [productForm, setProductForm] = useState({ name: "", barcode: "", category: "", price: "", stock: "" });
  const [editingProductId, setEditingProductId] = useState(null);
  const [productErrors, setProductErrors] = useState({});
  const [productSearch, setProductSearch] = useState("");

  const validateProductForm = useCallback(() => {
    const errors = {};
    if (!validators.productName(productForm.name)) errors.name = "Name must be at least 2 characters";
    if (!validators.barcode(productForm.barcode)) errors.barcode = "Barcode must be at least 5 characters";
    if (!validators.price(parseFloat(productForm.price))) errors.price = "Price must be greater than 0";
    if (!validators.stock(parseInt(productForm.stock))) errors.stock = "Stock cannot be negative";
    setProductErrors(errors);
    return Object.keys(errors).length === 0;
  }, [productForm]);

  const handleAddProduct = useCallback((e) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    if (editingProductId) {
      setProducts(products.map(p => 
        p.id === editingProductId 
          ? { ...p, name: productForm.name, barcode: productForm.barcode, category: productForm.category, price: parseFloat(productForm.price), stock: parseInt(productForm.stock) }
          : p
      ));
      addAuditLog("Product Updated", currentUser.name, `Product ${productForm.name} updated`, "Medium");
      setEditingProductId(null);
      alert("✅ Product updated successfully");
    } else {
      const newProduct = { id: Date.now(), ...productForm, price: parseFloat(productForm.price), stock: parseInt(productForm.stock), active: true };
      setProducts([...products, newProduct]);
      addAuditLog("Product Added", currentUser.name, `New product: ${productForm.name}`, "Medium");
      alert("✅ Product added successfully");
    }
    setProductForm({ name: "", barcode: "", category: "", price: "", stock: "" });
  }, [products, productForm, editingProductId, currentUser, validateProductForm]);

  const handleDeactivateProduct = useCallback((id) => {
    setProducts(products.map(p => p.id === id ? { ...p, active: false } : p));
    addAuditLog("Product Deactivated", currentUser.name, `Product ${products.find(p => p.id === id)?.name} deactivated`, "Medium");
  }, [products, currentUser]);

  const handleEditProduct = useCallback((product) => {
    setProductForm({ name: product.name, barcode: product.barcode, category: product.category, price: product.price.toString(), stock: product.stock.toString() });
    setEditingProductId(product.id);
  }, []);

  const filteredProducts = useMemo(() => 
    products.filter((product) =>
      [product.name, product.barcode, product.category].join(" ").toLowerCase().includes(productSearch.toLowerCase())
    ),
    [products, productSearch]
  );

  // ==================== USER MANAGEMENT ====================
  const [users, setUsers] = useState(initialUsers);
  const [userForm, setUserForm] = useState({ name: "", password: "", role: "Cashier", status: "Active" });
  const [editingUserId, setEditingUserId] = useState(null);
  const [userErrors, setUserErrors] = useState({});

  const validateUserForm = useCallback(() => {
    const errors = {};
    if (!validators.userName(userForm.name)) errors.name = "Name must be at least 2 characters";
    if (!validators.password(userForm.password)) errors.password = "Password must be at least 4 characters";
    setUserErrors(errors);
    return Object.keys(errors).length === 0;
  }, [userForm]);

  const handleAddUser = useCallback((e) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    if (editingUserId) {
      setUsers(users.map(u => 
        u.id === editingUserId 
          ? { ...u, name: userForm.name, password: userForm.password, role: userForm.role, status: userForm.status }
          : u
      ));
      addAuditLog("User Role Updated", currentUser.name, `${userForm.role} assigned to ${userForm.name}`, "High");
      setEditingUserId(null);
    } else {
      const newUser = { id: Date.now(), ...userForm, lastLogin: "Never" };
      setUsers([...users, newUser]);
      addAuditLog("User Created", currentUser.name, `New ${userForm.role} account: ${userForm.name}`, "High");
    }
    setUserForm({ name: "", password: "", role: "Cashier", status: "Active" });
  }, [users, userForm, editingUserId, currentUser, validateUserForm]);

  const handleEditUser = useCallback((user) => {
    setUserForm({ name: user.name, password: user.password, role: user.role, status: user.status });
    setEditingUserId(user.id);
  }, []);

  // ==================== CART MANAGEMENT ====================
  const [cart, dispatchCart] = useReducer(cartReducer, []);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [voidItemId, setVoidItemId] = useState(null);

  const handleAddToCart = useCallback((product) => {
    if (!product.active) {
      alert("❌ Cannot add inactive product");
      return;
    }
    if (product.stock <= 0) {
      alert("❌ Out of stock - cannot add");
      return;
    }
    if (product.stock < 5) {
      alert(`⚠️ Low stock warning: Only ${product.stock} unit(s) remaining`);
    }
    dispatchCart({ type: "ADD_ITEM", payload: { id: product.id, name: product.name, price: product.price } });
  }, []);

  const handleBarcodeSearch = useCallback((barcode) => {
    const product = products.find(p => p.barcode === barcode && p.active);
    if (product) {
      handleAddToCart(product);
      setScannedBarcode("");
    } else {
      const foundInactive = products.find(p => p.barcode === barcode);
      if (foundInactive && !foundInactive.active) {
        alert("❌ Product is inactive and cannot be sold");
      } else {
        alert("❌ Product not found. Check barcode and try again.");
      }
    }
  }, [products, handleAddToCart]);

  const handleRemoveFromCart = useCallback((itemId) => {
    dispatchCart({ type: "REMOVE_ITEM", payload: itemId });
  }, []);

  const handleUpdateQuantity = useCallback((itemId, qty) => {
    dispatchCart({ type: "UPDATE_QUANTITY", payload: { id: itemId, qty } });
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const discountRate = discount === "senior" || discount === "pwd" ? 0.2 : discount === "athlete" || discount === "solo" ? 0.1 : 0;
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;

  const handleCancelSale = useCallback(() => {
    if (cart.length === 0) {
      alert("⚠️ Cart is empty - nothing to cancel");
      return;
    }
    if (!cancelReason.trim()) {
      alert("❌ Please provide a reason for cancellation");
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to cancel this sale?\n\nTotal: ${peso(total)}\nReason: ${cancelReason}\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      dispatchCart({ type: "CLEAR_CART" });
      addAuditLog("Sale Cancelled", currentUser.name, `Reason: ${cancelReason}`, "Medium");
      setCancelReason("");
      alert("✅ Sale cancelled successfully. Cart has been cleared.");
    }
  }, [cancelReason, currentUser, cart, total]);

  const handleVoidItem = useCallback(() => {
    if (voidItemId) {
      handleRemoveFromCart(voidItemId);
      addAuditLog("Item Voided", currentUser.name, `Item ${voidItemId} removed from transaction`, "Medium");
      setVoidItemId(null);
    }
  }, [voidItemId, handleRemoveFromCart, currentUser]);

  const handleCompletePayment = useCallback(() => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    const txnId = getNextTransactionId();
    const newTransaction = {
      id: txnId,
      items: cart,
      subtotal,
      discount,
      discountAmount,
      total,
      timestamp: getCurrentTime(),
      cashier: currentUser.name,
      reprinted: false,
    };
    setTransactions([...transactions, newTransaction]);
    
    // Deduct stock from products
    setProducts(prevProducts => prevProducts.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      return cartItem 
        ? { ...product, stock: Math.max(0, product.stock - cartItem.qty) }
        : product;
    }));
    
    addAuditLog("Sale Completed", currentUser.name, `TXN-${txnId} completed for ${peso(total)}`, "High");
    dispatchCart({ type: "CLEAR_CART" });
    setDiscount("none");
    alert(`✅ Payment successful! Transaction ID: TXN-${txnId}\n\nStock has been automatically deducted.`);
  }, [cart, subtotal, discount, discountAmount, total, currentUser, transactions]);

  // ==================== POST-VOID & APPROVAL ====================
  const [postVoidForm, setPostVoidForm] = useState({ txnId: "", reason: "", supervisor: "" });
  const [postVoidErrors, setPostVoidErrors] = useState({});

  const handleSubmitPostVoid = useCallback((e) => {
    e.preventDefault();
    const errors = {};
    if (!postVoidForm.txnId.trim()) errors.txnId = "Transaction ID is required";
    if (!postVoidForm.reason.trim()) errors.reason = "Reason is required";
    if (!postVoidForm.supervisor) errors.supervisor = "Supervisor approval is required";
    setPostVoidErrors(errors);

    if (Object.keys(errors).length === 0) {
      const txn = transactions.find(t => t.id.toString() === postVoidForm.txnId);
      if (!txn) {
        alert("Transaction not found");
        return;
      }
      setTransactions(transactions.filter(t => t.id.toString() !== postVoidForm.txnId));
      addAuditLog("Post-void Approved", postVoidForm.supervisor, `TXN-${postVoidForm.txnId} reversed. Reason: ${postVoidForm.reason}`, "High");
      alert("Post-void approved and transaction reversed");
      setPostVoidForm({ txnId: "", reason: "", supervisor: "" });
    }
  }, [postVoidForm, transactions]);

  // ==================== RECEIPT MANAGEMENT ====================
  const [reprintTxnId, setReprintTxnId] = useState("");
  const [reprintedReceipt, setReprintedReceipt] = useState(null);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");

  const handlePrintReceipt = useCallback((receipt) => {
    const printWindow = window.open('', '', 'width=400,height=500');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt Print - TXN #${receipt.id}</title>
          <style>
            body { font-family: monospace; margin: 20px; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .txn { font-size: 12px; margin: 3px 0; }
            .items { margin: 15px 0; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .item { display: flex; justify-content: space-between; font-size: 11px; margin: 5px 0; }
            .total-section { margin: 15px 0; }
            .total-line { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
            .footer { text-align: center; font-size: 10px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">🛒 RETAILPOS PRO</div>
            <div class="txn">Receipt</div>
          </div>
          <div class="txn"><strong>TXN #</strong> ${receipt.id}</div>
          <div class="txn"><strong>Cashier:</strong> ${receipt.cashier}</div>
          <div class="txn"><strong>Time:</strong> ${receipt.timestamp}</div>
          
          <div class="items">
            ${receipt.items?.map(item => `
              <div class="item">
                <span>${item.name} × ${item.qty}</span>
                <span>₱${(item.qty * item.price).toFixed(2)}</span>
              </div>
            `).join('') || '<div style=\"color: red;\">No items</div>'}
          </div>
          
          <div class="total-section">
            <div class="total-line">
              <span>TOTAL:</span>
              <span>₱${receipt.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div class="footer">
            Thank you for your purchase!
            <br>
            ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, []);

  const handleReprintReceipt = useCallback(() => {
    const txn = transactions.find(t => t.id.toString() === reprintTxnId);
    if (txn) {
      setReprintedReceipt(txn);
      setTransactions(transactions.map(t => t.id.toString() === reprintTxnId ? { ...t, reprinted: true } : t));
      addAuditLog("Receipt Reprinted", currentUser.name, `TXN-${reprintTxnId} reprinted`, "Medium");
      setReprintTxnId("");
    } else {
      alert("❌ Transaction not found");
    }
  }, [reprintTxnId, transactions, currentUser]);

  // ==================== KPI CALCULATIONS ====================
  const totalSales = useMemo(() => transactions.reduce((sum, t) => sum + t.total, 0), [transactions]);
  const totalTransactions = transactions.length;
  const activeUsersCount = users.filter(u => u.status === "Active").length;
  const lowStockCount = products.filter(p => p.stock < 20 && p.active).length;

  const kpis = [
    { label: "Today's Sales", value: peso(totalSales), hint: `${totalTransactions} transactions processed` },
    { label: "Transactions", value: totalTransactions.toString(), hint: `Avg ${(cart.length > 0 ? cart.length : 2.8).toFixed(1)} items/order` },
    { label: "Active Users", value: activeUsersCount.toString(), hint: `${users.filter(u => u.role === "Administrator").length} admins, ${users.filter(u => u.role === "Supervisor").length} supervisors` },
    { label: "Low Stock Alerts", value: lowStockCount.toString(), hint: "Needs replenishment" },
  ];

  const tabs = ["sales", "products", "users", "discounts", "cancelvoid", "postvoid", "receipts", "audit"];

  // ==================== LOGIN PAGE ====================
  if (!isLoggedIn) {
    const demoUsers = [
      { name: "Maria Cruz", role: "Cashier", icon: "👩‍💼", color: "from-pink-500 to-rose-500" },
      { name: "Daniel Reyes", role: "Supervisor", icon: "👨‍💼", color: "from-blue-500 to-cyan-500" },
      { name: "Angela Santos", role: "Administrator", icon: "👩‍💻", color: "from-purple-500 to-indigo-500" },
    ];

    const handleQuickLogin = (userName) => {
      setLoginForm({ name: userName, password: "1234" });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-3">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: "2s"}}></div>
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" style={{animationDelay: "4s"}}></div>
        </div>

        <div className="w-full max-w-lg relative z-10">
          {/* Mobile Header */}
          <div className="md:hidden text-center mb-8">
            <div className="text-7xl mb-4 drop-shadow-lg animate-slideIn">🛒</div>
            <h1 className="text-4xl font-bold text-white mb-2">RetailPOS Pro</h1>
            <p className="text-gray-300 text-sm mb-1">Point of Sale System</p>
          </div>

          {/* Login Form Card */}
          <div className="card-base p-8 md:p-10 shadow-2xl border-2 border-blue-400 border-opacity-20 backdrop-blur-lg animate-fadeIn rounded-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600 text-sm">Welcome back to RetailPOS Pro</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Field */}
              <div>
                <label className="block text-gray-700 font-semibold text-sm mb-2">Username</label>
                <input
                  type="text"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                  placeholder="Enter your username"
                  className="input-base text-sm sm:text-base w-full"
                  aria-label="Username"
                  autoFocus
                />
              </div>
              
              {/* Password Field */}
              <div>
                <label className="block text-gray-700 font-semibold text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Enter password"
                  className="input-base text-sm sm:text-base w-full"
                  aria-label="Password"
                />
              </div>
              
              {/* Error Message */}
              {loginError && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-700 px-4 py-3 rounded-lg text-sm font-medium animate-slideIn">
                  ⚠️ {loginError}
                </div>
              )}
              
              {/* Login Button */}
              <button 
                type="submit"
                className="btn-primary w-full text-base py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg mt-8"
              >
                🔐 Login
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-600 font-semibold">Quick Access</span>
              </div>
            </div>

            {/* Demo Users Section */}
            <div className="space-y-3">
              <p className="text-center text-gray-600 text-xs font-semibold uppercase tracking-widest mb-4">Demo Users - Click to Auto-Fill</p>
              
              {demoUsers.map((user) => (
                <button
                  key={user.name}
                  type="button"
                  onClick={() => handleQuickLogin(user.name)}
                  className={`w-full p-4 rounded-xl bg-gradient-to-r ${user.color} text-white font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-all duration-200 border-2 border-white border-opacity-40 hover:border-opacity-100 flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{user.icon}</span>
                    <div className="text-left">
                      <div className="font-bold text-base leading-tight">{user.name}</div>
                      <div className="text-xs opacity-95 font-medium">@{user.role}</div>
                    </div>
                  </div>
                  <span className="text-2xl group-hover:translate-x-2 transition-transform duration-200">→</span>
                </button>
              ))}
            </div>

            {/* Helpful Tip */}
            <div className="mt-8 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <p className="text-amber-900 text-sm text-center font-medium">
                💡 <strong>Tip:</strong> Use password <strong>1234</strong> for all demo accounts
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-xs">
              © 2026 RetailPOS Pro. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1">Advanced Inventory & Sales Management System</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN APP ====================
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* SIDEBAR - Mobile: hidden, Tablet+: visible */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl flex-col overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-3xl md:text-4xl animate-pulse">🛒</div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">RetailPOS Pro</h2>
              <p className="text-xs md:text-sm text-slate-300">v2.0 Advanced</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 md:p-6 space-y-2">
          {["Dashboard", "Products", "Users & Roles", "Sales Processing", "Discounts", "Void & Cancel", "Post-Void", "Receipts", "Audit Logs"].map((label, i) => (
            <button 
              key={label}
              onClick={() => setActiveTab(tabs[i])}
              className={`w-full text-left px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-medium transition-all duration-200 ${
                tabs[i] === activeTab 
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 md:p-6 border-t border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 m-4 md:m-6 rounded-xl">
          <h3 className="font-bold text-sm md:text-base text-white mb-2">Current User</h3>
          <p className="text-xs md:text-sm text-slate-300 mb-3">Role-based secured session</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
              {currentUser.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{currentUser.name}</p>
              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-emerald-500 text-white">
                {currentUser.role}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="btn-secondary w-full text-xs md:text-sm py-2 bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* MOBILE HEADER */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🛒</div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">RetailPOS</h1>
                <p className="text-xs text-gray-600">{currentUser.name}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION TABS */}
        <div className="md:hidden bg-white border-b border-gray-200 overflow-x-auto sticky top-16 z-40">
          <div className="flex gap-2 p-2 min-w-max">
            {["Sales", "Products", "Users", "Discounts", "Void", "Post-Void", "Receipts", "Audit"].map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(tabs[i])}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tabs[i] === activeTab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">{activeTab === "sales" && (
          <>
            <div className="card-base p-4 md:p-6 mb-6">
              <div>
                <p className="text-xs md:text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Point of Sale System</p>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Sales Transaction Processing</h1>
                <p className="text-gray-600 text-sm md:text-base">Scan, search, add items, and auto-compute totals with role-based access control.</p>
              </div>
            </div>

            {/* KPI GRID - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              {kpis.map((item, idx) => {
                const colorClass = ["card-blue", "card-purple", "card-cyan", "card-teal"][idx % 4];
                return (
                  <div key={item.label} className={`card-base ${colorClass} p-4 md:p-5`}>
                    <p className="text-slate-600 text-sm md:text-base mb-2 font-semibold uppercase tracking-wide">{item.label}</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">{item.value}</h2>
                    <small className="text-slate-500 text-xs md:text-sm">{item.hint}</small>
                  </div>
                );
              })}
            </div>

            {/* SALES GRID - Mobile stacked, Desktop 2-col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Products Section */}
              <div className="lg:col-span-2 card-indigo p-4 md:p-6">
                <div className="mb-3 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  <span>🔥</span> Live Sales
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Sales Transaction</h3>
                <p className="text-slate-600 text-sm md:text-base mb-4">Scan, search, add items, and manage payments quickly.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-4">
                  <input 
                    value={productSearch} 
                    onChange={(e) => setProductSearch(e.target.value)} 
                    placeholder="Search product..."
                    className="input-base text-xs md:text-sm sm:col-span-2"
                  />
                  <button 
                    onClick={() => productSearch && handleAddToCart(products.find(p => p.name.toLowerCase().includes(productSearch.toLowerCase())))}
                    className="btn-primary text-xs md:text-sm"
                  >
                    Add
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-4">
                  <input 
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleBarcodeSearch(scannedBarcode)}
                    placeholder="Scan barcode..."
                    className="input-base text-xs md:text-sm sm:col-span-2"
                  />
                  <button 
                    onClick={() => scannedBarcode && handleBarcodeSearch(scannedBarcode)}
                    className="btn-primary text-xs md:text-sm"
                  >
                    Scan
                  </button>
                </div>

                {/* Products Table - Responsive */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-xs md:text-sm bg-white rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <th className="px-2 md:px-4 py-2 text-left font-semibold">Product</th>
                        <th className="px-2 md:px-4 py-2 text-left font-semibold">Price</th>
                        <th className="px-2 md:px-4 py-2 text-center font-semibold">Stock</th>
                        <th className="px-2 md:px-4 py-2 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-2 md:px-4 py-2 font-medium text-gray-900">{p.name}</td>
                          <td className="px-2 md:px-4 py-2 text-gray-600">{peso(p.price)}</td>
                          <td className="px-2 md:px-4 py-2 text-center">
                            <span className={p.stock > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{p.stock}</span>
                          </td>
                          <td className="px-2 md:px-4 py-2 text-center">
                            <button 
                              onClick={() => handleAddToCart(p)} 
                              disabled={!p.active || p.stock <= 0}
                              className="btn-primary btn-small text-xs"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cart Section */}
              <div className="card-cyan p-4 md:p-6 top-20 lg:sticky">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">Current Sale</h3>
                  <span className="text-xs font-semibold text-teal-700 bg-teal-100 px-2 py-1 rounded-full">{cart.length} items</span>
                </div>

                {cart.length === 0 ? (
                  <p className="text-center py-8 text-slate-600 text-sm md:text-base">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-600">{peso(item.price)}</p>
                            </div>
                            <button 
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="text-red-600 hover:text-red-700 font-bold text-sm"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="1" 
                              value={item.qty}
                              onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                              className="input-base text-xs w-16"
                            />
                            <span className="text-sm font-semibold text-gray-900">{peso(item.qty * item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-2 mb-4 border border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold text-gray-900">{peso(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount ({discountRate * 100}%)</span>
                        <span className="font-semibold text-gray-900">-{peso(discountAmount)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 flex justify-between text-base md:text-lg">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-green-600">{peso(total)}</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <button 
                    onClick={handleCancelSale}
                    className="btn-secondary text-xs md:text-sm py-2"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCompletePayment} 
                    disabled={cart.length === 0}
                    className="btn-primary text-xs md:text-sm py-2"
                  >
                    Pay
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "products" && (currentUser.role === "Administrator" || currentUser.role === "Supervisor") && (
          <>
            <div className="card-base p-4 md:p-6 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Product Management</h2>
              <p className="text-gray-600 text-sm md:text-base">Add, update, and manage your product catalog</p>
            </div>

            <div className="card-base p-4 md:p-6 mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Add/Update Product</h3>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {editingProductId && (
                  <div className="col-span-full bg-blue-50 border-l-4 border-blue-600 p-3 rounded mb-2">
                    <p className="text-sm text-blue-900">✎ <strong>Editing Mode:</strong> Updating product information</p>
                  </div>
                )}
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Product Name *</label>
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Product name"
                    className="input-base text-xs md:text-sm"
                  />
                  {productErrors.name && <span className="text-red-600 text-xs md:text-sm">{productErrors.name}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Barcode *</label>
                  <input
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="Barcode"
                    className="input-base text-xs md:text-sm"
                  />
                  {productErrors.barcode && <span className="text-red-600 text-xs md:text-sm">{productErrors.barcode}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Category</label>
                  <input
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="Category"
                    className="input-base text-xs md:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="Price"
                    className="input-base text-xs md:text-sm"
                  />
                  {productErrors.price && <span className="text-red-600 text-xs md:text-sm">{productErrors.price}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Stock *</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="Stock quantity"
                    className="input-base text-xs md:text-sm"
                  />
                  {productErrors.stock && <span className="text-red-600 text-xs md:text-sm">{productErrors.stock}</span>}
                </div>
                <button className="btn-primary text-xs md:text-sm self-end">{editingProductId ? "Update" : "Add"} Product</button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="card-base p-4 md:p-5"><p className="text-gray-600 text-sm mb-2">Active Products</p><h2 className="text-2xl md:text-3xl font-bold text-gray-900">{products.filter(p => p.active).length}</h2></div>
              <div className="card-base p-4 md:p-5"><p className="text-gray-600 text-sm mb-2">Inactive</p><h2 className="text-2xl md:text-3xl font-bold text-gray-900">{products.filter(p => !p.active).length}</h2></div>
              <div className="card-base p-4 md:p-5"><p className="text-gray-600 text-sm mb-2">Low Stock</p><h2 className="text-2xl md:text-3xl font-bold text-gray-900">{products.filter(p => p.stock < 20 && p.active).length}</h2></div>
            </div>

            <div className="card-base p-4 md:p-6 overflow-x-auto">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Product Catalog</h3>
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 md:px-4 py-2 text-left font-semibold text-gray-900">Product</th>
                    <th className="px-2 md:px-4 py-2 text-left font-semibold text-gray-900">Price</th>
                    <th className="px-2 md:px-4 py-2 text-center font-semibold text-gray-900">Stock</th>
                    <th className="px-2 md:px-4 py-2 text-center font-semibold text-gray-900">Status</th>
                    <th className="px-2 md:px-4 py-2 text-center font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 font-medium text-gray-900">{p.name}</td>
                      <td className="px-2 md:px-4 py-2 text-gray-600">{peso(p.price)}</td>
                      <td className="px-2 md:px-4 py-2 text-center"><span className={p.stock < 20 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>{p.stock}</span></td>
                      <td className="px-2 md:px-4 py-2 text-center"><span className={`badge ${p.active ? "badge-success" : "badge-danger"}`}>{p.active ? "Active" : "Inactive"}</span></td>
                      <td className="px-2 md:px-4 py-2 text-center space-x-1">
                        <button className="btn-secondary btn-small text-xs" onClick={() => handleEditProduct(p)} disabled={!p.active}>Edit</button>
                        {p.active && <button className="btn-danger btn-small text-xs" onClick={() => handleDeactivateProduct(p.id)}>Deactivate</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "users" && currentUser.role === "Administrator" && (
          <>
            <div className="card-base p-4 md:p-6 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">User Management</h2>
              <p className="text-gray-600 text-sm md:text-base">Create, update, and manage user accounts and permissions</p>
            </div>

            <div className="card-base p-4 md:p-6 mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Create/Edit User</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {editingUserId && (
                  <div className="col-span-full bg-blue-50 border-l-4 border-blue-600 p-3 rounded mb-2">
                    <p className="text-sm text-blue-900">✎ <strong>Editing Mode:</strong> Updating user account</p>
                  </div>
                )}
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Full Name *</label>
                  <input
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Full name"
                    className="input-base text-xs md:text-sm"
                  />
                  {userErrors.name && <span className="text-red-600 text-xs md:text-sm">{userErrors.name}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Password *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Password"
                    className="input-base text-xs md:text-sm"
                  />
                  {userErrors.password && <span className="text-red-600 text-xs md:text-sm">{userErrors.password}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Role *</label>
                  <select 
                    value={userForm.role} 
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="input-base text-xs md:text-sm"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Status *</label>
                  <select 
                    value={userForm.status} 
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="input-base text-xs md:text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary text-xs md:text-sm sm:col-span-2">{editingUserId ? "Update" : "Create"} User</button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="card-base p-4 md:p-5"><p className="text-gray-600 text-sm mb-2">Total Users</p><h2 className="text-2xl md:text-3xl font-bold text-gray-900">{users.length}</h2></div>
              <div className="card-base p-4 md:p-5"><p className="text-gray-600 text-sm mb-2">Administrators</p><h2 className="text-2xl md:text-3xl font-bold text-gray-900">{users.filter(u => u.role === "Administrator").length}</h2></div>
              <div className="card-base p-4 md:p-5"><p className="text-gray-600 text-sm mb-2">Cashiers</p><h2 className="text-2xl md:text-3xl font-bold text-gray-900">{users.filter(u => u.role === "Cashier").length}</h2></div>
            </div>

            <div className="card-base p-4 md:p-6 overflow-x-auto">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">User Directory</h3>
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 md:px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                    <th className="px-2 md:px-4 py-2 text-left font-semibold text-gray-900">Role</th>
                    <th className="px-2 md:px-4 py-2 text-center font-semibold text-gray-900">Status</th>
                    <th className="px-2 md:px-4 py-2 text-left font-semibold text-gray-900">Last Login</th>
                    <th className="px-2 md:px-4 py-2 text-center font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 font-medium text-gray-900">{u.name}</td>
                      <td className="px-2 md:px-4 py-2"><span className={`badge ${u.role === "Administrator" ? "badge-success" : u.role === "Supervisor" ? "badge-warning" : "badge-info"}`}>{u.role}</span></td>
                      <td className="px-2 md:px-4 py-2 text-center"><span className={`badge ${u.status === "Active" ? "badge-success" : "badge-danger"}`}>{u.status}</span></td>
                      <td className="px-2 md:px-4 py-2 text-gray-600">{u.lastLogin}</td>
                      <td className="px-2 md:px-4 py-2 text-center"><button className="btn-secondary btn-small text-xs" onClick={() => handleEditUser(u)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "discounts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="card-base p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Discount Application</h2>
              <p className="text-gray-600 text-sm md:text-base mb-4">Apply eligible discounts to the sale</p>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium text-sm mb-2">Select Discount Type</label>
                <select 
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input-base text-xs md:text-sm w-full"
                >
                  <option value="none">No Discount</option>
                  <option value="senior">Senior Citizen (20%)</option>
                  <option value="pwd">PWD (20%)</option>
                  <option value="athlete">Athlete (10%)</option>
                  <option value="solo">Solo Parent (10%)</option>
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-sm">
                <p className="text-blue-900"><span className="font-semibold">✓</span> Only one discount can be applied per sale</p>
                <p className="text-blue-900"><span className="font-semibold">✓</span> System prevents duplicate discount application</p>
                <p className="text-blue-900"><span className="font-semibold">✓</span> Discount applied at payment confirmation</p>
              </div>
            </div>
            <div className="card-base p-4 md:p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
              <p className="text-gray-600 text-sm md:text-base mb-2 font-semibold">Computed Discount Amount</p>
              <h2 className="text-3xl md:text-4xl font-bold text-green-700 mb-4">{peso(discountAmount)}</h2>
              <div className="space-y-3 text-sm md:text-base">
                <div className="flex justify-between"><span className="text-gray-700">Discount Type:</span><span className="font-bold text-gray-900">{discount === "none" ? "None" : discount.charAt(0).toUpperCase() + discount.slice(1)}</span></div>
                <hr className="border-green-200" />
                <div className="flex justify-between"><span className="text-gray-700">Final Amount:</span><span className="font-bold text-xl text-green-700">{peso(total)}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cancelvoid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="card-base p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Cancel Sale</h2>
              <p className="text-gray-600 text-sm md:text-base mb-4">Cancel sale before payment confirmation</p>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium text-sm mb-2">Cancellation Reason *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain reason for cancellation"
                  className="input-base text-xs md:text-sm w-full min-h-24"
                />
              </div>
              <button 
                className="btn-danger w-full text-xs md:text-sm" 
                onClick={handleCancelSale}
              >
                Confirm Cancel Sale
              </button>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4 space-y-2 text-sm">
                <p className="text-red-900"><span className="font-semibold">✓</span> Cancelled sales don't affect inventory</p>
                <p className="text-red-900"><span className="font-semibold">✓</span> Cancellation logged with user ID and date</p>
              </div>
            </div>
            <div className="card-base p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Void Item</h2>
              <p className="text-gray-600 text-sm md:text-base mb-4">Remove incorrectly scanned items</p>
              {cart.length === 0 ? (
                <div className="bg-gray-100 rounded-lg p-6 text-center">
                  <p className="text-gray-600 text-sm">No items in cart to void</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium text-sm mb-2">Select Item to Void</label>
                    <select 
                      value={voidItemId || ""} 
                      onChange={(e) => setVoidItemId(e.target.value ? parseInt(e.target.value) : null)}
                      className="input-base text-xs md:text-sm w-full"
                    >
                      <option value="">Choose item...</option>
                      {cart.map(item => (
                        <option key={item.id} value={item.id}>{item.name} (Qty: {item.qty})</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    className="btn-secondary w-full text-xs md:text-sm" 
                    onClick={handleVoidItem}
                    disabled={!voidItemId}
                  >
                    Void Item
                  </button>
                </>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 space-y-2 text-sm">
                <p className="text-blue-900"><span className="font-semibold">✓</span> System recalculates totals immediately</p>
                <p className="text-blue-900"><span className="font-semibold">✓</span> Voided items logged for audit</p>
                <p className="text-blue-900"><span className="font-semibold">✓</span> Inventory restored automatically</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "postvoid" && (currentUser.role === "Supervisor" || currentUser.role === "Administrator") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="card-base p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Post-Void Completed Sale</h2>
              <form onSubmit={handleSubmitPostVoid} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Transaction ID *</label>
                  <input
                    value={postVoidForm.txnId}
                    onChange={(e) => setPostVoidForm({ ...postVoidForm, txnId: e.target.value })}
                    placeholder="e.g., 20483"
                    className="input-base text-xs md:text-sm w-full"
                  />
                  {postVoidErrors.txnId && <span className="text-red-600 text-xs md:text-sm">{postVoidErrors.txnId}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Reason for Post-Void *</label>
                  <textarea
                    value={postVoidForm.reason}
                    onChange={(e) => setPostVoidForm({ ...postVoidForm, reason: e.target.value })}
                    placeholder="Provide detailed reason"
                    className="input-base text-xs md:text-sm w-full min-h-20"
                  />
                  {postVoidErrors.reason && <span className="text-red-600 text-xs md:text-sm">{postVoidErrors.reason}</span>}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium text-sm mb-1">Supervisor Approval *</label>
                  <select
                    value={postVoidForm.supervisor}
                    onChange={(e) => setPostVoidForm({ ...postVoidForm, supervisor: e.target.value })}
                    className="input-base text-xs md:text-sm w-full"
                  >
                    <option value="">Select supervisor</option>
                    {users.filter(u => u.role === "Supervisor").map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  {postVoidErrors.supervisor && <span className="text-red-600 text-xs md:text-sm">{postVoidErrors.supervisor}</span>}
                </div>
                <button type="submit" className="btn-primary w-full text-xs md:text-sm">Submit Approval Request</button>
              </form>
            </div>
            <div className="card-base p-4 md:p-6 bg-blue-50 border-2 border-blue-200">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Post-Void Requirements</h3>
              <ul className="space-y-3">
                <li className="flex items-start text-sm md:text-base text-gray-700">
                  <span className="font-semibold text-blue-600 mr-3">✓</span>
                  <span>Post-voiding requires Supervisor approval</span>
                </li>
                <li className="flex items-start text-sm md:text-base text-gray-700">
                  <span className="font-semibold text-blue-600 mr-3">✓</span>
                  <span>Supervisor identity is logged</span>
                </li>
                <li className="flex items-start text-sm md:text-base text-gray-700">
                  <span className="font-semibold text-blue-600 mr-3">✓</span>
                  <span>Reason for post-void is mandatory</span>
                </li>
                <li className="flex items-start text-sm md:text-base text-gray-700">
                  <span className="font-semibold text-blue-600 mr-3">✓</span>
                  <span>Inventory and sales records are reversed</span>
                </li>
                <li className="flex items-start text-sm md:text-base text-gray-700">
                  <span className="font-semibold text-blue-600 mr-3">✓</span>
                  <span>Post-voided transactions appear in audit logs</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {reprintedReceipt ? (
              <div className="card-base p-4 md:p-6 bg-gray-900 text-white font-mono">
                <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-gray-700">
                  <span className="text-lg md:text-xl font-bold">RETAILPOS PRO</span>
                  <span className="badge bg-yellow-600 text-white text-xs px-2 py-1 rounded">REPRINT</span>
                </div>
                <p className="text-xs md:text-sm mb-1">TXN #{reprintedReceipt.id}</p>
                <p className="text-xs md:text-sm mb-1">Cashier: {reprintedReceipt.cashier}</p>
                <p className="text-xs md:text-sm mb-4">Time: {reprintedReceipt.timestamp}</p>
                <div className="border-t border-b border-gray-700 py-3 mb-3 space-y-1">
                  {reprintedReceipt.items && reprintedReceipt.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs md:text-sm">
                      <span>{item.name} × {item.qty}</span>
                      <span>{peso(item.qty * item.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mb-4 text-sm md:text-base font-bold flex justify-between">
                  <span>TOTAL:</span>
                  <span>{peso(reprintedReceipt.total)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <button 
                    className="btn-primary text-xs md:text-sm" 
                    onClick={() => handlePrintReceipt(reprintedReceipt)}
                  >
                    🖨️ Print Receipt
                  </button>
                  <button 
                    className="btn-secondary text-xs md:text-sm" 
                    onClick={() => setReprintedReceipt(null)}
                  >
                    Close Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-base p-4 md:p-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Reprint Receipt</h2>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium text-sm mb-2">Transaction ID *</label>
                  <input
                    value={reprintTxnId}
                    onChange={(e) => setReprintTxnId(e.target.value)}
                    placeholder="Enter transaction ID"
                    className="input-base text-xs md:text-sm w-full"
                  />
                </div>
                <button 
                  className="btn-secondary w-full text-xs md:text-sm" 
                  onClick={handleReprintReceipt}
                >
                  Reprint Receipt
                </button>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 space-y-2 text-sm">
                  <p className="text-blue-900"><span className="font-semibold">✓</span> Reprinted receipt marked as "REPRINT"</p>
                  <p className="text-blue-900"><span className="font-semibold">✓</span> Does not create duplicate sale record</p>
                  <p className="text-blue-900"><span className="font-semibold">✓</span> Reprint action logged with timestamp</p>
                </div>
              </div>
            )}
            <div className="card-base p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Receipt History</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-6">No transactions yet</p>
                ) : (
                  transactions.map((txn) => (
                    <div key={txn.id} className="bg-gray-50 p-3 rounded border border-gray-200 cursor-pointer hover:bg-blue-100 text-xs md:text-sm transition-colors" onClick={() => setReprintTxnId(txn.id.toString())}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-gray-900">TXN #{txn.id}</div>
                          <div className="text-gray-600">{txn.cashier}</div>
                          <div className="text-gray-500">{txn.timestamp}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{peso(txn.total)}</div>
                          {txn.reprinted && <span className="badge badge-warning text-xs">Reprinted</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="card-base p-4 md:p-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Audit Logging</h2>
            <p className="text-gray-600 text-sm md:text-base mb-6">Sensitive actions are fully traceable with user, timestamp, and level.</p>
            
            <div className="mb-6">
              <input 
                type="text"
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
                placeholder="Search audit logs by action, user, or details..."
                className="input-base text-xs md:text-sm w-full"
              />
            </div>

            <div className="space-y-3">
              {auditLogs.filter(log => 
                log.action.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                log.user.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(auditSearchTerm.toLowerCase())
              ).map((log, i) => (
                <div key={i} className="bg-gradient-to-r from-gray-50 to-white border-l-4 border-gray-400 p-4 rounded-r">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-sm md:text-base">{log.action}</h4>
                      <p className="text-gray-600 text-xs md:text-sm">{log.details}</p>
                    </div>
                    <div className="flex flex-col items-start md:items-end text-xs md:text-sm text-gray-600 space-y-1">
                      <span className="font-semibold text-gray-900">{log.user}</span>
                      <span>{log.time}</span>
                      <span className={`badge ${log.level === "High" ? "badge-danger" : "badge-warning"}`} style={{fontSize: "0.75rem"}}>{log.level} Priority</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "products" && !["Administrator", "Supervisor"].includes(currentUser.role) && (
          <div className="card-base p-4 md:p-6 bg-red-50 border-2 border-red-200">
            <h2 className="text-2xl md:text-3xl font-bold text-red-900 mb-2">Access Restricted</h2>
            <p className="text-red-800 text-sm md:text-base">⚠️ Only Administrators and Supervisors can manage products.</p>
          </div>
        )}

        {activeTab === "users" && currentUser.role !== "Administrator" && (
          <div className="card-base p-4 md:p-6 bg-red-50 border-2 border-red-200">
            <h2 className="text-2xl md:text-3xl font-bold text-red-900 mb-2">Access Restricted</h2>
            <p className="text-red-800 text-sm md:text-base">⚠️ Only Administrators can manage user accounts.</p>
          </div>
        )}

        {activeTab === "postvoid" && !["Supervisor", "Administrator"].includes(currentUser.role) && (
          <div className="card-base p-4 md:p-6 bg-red-50 border-2 border-red-200">
            <h2 className="text-2xl md:text-3xl font-bold text-red-900 mb-2">Access Restricted</h2>
            <p className="text-red-800 text-sm md:text-base">⚠️ Only Supervisors and Administrators can approve post-voids.</p>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}