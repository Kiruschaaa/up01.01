import { useState } from 'react'
import ProductCard from './ProductCard'

function App() {
  return (
    <div>
      <h1>Каталог напитков</h1>

      <ProductCard 
        name="Кока-кола" 
        price={150} 
        image="https://avatars.mds.yandex.net/i?id=0e0db6ea9c32e456062615e160a5057c55e344ee-4280934-images-thumbs&n=13" 
      />
      
      <ProductCard 
        name="Спрайт" 
        price={120} 
        image="https://avatars.mds.yandex.net/i?id=f2a2e6f17d8ba0e5b4e1d7ab40d6f0cb9f32aefa-8210080-images-thumbs&n=13" 
      />
      
      <ProductCard 
        name="Маунтидью" 
        price={200} 
        image="https://avatars.mds.yandex.net/i?id=282f2050f3b80c3ea96729af27965e1d92f45eea-10518571-images-thumbs&n=13" 
      />
      
      <ProductCard 
        name="Фанта" 
        price={140} 
        image="https://avatars.mds.yandex.net/i?id=4a30d0e9f7ab58537349f9db9025a567b500e102-5236117-images-thumbs&n=13" 
      />
      
      <ProductCard 
        name="Лимонад Золотой Ключик" 
        price={80} 
        image="https://avatars.mds.yandex.net/i?id=12caf0b0dccdd90526510a8e7cb5248ed9fce398-12481555-images-thumbs&n=13" 
      />
    </div>
  );
}

export default App