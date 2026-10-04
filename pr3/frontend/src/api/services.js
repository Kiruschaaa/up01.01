const BASE_URL = 'http://localhost:3001/api'; 

export async function getServices() {
  const res = await fetch(BASE_URL + '/Services');
  if (!res.ok) throw new Error('Ошибка при загрузке услуг');
  return await res.json();
}

export async function getCategories() {
  const res = await fetch(BASE_URL + '/Categories');
  if (!res.ok) throw new Error('Ошибка при загрузке категорий');
  return await res.json();
}

export async function createCategory(name) {
  const res = await fetch(BASE_URL + '/Categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Не удалось добавить категорию');
  return await res.json();
}

export async function setServiceDiscount(serviceId, discount) {
  const res = await fetch(BASE_URL + '/Services/' + serviceId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discount: Number(discount) })
  });
  if (!res.ok) throw new Error('Не удалось обновить скидку услуги');
}

export async function getUsers() {
  const res = await fetch(BASE_URL + '/Users');
  if (!res.ok) throw new Error('Ошибка при загрузке пользователей');
  return await res.json();
}

export async function setUserDiscount(userId, discount) {
  const res = await fetch(BASE_URL + '/Users/' + userId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discount: Number(discount) })
  });
  if (!res.ok) throw new Error('Не удалось обновить скидку пользователя');
}

// === НОВЫЕ ФУНКЦИИ ДЛЯ КУПОНОВ ===
export async function getCoupons() {
  const res = await fetch(BASE_URL + '/Coupons');
  if (!res.ok) throw new Error('Ошибка при загрузке купонов');
  return await res.json();
}

export async function createCoupon(code, discount) {
  const res = await fetch(BASE_URL + '/Coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, discount: Number(discount) })
  });
  if (!res.ok) throw new Error('Не удалось создать купон');
  return await res.json();
}

export async function deleteCoupon(id) {
  const res = await fetch(BASE_URL + '/Coupons/' + id, { method: 'DELETE' });
  if (!res.ok) throw new Error('Не удалось удалить купон');
  return await res.json();
}