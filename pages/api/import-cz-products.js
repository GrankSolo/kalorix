import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Použij POST' });
  }

  const limit = 200; // Počet produktů k importu
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=${limit}&country=czech-republic&lc=cs`);
  const data = await response.json();

  const products = (data.products || [])
    .filter((item) => item.countries_tags?.includes('en:czech-republic')) // <-- filtrujeme jen CZ
    .map((item) => ({
      name: item.product_name || 'Neznámý produkt',
      brand: item.brands || '',
      kcal: item.nutriments?.['energy-kcal_100g'] ?? null,
      protein: item.nutriments?.proteins_100g ?? null,
      carbs: item.nutriments?.carbohydrates_100g ?? null,
      fat: item.nutriments?.fat_100g ?? null,
      image_url: item.image_front_small_url || '',
      source_code: item.code || ''
    }));

  const { data: inserted, error } = await supabase
    .from('products')
    .insert(products)
    .select();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Nepodařilo se importovat data.' });
  }

  res.status(200).json({ message: 'Import hotov', count: inserted.length });
}