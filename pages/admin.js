// importy zůstanou stejné
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  const perPage = 20;
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', image_url: '' });
  const [editStates, setEditStates] = useState({});

  const loadProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').eq('hidden', false).order('name');
    if (!error) {
      setProducts(data);
      setFiltered(data);
    }
  };

  const handleHide = async (id) => {
    await supabase.from('products').update({ hidden: true }).eq('id', id);
    loadProducts();
  };

  const handleSearch = (term) => {
    setSearch(term);
    const lower = term.toLowerCase();
    setFiltered(products.filter(p => p.name.toLowerCase().includes(lower)));
    setPage(1);
  };

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginated = filtered.slice(start, end);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleEditChange = (id, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        changed: true
      }
    }));
  };

 const handleEditSave = async (id) => {
  const update = editStates[id];
  if (!update) return;

  const original = products.find(p => p.id === id);
  const fullUpdate = {
    name: update.name ?? original.name,
    brand: update.brand ?? original.brand,
    kcal: update.kcal !== undefined ? update.kcal : original.kcal,
    protein: update.protein !== undefined ? update.protein : original.protein,
    carbs: update.carbs !== undefined ? update.carbs : original.carbs,
    fat: update.fat !== undefined ? update.fat : original.fat,
    image_url: update.image_url ?? original.image_url
  };

  await supabase.from('products').update(fullUpdate).eq('id', id);
  setEditStates(prev => ({ ...prev, [id]: {} }));
  loadProducts();
};

  const handleEditCancel = (id) => {
    setEditStates(prev => ({ ...prev, [id]: {} }));
  };

  const handleAdd = async () => {
    if (!newProduct.name) return;
    await supabase.from('products').insert({ ...newProduct, hidden: false });
    setNewProduct({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', image_url: '' });
    setShowAddModal(false);
    loadProducts();
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;

    const source = products.find(p => p.id == mergeSourceId);
    const target = products.find(p => p.id == mergeTargetId);
    if (!source || !target) return;

    const merged = {
      name: target.name || source.name,
      brand: target.brand || source.brand,
      kcal: target.kcal || source.kcal,
      protein: target.protein || source.protein,
      carbs: target.carbs || source.carbs,
      fat: target.fat || source.fat,
      image_url: target.image_url || source.image_url,
      ean: Array.from(new Set([
        ...(Array.isArray(target.ean) ? target.ean : [target.ean]),
        ...(Array.isArray(source.ean) ? source.ean : [source.ean])
      ].filter(Boolean)))
    };

    await supabase.from('products').update(merged).eq('id', target.id);
    await supabase.from('products').delete().eq('id', source.id);
    setMergeSourceId('');
    setMergeTargetId('');
    loadProducts();
  };

  const handleAutoMerge = async () => {
    setLoading(true);
    const { data: allProducts, error } = await supabase.from('products').select('*');
    if (error) return;

    const grouped = allProducts.reduce((acc, p) => {
      if (!p.name) return acc;
      acc[p.name] = acc[p.name] || [];
      acc[p.name].push(p);
      return acc;
    }, {});

    for (const name in grouped) {
      const group = grouped[name];
      if (group.length <= 1) continue;

      const sorted = [...group].sort((a, b) => {
        const aFilled = [a.kcal, a.protein, a.carbs, a.fat].filter(Boolean).length;
        const bFilled = [b.kcal, b.protein, b.carbs, b.fat].filter(Boolean).length;
        if (aFilled !== bFilled) return bFilled - aFilled;
        return (b.ean?.join('').length || 0) - (a.ean?.join('').length || 0);
      });

      const target = sorted[0];
      const toMerge = sorted.slice(1);
      const allEans = Array.from(new Set(sorted.flatMap(p => p.ean || [])));

      const merged = {
        name: target.name,
        brand: target.brand || '',
        image_url: target.image_url || '',
        kcal: target.kcal,
        protein: target.protein,
        carbs: target.carbs,
        fat: target.fat,
        ean: allEans,
        hidden: false
      };

      await supabase.from('products').update(merged).eq('id', target.id);
      const idsToDelete = toMerge.map(p => p.id);
      if (idsToDelete.length > 0) {
        await supabase.from('products').delete().in('id', idsToDelete);
      }
    }

    await loadProducts();
    setLoading(false);
    setMessage('✅ Automatické sjednocení dokončeno');
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div style={styles.page}>
      <h1>🛠 Admin rozhraní</h1>

      <section style={styles.sectionBox}>
        <input
          type="text"
          placeholder="🔍 Hledat podle názvu"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button style={styles.button} onClick={() => setShowAddModal(true)}>➕ Nový produkt</button>
      </section>

      <section style={styles.sectionBox}>
        <h3>🔀 Sjednotit produkty</h3>
        <input placeholder="ID zdroje" value={mergeSourceId} onChange={(e) => setMergeSourceId(e.target.value)} style={styles.input} />
        <input placeholder="ID cíle" value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} style={styles.input} />
        <button onClick={handleMerge} style={styles.button}>Sjednotit</button>
        <button onClick={handleAutoMerge} style={{ ...styles.button, marginLeft: '1rem' }}>🤖 Automaticky sjednotit vše</button>
      </section>

      <section style={styles.sectionBox}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Obrázek</th>
              <th>Název</th>
              <th>Značka</th>
              <th>kcal</th>
              <th>Bílkoviny</th>
              <th>Sacharidy</th>
              <th>Tuky</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.image_url ? <img src={p.image_url} alt='' style={styles.image} /> : '-'}</td>
                {['name', 'brand', 'kcal', 'protein', 'carbs', 'fat'].map(f => (
                  <td key={f}>
                    <input
                      type={['kcal', 'protein', 'carbs', 'fat'].includes(f) ? 'number' : 'text'}
                      defaultValue={p[f]}
                      onChange={(e) => handleEditChange(p.id, f, e.target.value)}
                      style={styles.inputCell}
                    />
                  </td>
                ))}
                <td>
                  {<>
                  <button onClick={() => handleEditSave(p.id)} style={styles.saveButton}>💾</button>
                  <button onClick={() => handleEditCancel(p.id)} style={styles.cancelButton}>✖</button>
                </>}
                  <button onClick={() => handleHide(p.id)} style={styles.deleteButton}>🙈 Skrýt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={styles.pagination}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            style={{
              ...styles.pageButton,
              backgroundColor: page === i + 1 ? '#2b71bf' : '#ddd',
              color: page === i + 1 ? 'white' : 'black'
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ color: 'black' }}>Přidat nový produkt</h2>
            {['name', 'brand', 'kcal', 'protein', 'carbs', 'fat', 'image_url'].map((f) => (
              <input
                key={f}
                placeholder={f}
                value={newProduct[f]}
                onChange={(e) => setNewProduct({ ...newProduct, [f]: e.target.value })}
                style={styles.input}
              />
            ))}
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleAdd} style={styles.button}>💾 Uložit</button>
              <button onClick={() => setShowAddModal(false)} style={styles.cancelButton}>Zrušit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const styles = {
  page: { mmargin: '2rem auto', fontFamily: 'sans-serif', padding: '1rem', background: '#fff', color: '#000' },
  sectionBox: { background: '#f8f8f8', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#000' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#fff', color: '#000' },
  input: { padding: '0.5rem', fontSize: '1rem', minWidth: '100px', margin: '0.25rem', color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' },
  inputCell: { width: '100%', padding: '0.25rem', fontSize: '0.9rem', color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' },
  button: { padding: '0.5rem 1rem', backgroundColor: '#2b71bf', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteButton: { backgroundColor: '#c00', color: 'white', padding: '0.3rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '0.25rem' },
  saveButton: { backgroundColor: '#0a0', color: 'white', padding: '0.3rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.25rem' },
  cancelButton: { backgroundColor: '#999', color: 'white', padding: '0.3rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.25rem' },
  image: { maxWidth: '60px', borderRadius: '4px' },
  searchInput: { padding: '0.5rem', fontSize: '1rem', marginBottom: '1rem', width: '100%', maxWidth: '300px', color: '#000', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' },
  pagination: { marginTop: '1rem', display: 'flex', gap: '0.5rem' },
  pageButton: { padding: '0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'white', color: 'black', padding: '2rem', borderRadius: '8px', minWidth: '300px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }
};