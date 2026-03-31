import { create } from 'zustand';

const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const initialToken = localStorage.getItem('token');
const initialUser = initialToken ? decodeJwt(initialToken)?.user : null;

const useAuthStore = create((set) => ({
  user: initialUser, 
  token: initialToken || null,
  isAuthenticated: !!initialToken,
  login: (token, userData) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true, user: userData });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, isAuthenticated: false, user: null });
  }
}));

export default useAuthStore;
