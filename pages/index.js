import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function App() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('potraviny');
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

 const storeProducts = async (products) => {
  for (const p of products) {
    const ean = p.code;
    if (!ean) continue;

    const { data, error } = await supabase
      .from('products')
      .select('id')
      .filter('ean', 'cs', `{${ean}}`)
      .maybeSingle();

    if (!data && !error) {
      const nutr = p.nutriments ?? {};
      await supabase.from('products').insert({
        ean: [ean],
        name: p.product_name ?? '',
        brand: p.brands ?? '',
        image_url: p.image_front_small_url ?? '',
        kcal: nutr['energy-kcal_100g'] ?? null,
        protein: nutr.proteins_100g ?? null,
        carbs: nutr.carbohydrates_100g ?? null,
        fat: nutr.fat_100g ?? null,
        hidden: false
      });
    }
  }
};

  const fetchFoods = async (query = 'banán') => {
    setLoading(true);
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=50&country=czech-republic&lc=cs`);
    const data = await res.json();
    const rawProducts = data.products || [];

    const seen = new Set();
    const uniqueProducts = rawProducts.filter((product) => {
      const kcal = product.nutriments?.['energy-kcal_100g'] ?? 'N/A';
      const prot = product.nutriments?.proteins_100g ?? 'N/A';
      const carb = product.nutriments?.carbohydrates_100g ?? 'N/A';
      const fat = product.nutriments?.fat_100g ?? 'N/A';
      const key = `${kcal}-${prot}-${carb}-${fat}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setFoods(uniqueProducts);
    storeProducts(uniqueProducts);
    setLoading(false);
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const handleSearch = () => {
    if (search.trim() !== '') {
      fetchFoods(search);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.containerHeader}>
          <img src="https://cdn-icons-png.flaticon.com/512/3075/3075977.png" alt="logo" style={styles.logo} />
          <h1 style={styles.logoText}>Kalorix.cz</h1>
        </div>
      </header>

      <main style={styles.container}>
        <input
          type="text"
          placeholder="Hledej potraviny a recepty …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={styles.searchInput}
        />

        <div style={styles.tabContainer}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'potraviny' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('potraviny')}
          >🍽️ Potraviny</button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'recepty' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('recepty')}
          >📖 Recepty</button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'aktivity' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('aktivity')}
          >🏃 Aktivity</button>
        </div>

        <h2 style={{ marginTop: '2rem' }}>{search ? 'Výsledky hledání' : 'Populární potraviny'}</h2>
        {loading && <p>🔄 Načítání…</p>}

        <div style={styles.foodGrid}>
          {foods.map((food, i) => (
            <div key={i} style={styles.card}>
              {food.image_front_small_url && (
                <img src={food.image_front_small_url} alt={food.product_name} style={styles.foodImage} />
              )}
              <h3>{food.product_name || 'Neznámý produkt'}</h3>
              <p><strong>{food.nutriments?.['energy-kcal_100g'] ?? 'N/A'} kcal</strong> · 100 g</p>
              <p><span style={styles.protein}>Bílkoviny</span> {food.nutriments?.proteins_100g ?? 'N/A'} g</p>
              <p><span style={styles.carbs}>Sacharidy</span> {food.nutriments?.carbohydrates_100g ?? 'N/A'} g</p>
              <p><span style={styles.fat}>Tuky</span> {food.nutriments?.fat_100g ?? 'N/A'} g</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} Kalorix.cz – Všechna práva vyhrazena.</p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    backgroundColor: '#f4f4f4',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#000', // přidáno – výchozí barva textu
  },
  container: {
    maxWidth: '1050px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  containerHeader: {
    maxWidth: '1050px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1rem',
    gap: '1rem'
  },
  header: {
    backgroundColor: '#2b71bf',
    color: '#000', // změněno z #fff na černou
  },
  logo: {
    width: '40px',
    height: '40px'
  },
  logoText: {
    fontSize: '1.8rem',
    margin: 0,
    color: '#000' // přidáno
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginBottom: '1rem',
    color: '#000' // přidáno
  },
  tabContainer: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '2rem'
  },
  tab: {
    padding: '0.5rem 1.2rem',
    borderRadius: '999px',
    border: '1px solid #ccc',
    backgroundColor: '#eee',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: '#000' // přidáno
  },
  activeTab: {
    backgroundColor: '#2b71bf',
    color: '#000', // změněno z #fff na černou
    borderColor: '#2b71bf'
  },
  foodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '1rem',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    color: '#000' // přidáno
  },
  foodImage: {
    width: '100%',
    maxHeight: '100px',
    objectFit: 'contain',
    marginBottom: '0.5rem'
  },
  protein: { color: 'crimson' },
  carbs: { color: 'dodgerblue' },
  fat: { color: 'orange' },
  footer: {
    backgroundColor: '#eee',
    textAlign: 'center',
    padding: '1rem 0',
    marginTop: 'auto',
    color: '#000' // přidáno
  }
};
