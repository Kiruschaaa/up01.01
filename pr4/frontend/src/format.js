// цена с пробелами: 14500 -> 14 500 ₽
export const money = (n) => `${Number(n).toLocaleString("ru-RU")} ₽`;

// класс цвета для статуса
const STATUS_CLASS = {
  "Ожидает оплаты": "wait",
  "Оплачен": "paid",
  "В работе": "work",
  "Готов к выдаче": "ready",
  "Доставлен": "done",
  "Отменён": "cancel",
};
export const statusClass = (status) => "status " + (STATUS_CLASS[status] || "");
