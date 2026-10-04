import { useState } from "react";

function ProductCard(props) {
    const [count, setCount] = useState(0);

    return (
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '8px', 
          padding: '15px', 
          width: '250px', 
          textAlign: 'center',
          margin: '10px'
        }}>
            <img src={props.image} alt={props.name} style={{ width: '100%', height: 'auto' }} />
            <h3>{props.name}</h3>
            <p>Цена: {props.price} руб.</p>
            <p>В корзине: {count}</p>
            <button onClick={() => setCount(count + 1)}>Добавить</button>
            <button onClick={() => setCount(count - 1)}>Убрать</button>
        </div>
    )
}

export default ProductCard