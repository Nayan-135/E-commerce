const mockDb = {
  users: [
    { id: '1', email: 'test@example.com', token: 'mock-token-123' },
  ],
  profiles: [
    { id: '1', email: 'test@example.com', full_name: 'Test User', phone: '1234567890' },
  ],
  products: [
    { id: 'p1', name: 'Nexus Headphones', description: 'Wireless premium audio.', price: 2999, stock_quantity: 50, category: 'Electronics', images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'] },
    { id: 'p2', name: 'Nexus Smartwatch', description: 'Next-gen health tracking.', price: 4999, stock_quantity: 30, category: 'Electronics', images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'] },
    { id: 'p3', name: 'Nexus Backpack', description: 'Sleek and waterproof.', price: 1499, stock_quantity: 0, category: 'Accessories', images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'] },
    { id: 'p4', name: 'Nexus Mechanical Keyboard', description: 'Tactile typing experience.', price: 5999, stock_quantity: 15, category: 'Computers', images: ['https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'] },
    
    // Extrapolated from extra.txt
    { id: 'p5', name: 'Smart LED Desk Lamp', description: 'Touch-controlled LED lamp with 5 brightness levels, USB charging port, and memory function.', price: 1199, stock_quantity: 80, category: 'Electronics', images: ['https://placehold.co/600x400/1e293b/ffffff?text=Desk+Lamp'] },
    { id: 'p6', name: 'Mechanical Keyboard — TKL RGB', description: 'Tenkeyless mechanical keyboard with Cherry MX Red switches, per-key RGB backlight.', price: 4499, stock_quantity: 35, category: 'Electronics', images: ['https://placehold.co/600x400/1e293b/ffffff?text=Keyboard'] },
    { id: 'p7', name: 'Portable Power Bank 20000mAh', description: 'Dual USB-A + USB-C output. 20W PD fast charging.', price: 1599, stock_quantity: 150, category: 'Electronics', images: ['https://placehold.co/600x400/1e293b/ffffff?text=Power+Bank'] },
    { id: 'p8', name: 'Smart Watch — Fitness Edition', description: 'Heart rate monitor, SpO2 tracking, 7-day battery, 50m water resistance.', price: 5999, stock_quantity: 60, category: 'Electronics', images: ['https://placehold.co/600x400/1e293b/ffffff?text=Smart+Watch'] },
    { id: 'p9', name: "Women's Slim Fit Denim Jeans", description: 'High-waist slim fit jeans in stretch denim. Available in dark blue and black.', price: 1299, stock_quantity: 200, category: 'Clothing', images: ['https://placehold.co/600x400/334155/ffffff?text=Jeans'] },
    { id: 'p10', name: 'Unisex Hooded Sweatshirt', description: 'Brushed fleece hoodie with kangaroo pocket and adjustable drawstring.', price: 999, stock_quantity: 180, category: 'Clothing', images: ['https://placehold.co/600x400/334155/ffffff?text=Hoodie'] },
    { id: 'p11', name: "Kids' Waterproof Rain Jacket", description: 'Lightweight packable rain jacket for kids. Sealed seams, mesh lining.', price: 799, stock_quantity: 90, category: 'Clothing', images: ['https://placehold.co/600x400/334155/ffffff?text=Rain+Jacket'] },
    { id: 'p12', name: 'Atomic Habits — James Clear', description: 'An easy and proven way to build good habits and break bad ones.', price: 599, stock_quantity: 100, category: 'Books', images: ['https://placehold.co/600x400/0f172a/ffffff?text=Atomic+Habits'] },
    { id: 'p13', name: 'Clean Code — Robert C. Martin', description: 'A handbook of agile software craftsmanship covering naming, functions, comments', price: 749, stock_quantity: 60, category: 'Books', images: ['https://placehold.co/600x400/0f172a/ffffff?text=Clean+Code'] },
    { id: 'p14', name: 'Stainless Steel Insulated Water Bottle', description: 'Double-wall vacuum insulation. Keeps drinks cold 24h, hot 12h. BPA-free.', price: 699, stock_quantity: 200, category: 'Home & Kitchen', images: ['https://placehold.co/600x400/1e3a5f/ffffff?text=Water+Bottle'] },
    { id: 'p15', name: 'Non-Stick Frying Pan Set', description: 'Granite-coated aluminium pans. 20cm, 24cm, 28cm. Induction compatible.', price: 2499, stock_quantity: 45, category: 'Home & Kitchen', images: ['https://placehold.co/600x400/1e3a5f/ffffff?text=Frying+Pan'] },
    { id: 'p16', name: 'Bamboo Cutting Board Set', description: 'Eco-friendly bamboo boards in three sizes with juice groove and easy-grip handles.', price: 899, stock_quantity: 120, category: 'Home & Kitchen', images: ['https://placehold.co/600x400/1e3a5f/ffffff?text=Cutting+Board'] },
    { id: 'p17', name: 'Adjustable Dumbbell Set — 2–24kg', description: 'Quick-select dial adjusts weight in 2kg increments. Replaces 9 pairs of dumbbells.', price: 8999, stock_quantity: 20, category: 'Sports', images: ['https://placehold.co/600x400/0f4c75/ffffff?text=Dumbbells'] },
    { id: 'p18', name: 'Running Shoes — Lightweight Mesh', description: 'Breathable knit upper with responsive foam midsole. Suitable for road running.', price: 2999, stock_quantity: 70, category: 'Sports', images: ['https://placehold.co/600x400/0f4c75/ffffff?text=Running+Shoes'] },
    { id: 'p19', name: 'Vitamin C Face Serum — 30ml', description: '15% L-Ascorbic Acid serum with hyaluronic acid and vitamin E. Brightens, firms.', price: 999, stock_quantity: 150, category: 'Beauty', images: ['https://placehold.co/600x400/4a1d5f/ffffff?text=Serum'] },
    { id: 'p20', name: 'Natural Lip Balm — Pack of 6', description: 'SPF 15 lip balm with shea butter and beeswax.', price: 349, stock_quantity: 300, category: 'Beauty', images: ['https://placehold.co/600x400/4a1d5f/ffffff?text=Lip+Balm'] },
    { id: 'p21', name: 'STEM Building Blocks — 120 Pieces', description: 'Compatible magnetic tiles for creative 3D building. Safe ABS plastic.', price: 1499, stock_quantity: 80, category: 'Toys', images: ['https://placehold.co/600x400/7c3aed/ffffff?text=Building+Blocks'] },
    { id: 'p22', name: 'Remote Control Car — Off-Road 4WD', description: '1:16 scale RC car with 2.4GHz control, 30 km/h top speed, and waterproof body.', price: 2199, stock_quantity: 55, category: 'Toys', images: ['https://placehold.co/600x400/7c3aed/ffffff?text=RC+Car'] },
    { id: 'p23', name: 'Cold-Pressed Virgin Coconut Oil', description: 'Unrefined, chemical-free coconut oil. Suitable for cooking, baking, and skin care.', price: 399, stock_quantity: 200, category: 'Grocery', images: ['https://placehold.co/600x400/166534/ffffff?text=Coconut+Oil'] },
    { id: 'p24', name: 'Mixed Nuts & Dry Fruits — 500g', description: 'Premium mix of cashews, almonds, walnuts, raisins and pistachios.', price: 649, stock_quantity: 180, category: 'Grocery', images: ['https://placehold.co/600x400/166534/ffffff?text=Mixed+Nuts'] }
  ],
  billing_addresses: [],
  orders: []
};

module.exports = mockDb;
