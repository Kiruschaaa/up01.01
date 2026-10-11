import { useState } from "react";

const EMPTY = { name: "", description: "", warranty_months: "", price: "", category_name: "", image: "" };

// форма товара
function Productform({ product, categories, onSave, onCancel }) {
  const [form, setForm] = useState(product ? {
    name: product.name, description: product.description, warranty_months: product.warranty_months,
    price: product.price, category_name: product.category_name === "Нет категории" ? "" : product.category_name,
    image: product.image || "",
  } : EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim() || !form.category_name)
      return setError("Заполните название, описание и категорию");
    if (!(Number(form.warranty_months) > 0)) return setError("Гарантия должна быть больше 0");
    if (!(Number(form.price) > 0)) return setError("Цена должна быть больше 0");
    const image = form.image.trim();
    if (image && !/^https?:\/\/\S+$/i.test(image)) return setError("Ссылка на фото должна начинаться с http:// или https://");
    try {
      setSaving(true);
      setError(null);
      await onSave({ ...form, image: image || null });
      if (!product) setForm(EMPTY);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h3>{product ? "Изменить товар" : "Новый товар"}</h3>
      <input name="name" placeholder="Название" value={form.name} onChange={handleChange} />
      <textarea name="description" placeholder="Описание" value={form.description} onChange={handleChange} />
      <select name="category_name" value={form.category_name} onChange={handleChange}>
        <option value="">Категория</option>
        {categories.map((c) => <option key={c.category_id}>{c.category_name}</option>)}
      </select>
      <input name="warranty_months" type="number" min="1" placeholder="Гарантия, мес." value={form.warranty_months} onChange={handleChange} />
      <input name="price" type="number" min="1" placeholder="Цена, ₽" value={form.price} onChange={handleChange} />
      <input name="image" type="url" placeholder="Ссылка на фото (необязательно)" value={form.image} onChange={handleChange} />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={saving}>{saving ? "Сохранение..." : product ? "Сохранить" : "Добавить"}</button>
        {product && <button type="button" className="btn outline" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}

export default Productform;
