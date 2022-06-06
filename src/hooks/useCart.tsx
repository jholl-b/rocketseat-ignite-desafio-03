import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart)
      return JSON.parse(storagedCart);

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get<Product>(`products/${productId}`);

      if (cart.length === 0) {
        setCart([ { ...product.data, amount: 1 } ]);
        return;
      }

      const prodCart = cart.find(p => p.id === productId);
      await updateProductAmount({ productId, amount: prodCart ? prodCart.amount + 1 : 1 });

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);

      if (cart.length === newCart.length)
        throw new Error('Product not found!');

      setCart(newCart);

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) return;

      const stock = await api.get<Stock>(`stock/${productId}`);

      if (stock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      var productToUpdate = updatedCart.find(product => product.id === productId);

      if (!productToUpdate) {
        const product = await api.get<Product>(`products/${productId}`);
        productToUpdate = { ...product.data, amount: amount };
        updatedCart.push(productToUpdate);
      }

      productToUpdate.amount = amount;

      setCart(updatedCart);  
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
